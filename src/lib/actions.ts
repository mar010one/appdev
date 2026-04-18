'use server';

import { supabase } from './db';
import { revalidatePath } from 'next/cache';

export type ActionResponse<T = any> = {
  success?: boolean;
  error?: string;
  data?: T;
};

// ── File helpers ──────────────────────────────────────────────────────────────

// 100 MB — update this if your Supabase bucket limit is different
const STORAGE_MAX_BYTES = 100 * 1024 * 1024;

/** Upload a file to Supabase Storage and return its public URL.
 *  If `file` is already a URL string (uploaded from the browser to bypass
 *  Vercel's 4.5 MB request-body cap), pass it through unchanged. */
async function saveUploadedFile(
  file: any,
  bucket: string,
  prefix = '',
): Promise<string> {
  if (typeof file === 'string') return file.trim();
  if (!file || !file.size || typeof file.arrayBuffer !== 'function') return '';

  if (file.size > STORAGE_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    const limitMb = (STORAGE_MAX_BYTES / 1024 / 1024).toFixed(0);
    throw new Error(
      `"${file.name}" is ${mb} MB — exceeds the ${limitMb} MB storage limit. ` +
      `Compress the file or raise the bucket file-size limit in your Supabase dashboard (Storage → Buckets → uploads → Edit).`,
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${Date.now()}-${prefix}${safeName}`;
  const storagePath = `${bucket}/${filename}`;

  const { error } = await supabase.storage
    .from('uploads')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    const msg = error.message || String(error);
    if (msg.toLowerCase().includes('size') || msg.toLowerCase().includes('exceeded')) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(
        `Storage upload failed: "${file.name}" (${mb} MB) exceeds your Supabase bucket size limit. ` +
        `Go to Storage → Buckets → uploads → Edit in the Supabase dashboard and increase the file size limit.`,
      );
    }
    throw new Error(`Storage upload failed: ${msg}`);
  }

  const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Extract the storage path from a Supabase public URL or legacy local path. */
function getStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = '/object/public/uploads/';
  const idx = publicUrl.indexOf(marker);
  if (idx !== -1) return publicUrl.slice(idx + marker.length);
  if (publicUrl.startsWith('/uploads/')) return publicUrl.slice('/uploads/'.length);
  return null;
}

/** Best-effort delete a file from Supabase Storage. */
async function deleteFile(url?: string | null) {
  if (!url) return;
  const path = getStoragePath(url);
  if (path) {
    try {
      await supabase.storage.from('uploads').remove([path]);
    } catch {}
  }
}

/** Resolve a File-or-URL entry's display name, falling back to a paired
 *  `<fieldName>__filename` entry (added by the browser upload helper). */
function resolveFileName(entry: any, pairedName: string, fallback: string): string {
  if (entry && typeof entry !== 'string' && entry.name) return entry.name;
  if (pairedName) return pairedName;
  if (typeof entry === 'string' && entry) {
    const tail = entry.split('?')[0].split('/').pop();
    if (tail) return tail;
  }
  return fallback;
}

/** Upload multiple files from a single FormData field into a storage bucket. */
async function saveMultiDocs(
  formData: FormData,
  fieldName: string,
  companyId: number,
  docType: string,
  prefix: string,
) {
  const entries = formData.getAll(fieldName) as any[];
  const pairedNames = formData.getAll(`${fieldName}__filename`) as string[];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    if (typeof entry === 'string') {
      if (!entry.trim()) continue;
      await supabase.from('company_documents').insert({
        company_id: companyId,
        file_path: entry,
        file_name: resolveFileName(entry, pairedNames[i] || '', fieldName),
        doc_type: docType,
      });
      continue;
    }
    if (!entry.size) continue;
    const filePath = await saveUploadedFile(entry, 'companies', prefix);
    if (filePath) {
      await supabase.from('company_documents').insert({
        company_id: companyId,
        file_path: filePath,
        file_name: entry.name || fieldName,
        doc_type: docType,
      });
    }
  }
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccounts() {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*, account_documents(*), apps(id)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getAccounts: ${error.message} (code: ${error.code})`);


  return (accounts || []).map((acc: any) => ({
    ...acc,
    documents: acc.account_documents || [],
    app_count: (acc.apps || []).length,
    account_documents: undefined,
    apps: undefined,
  }));
}

export async function getAccountById(id: number) {
  const { data: account, error } = await supabase
    .from('accounts')
    .select('*, account_documents(*)')
    .eq('id', id)
    .single();

  if (error || !account) return null;

  const { data: linkedCompanies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('linked_account_id', id)
    .order('name', { ascending: true });

  return {
    ...account,
    documents: account.account_documents || [],
    linkedCompanies: linkedCompanies || [],
    account_documents: undefined,
  };
}

export async function addAccount(formData: FormData): Promise<ActionResponse> {
  try {
    const type = formData.get('type')?.toString() || 'google_play';
    const developerName = formData.get('developerName')?.toString() || '';
    const developerId = formData.get('developerId')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const website = formData.get('website')?.toString() || '';
    const phone = formData.get('phone')?.toString() || '';
    const companyName = formData.get('companyName')?.toString() || '';
    const devPassword = formData.get('devPassword')?.toString() || '';
    const dev2faSecret = formData.get('dev2faSecret')?.toString() || '';
    const devSecurityNotes = formData.get('devSecurityNotes')?.toString() || '';
    const vccNumber = formData.get('vccNumber')?.toString() || '';
    const vccHolder = formData.get('vccHolder')?.toString() || '';
    const vccExpiry = formData.get('vccExpiry')?.toString() || '';
    const vccCvv = formData.get('vccCvv')?.toString() || '';
    const vccNotes = formData.get('vccNotes')?.toString() || '';
    const documents = formData.getAll('documents');
    const documentNames = formData.getAll('documents__filename') as string[];

    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        type,
        developer_name: developerName,
        developer_id: developerId,
        email,
        website,
        phone,
        company_name: companyName,
        dev_password: devPassword,
        dev_2fa_secret: dev2faSecret,
        dev_security_notes: devSecurityNotes,
        vcc_number: vccNumber,
        vcc_holder: vccHolder,
        vcc_expiry: vccExpiry,
        vcc_cvv: vccCvv,
        vcc_notes: vccNotes,
      })
      .select('id')
      .single();

    if (error) throw error;
    const accountId = account.id;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i] as any;
      if (!doc) continue;
      if (typeof doc === 'string') {
        if (!doc.trim()) continue;
        await supabase.from('account_documents').insert({
          account_id: accountId,
          file_path: doc,
          file_name: resolveFileName(doc, documentNames[i] || '', 'document'),
        });
        continue;
      }
      if (!doc.size) continue;
      const filePath = await saveUploadedFile(doc, 'documents');
      if (filePath) {
        await supabase.from('account_documents').insert({
          account_id: accountId,
          file_path: filePath,
          file_name: doc.name,
        });
      }
    }

    revalidatePath('/accounts');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error in addAccount:', error);
    return { error: (error as Error).message };
  }
}

// ── Listing snapshots ─────────────────────────────────────────────────────────

async function snapshotListing(appId: number, releaseFilePath?: string) {
  const { data: app } = await supabase
    .from('apps')
    .select('*')
    .eq('id', appId)
    .single();
  if (!app) return;

  const { data: shots } = await supabase
    .from('app_screenshots')
    .select('file_path')
    .eq('app_id', appId)
    .order('id', { ascending: true });

  const { count: existingCount } = await supabase
    .from('listing_versions')
    .select('*', { count: 'exact', head: true })
    .eq('app_id', appId);

  const label = `v${(existingCount || 0) + 1}`;

  await supabase.from('listing_versions').insert({
    app_id: appId,
    version_label: label,
    name: app.name,
    short_description: app.short_description,
    long_description: app.long_description,
    icon_small_path: app.icon_small_path,
    icon_large_path: app.icon_large_path,
    store_url: app.store_url,
    contact_email: app.contact_email,
    privacy_url: app.privacy_url,
    website_url: app.website_url,
    screenshots_json: JSON.stringify((shots || []).map((s: any) => s.file_path)),
    release_file_path: releaseFilePath || null,
  });
}

export async function getListingVersions(appId: number) {
  const { count } = await supabase
    .from('listing_versions')
    .select('*', { count: 'exact', head: true })
    .eq('app_id', appId);

  if ((count || 0) === 0) {
    const { data: appExists } = await supabase
      .from('apps')
      .select('id')
      .eq('id', appId)
      .single();
    if (appExists) await snapshotListing(appId);
  }

  const { data: rows } = await supabase
    .from('listing_versions')
    .select('*')
    .eq('app_id', appId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  return (rows || []).map((r: any) => ({
    ...r,
    release_file_path: r.release_file_path || null,
    screenshots: (() => {
      try {
        const arr = r.screenshots_json ? JSON.parse(r.screenshots_json) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    })(),
  }));
}

// ── Apps ──────────────────────────────────────────────────────────────────────

export async function getApps(accountId?: number) {
  let query = supabase
    .from('apps')
    .select(
      '*, accounts(email, developer_name, developer_id), app_screenshots(*), versions(version_number, release_date)',
    )
    .order('created_at', { ascending: false });

  if (accountId) query = query.eq('account_id', accountId);

  const { data: apps, error } = await query;
  if (error) throw error;

  return (apps || []).map((app: any) => {
    const latestVersion = (app.versions || []).sort(
      (a: any, b: any) =>
        new Date(b.release_date).getTime() - new Date(a.release_date).getTime(),
    )[0];
    return {
      ...app,
      account_email: app.accounts?.email,
      account_developer_name: app.accounts?.developer_name,
      account_developer_id: app.accounts?.developer_id,
      latest_version: latestVersion?.version_number || null,
      screenshots: app.app_screenshots || [],
      accounts: undefined,
      app_screenshots: undefined,
      versions: undefined,
    };
  });
}

export async function addApp(
  formData: FormData,
): Promise<ActionResponse<{ id: number }>> {
  try {
    const accountId = formData.get('accountId');
    const name = formData.get('name') as string;
    const short_description = formData.get('shortDescription') as string;
    const long_description = formData.get('longDescription') as string;
    const store_url = formData.get('storeUrl') as string;
    const contact_email = (formData.get('contactEmail') as string) || '';
    const privacy_url = (formData.get('privacyUrl') as string) || '';
    const website_url = (formData.get('websiteUrl') as string) || '';

    const iconSmallPath = await saveUploadedFile(formData.get('iconSmall'), 'icons', 'small-');
    const iconLargePath = await saveUploadedFile(formData.get('iconLarge'), 'icons', 'large-');
    const aabExternalLink = (formData.get('aabExternalLink') as string) || '';
    const aabPath = aabExternalLink
      ? aabExternalLink
      : await saveUploadedFile(formData.get('aabFile'), 'apps');

    const { data: app, error } = await supabase
      .from('apps')
      .insert({
        account_id: accountId,
        name,
        short_description,
        long_description,
        icon_small_path: iconSmallPath,
        icon_large_path: iconLargePath,
        store_url,
        contact_email,
        privacy_url,
        website_url,
      })
      .select('id')
      .single();

    if (error) throw error;
    const appId = app.id;

    for (let i = 0; i < 8; i++) {
      const screenshotPath = await saveUploadedFile(
        formData.get(`screenshot_${i}`),
        'screenshots',
        `shot-${i}-`,
      );
      if (screenshotPath) {
        await supabase.from('app_screenshots').insert({ app_id: appId, file_path: screenshotPath });
      }
    }

    await snapshotListing(appId, aabPath || undefined);

    revalidatePath('/apps');
    revalidatePath('/');
    return { success: true, data: { id: appId } };
  } catch (error) {
    console.error('Error in addApp:', error);
    return { error: (error as Error).message };
  }
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function getVersions(appId: number) {
  const { data: versions, error } = await supabase
    .from('versions')
    .select('*, version_screenshots(*)')
    .eq('app_id', appId)
    .order('release_date', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw error;

  return (versions || []).map((v: any) => ({
    ...v,
    screenshots: v.version_screenshots || [],
    version_screenshots: undefined,
  }));
}

export async function addVersion(
  formData: FormData,
): Promise<ActionResponse<{ id: number }>> {
  try {
    const appId = Number(formData.get('appId'));
    const versionNumber = (formData.get('versionNumber') as string)?.trim();
    const changelog = (formData.get('changelog') as string) || '';
    const updateAppAssets = (formData.get('updateAppAssets') as string) !== '0';

    if (!appId) return { error: 'Missing appId.' };
    if (!versionNumber) return { error: 'Version number is required.' };

    const fileExternalLink = (formData.get('fileExternalLink') as string) || '';
    const filePath = fileExternalLink
      ? fileExternalLink
      : await saveUploadedFile(formData.get('file'), 'apps');
    const iconPath = await saveUploadedFile(formData.get('iconSmall'), 'icons', 'v-small-');
    const promoPath = await saveUploadedFile(formData.get('iconLarge'), 'icons', 'v-large-');

    const { data: version, error } = await supabase
      .from('versions')
      .insert({
        app_id: appId,
        version_number: versionNumber,
        changelog,
        file_path: filePath,
        icon_path: iconPath,
        promo_path: promoPath,
      })
      .select('id')
      .single();

    if (error) throw error;
    const versionId = version.id;

    const versionScreenshots: string[] = [];
    for (let i = 0; i < 8; i++) {
      const path = await saveUploadedFile(formData.get(`screenshot_${i}`), 'screenshots', 'v-');
      if (path) {
        await supabase.from('version_screenshots').insert({ version_id: versionId, file_path: path });
        versionScreenshots.push(path);
      }
    }

    if (updateAppAssets) {
      const updates: Record<string, string> = {};
      if (iconPath) updates.icon_small_path = iconPath;
      if (promoPath) updates.icon_large_path = promoPath;
      if (Object.keys(updates).length) {
        await supabase.from('apps').update(updates).eq('id', appId);
      }
      if (versionScreenshots.length) {
        const { data: oldShots } = await supabase
          .from('app_screenshots')
          .select('file_path')
          .eq('app_id', appId);
        for (const s of oldShots || []) await deleteFile(s.file_path);
        await supabase.from('app_screenshots').delete().eq('app_id', appId);
        for (const p of versionScreenshots) {
          await supabase.from('app_screenshots').insert({ app_id: appId, file_path: p });
        }
      }
    }

    await snapshotListing(appId, filePath || undefined);

    revalidatePath(`/apps/${appId}`);
    revalidatePath(`/apps/${appId}/info`);
    revalidatePath(`/share/${appId}`);
    revalidatePath('/versions');
    revalidatePath('/apps');
    return { success: true, data: { id: versionId } };
  } catch (error) {
    console.error('Error in addVersion:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteVersion(versionId: number): Promise<ActionResponse> {
  try {
    const { data: v } = await supabase
      .from('versions')
      .select('app_id, file_path, icon_path, promo_path')
      .eq('id', versionId)
      .single();

    if (!v) return { error: 'Version not found.' };

    const { data: screenshots } = await supabase
      .from('version_screenshots')
      .select('file_path')
      .eq('version_id', versionId);

    await deleteFile(v.file_path);
    await deleteFile(v.icon_path);
    await deleteFile(v.promo_path);
    for (const s of screenshots || []) await deleteFile(s.file_path);

    await supabase.from('versions').delete().eq('id', versionId);

    revalidatePath(`/apps/${v.app_id}`);
    revalidatePath(`/apps/${v.app_id}/info`);
    revalidatePath(`/share/${v.app_id}`);
    revalidatePath('/versions');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteVersion:', error);
    return { error: (error as Error).message };
  }
}

// ── App details ────────────────────────────────────────────────────────────────

export async function getAppById(id: number) {
  const { data: app, error } = await supabase
    .from('apps')
    .select('*, accounts(email, type, developer_name, developer_id, website, phone), app_screenshots(*)')
    .eq('id', id)
    .single();

  if (error || !app) return null;

  return {
    ...app,
    account_email: app.accounts?.email,
    account_type: app.accounts?.type,
    account_developer_name: app.accounts?.developer_name,
    account_developer_id: app.accounts?.developer_id,
    account_website: app.accounts?.website,
    account_phone: app.accounts?.phone,
    screenshots: app.app_screenshots || [],
    accounts: undefined,
    app_screenshots: undefined,
  };
}

// ── Stats ──────────────────────────────────────────────────────────────────────

export async function getStats() {
  const [
    { count: accountCount },
    { count: appCount },
    { count: versionCount },
  ] = await Promise.all([
    supabase.from('accounts').select('*', { count: 'exact', head: true }),
    supabase.from('apps').select('*', { count: 'exact', head: true }),
    supabase.from('versions').select('*', { count: 'exact', head: true }),
  ]);

  return {
    accounts: accountCount || 0,
    apps: appCount || 0,
    versions: versionCount || 0,
  };
}

export async function deleteAccount(id: number) {
  try {
    const { data: docs } = await supabase
      .from('account_documents')
      .select('file_path')
      .eq('account_id', id);
    for (const doc of docs || []) await deleteFile(doc.file_path);

    await supabase.from('accounts').delete().eq('id', id);
    revalidatePath('/accounts');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteAccount:', error);
    return { error: (error as Error).message };
  }
}

export async function updateAccountStatus(id: number, status: string) {
  try {
    await supabase.from('accounts').update({ status }).eq('id', id);
    if (status === 'closed') {
      await supabase.from('apps').update({ status: 'closed' }).eq('account_id', id);
    }
    revalidatePath('/accounts');
    revalidatePath('/apps');
    return { success: true };
  } catch (error) {
    console.error('Error in updateAccountStatus:', error);
    return { error: (error as Error).message };
  }
}

export async function updateAccount(id: number, formData: FormData) {
  try {
    const developerName = formData.get('developerName')?.toString() || '';
    const developerId = formData.get('developerId')?.toString() || '';
    const email = formData.get('email')?.toString() || '';
    const website = formData.get('website')?.toString() || '';
    const phone = formData.get('phone')?.toString() || '';
    const status = formData.get('status')?.toString() || 'active';
    const companyName = formData.get('companyName')?.toString() || '';
    const devPassword = formData.get('devPassword')?.toString() || '';
    const dev2faSecret = formData.get('dev2faSecret')?.toString() || '';
    const devSecurityNotes = formData.get('devSecurityNotes')?.toString() || '';
    const vccNumber = formData.get('vccNumber')?.toString() || '';
    const vccHolder = formData.get('vccHolder')?.toString() || '';
    const vccExpiry = formData.get('vccExpiry')?.toString() || '';
    const vccCvv = formData.get('vccCvv')?.toString() || '';
    const vccNotes = formData.get('vccNotes')?.toString() || '';

    await supabase
      .from('accounts')
      .update({
        developer_name: developerName,
        developer_id: developerId,
        email,
        website,
        phone,
        status,
        company_name: companyName,
        dev_password: devPassword,
        dev_2fa_secret: dev2faSecret,
        dev_security_notes: devSecurityNotes,
        vcc_number: vccNumber,
        vcc_holder: vccHolder,
        vcc_expiry: vccExpiry,
        vcc_cvv: vccCvv,
        vcc_notes: vccNotes,
      })
      .eq('id', id);

    if (status === 'closed') {
      await supabase.from('apps').update({ status: 'closed' }).eq('account_id', id);
    }

    const newDocs = formData.getAll('newDocuments');
    const newDocNames = formData.getAll('newDocuments__filename') as string[];
    for (let i = 0; i < newDocs.length; i++) {
      const doc = newDocs[i] as any;
      if (!doc) continue;
      if (typeof doc === 'string') {
        if (!doc.trim()) continue;
        await supabase.from('account_documents').insert({
          account_id: id,
          file_path: doc,
          file_name: resolveFileName(doc, newDocNames[i] || '', 'document'),
        });
        continue;
      }
      if (!doc.size) continue;
      const filePath = await saveUploadedFile(doc, 'documents');
      if (filePath) {
        await supabase.from('account_documents').insert({
          account_id: id,
          file_path: filePath,
          file_name: doc.name,
        });
      }
    }

    revalidatePath('/accounts');
    revalidatePath(`/accounts/${id}`);
    const { data: documents } = await supabase
      .from('account_documents')
      .select('*')
      .eq('account_id', id)
      .order('created_at', { ascending: true });
    return { success: true, data: { documents: documents || [] } };
  } catch (error) {
    console.error('Error in updateAccount:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteAccountDocument(docId: number): Promise<ActionResponse> {
  try {
    const { data: doc } = await supabase
      .from('account_documents')
      .select('file_path')
      .eq('id', docId)
      .single();
    await deleteFile(doc?.file_path);
    await supabase.from('account_documents').delete().eq('id', docId);
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteAccountDocument:', error);
    return { error: (error as Error).message };
  }
}

// ── App management ────────────────────────────────────────────────────────────

export async function deleteApp(id: number) {
  try {
    const { data: app } = await supabase
      .from('apps')
      .select('icon_small_path, icon_large_path')
      .eq('id', id)
      .single();

    if (app) {
      await deleteFile(app.icon_small_path);
      await deleteFile(app.icon_large_path);
      const { data: screenshots } = await supabase
        .from('app_screenshots')
        .select('file_path')
        .eq('app_id', id);
      for (const s of screenshots || []) await deleteFile(s.file_path);
    }

    await supabase.from('apps').delete().eq('id', id);
    revalidatePath('/apps');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteApp:', error);
    return { error: (error as Error).message };
  }
}

export async function updateApp(id: number, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const short_description = formData.get('shortDescription') as string;
    const long_description = formData.get('longDescription') as string;
    const store_url = formData.get('storeUrl') as string;
    const contact_email = (formData.get('contactEmail') as string) || '';
    const privacy_url = (formData.get('privacyUrl') as string) || '';
    const website_url = (formData.get('websiteUrl') as string) || '';

    const updates: Record<string, any> = {
      name, short_description, long_description,
      store_url, contact_email, privacy_url, website_url,
    };

    const iconSmallPath = await saveUploadedFile(formData.get('iconSmall'), 'icons', 'small-');
    if (iconSmallPath) updates.icon_small_path = iconSmallPath;

    const iconLargePath = await saveUploadedFile(formData.get('iconLarge'), 'icons', 'large-');
    if (iconLargePath) updates.icon_large_path = iconLargePath;

    await supabase.from('apps').update(updates).eq('id', id);

    for (let i = 0; i < 8; i++) {
      const screenshotPath = await saveUploadedFile(
        formData.get(`screenshot_${i}`), 'screenshots', `shot-${i}-`,
      );
      if (screenshotPath) {
        await supabase.from('app_screenshots').insert({ app_id: id, file_path: screenshotPath });
      }
    }

    await snapshotListing(id);

    revalidatePath('/apps');
    revalidatePath(`/apps/${id}`);
    revalidatePath(`/apps/${id}/info`);
    revalidatePath(`/share/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error in updateApp:', error);
    return { error: (error as Error).message };
  }
}

export type AppStatus =
  | 'draft'
  | 'pending_review'
  | 'live'
  | 'removed'
  | 'rejected'
  | 'suspended'
  | 'closed';

const VALID_APP_STATUSES: AppStatus[] = [
  'draft', 'pending_review', 'live', 'removed', 'rejected', 'suspended', 'closed',
];

export async function updateAppStatus(id: number, status: string): Promise<ActionResponse> {
  try {
    if (!VALID_APP_STATUSES.includes(status as AppStatus)) {
      return { error: `Invalid status. Allowed: ${VALID_APP_STATUSES.join(', ')}` };
    }
    await supabase.from('apps').update({ status }).eq('id', id);
    revalidatePath('/apps');
    revalidatePath(`/apps/${id}`);
    revalidatePath(`/apps/${id}/info`);
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error in updateAppStatus:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteScreenshot(screenshotId: number) {
  try {
    const { data: shot } = await supabase
      .from('app_screenshots')
      .select('file_path')
      .eq('id', screenshotId)
      .single();
    await deleteFile(shot?.file_path);
    await supabase.from('app_screenshots').delete().eq('id', screenshotId);
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// ── AI Generation ─────────────────────────────────────────────────────────────

export type GenerateDescriptionsOptions = {
  keywordCount?: number;
  keywords?: string[];
  kwRepeatCount?: number;
};

export async function generateAppDescriptions(
  prompt: string,
  opts: GenerateDescriptionsOptions = {},
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { error: 'OPENROUTER_API_KEY is not configured in .env.local' };
  }

  const keywordCount = Math.max(1, Math.min(20, Math.floor(opts.keywordCount ?? 5)));
  const kwRepeatCount = Math.max(1, Math.min(10, Math.floor(opts.kwRepeatCount ?? 3)));
  const providedKeywords = (opts.keywords ?? [])
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 20);

  const repeatInstruction = `Each main keyword must appear EXACTLY ${kwRepeatCount} time${kwRepeatCount > 1 ? 's' : ''} across the long description (spread naturally — not clustered).`;

  const keywordDirective = providedKeywords.length
    ? `MUST naturally integrate these user-supplied main keywords (verbatim): ${providedKeywords.map((k) => `"${k}"`).join(', ')}. ${repeatInstruction}`
    : `MUST select exactly ${keywordCount} high-intent, relevant main keywords for this app concept. ${repeatInstruction}`;

  const totalKeywordsLine = providedKeywords.length
    ? `Total main keywords to surface: ${providedKeywords.length} (the ones listed above).`
    : `Total main keywords to surface: exactly ${keywordCount}.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'App Manager Pro',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.1',
        messages: [
          {
            role: 'system',
            content: [
              'You are a senior App Store Optimization (ASO) copywriter for BOTH Google Play and Apple App Store.',
              'Every output MUST comply 100% with ALL rules below — no exceptions.',
              '',
              '=== GOOGLE PLAY DEVELOPER PROGRAM POLICIES ===',
              '',
              'STORE LISTING & METADATA:',
              '- Short description: HARD MAX 80 characters, one benefit-focused sentence. No emojis, no ALL CAPS.',
              '- Long description: HARD MAX 900 WORDS. Well-structured, readable paragraphs.',
              '- Metadata (title, description, icons, screenshots) must accurately represent the app — no misleading content.',
              '- No keyword stuffing, no repeated terms for ranking manipulation, no irrelevant keywords.',
              '- No promotional language like "Best app", "#1 app", "Download now", "Free" unless factually substantiated.',
              '- No price, sale, discount, or limited-time offer text anywhere in the descriptions.',
              '- No ALL-CAPS words used as emphasis, no emoji spam, no excessive punctuation (!!!), no character padding.',
              '',
              'PROHIBITED CONTENT (Google Play):',
              '- No hate speech, discrimination, harassment, bullying, or threats based on any characteristic.',
              '- No sexually explicit, suggestive, or adult content.',
              '- No graphic violence, gore, or content glorifying self-harm or suicide.',
              '- No dangerous or illegal activities, weapons, drugs, gambling, or regulated goods promotion.',
              '- No financial investment guarantees, get-rich-quick claims, or deceptive financial promises.',
              '- No medical, health, or therapeutic claims without proper regulatory qualification.',
              '- No content that targets or exploits minors inappropriately.',
              '',
              'DECEPTIVE PRACTICES (Google Play):',
              '- No fake reviews, fabricated user counts, fake download numbers, fake awards, or fake badges.',
              '- No impersonation of other apps, companies, developers, or public figures.',
              '- No competitor app names, other app stores, or third-party brand names/trademarks you do not own.',
              '- No false implied endorsements from celebrities, organizations, or official bodies.',
              '- No claims of system or device feature access the app does not actually have.',
              '',
              'PRIVACY (Google Play):',
              '- No language implying unauthorized, hidden, or deceptive data collection.',
              '- No false privacy or security claims.',
              '',
              '=== APPLE APP STORE REVIEW GUIDELINES ===',
              '',
              'METADATA (Apple):',
              '- No competitor names, other platform names (Google Play, Android), or third-party trademarks.',
              '- No irrelevant keywords stuffed into the description for ranking manipulation.',
              '- Description must clearly and completely represent the app\'s actual features and functionality.',
              '- No pricing, subscription terms, promotional offers, or in-app purchase details in the description.',
              '- No references to beta features, features not yet released, or planned functionality.',
              '- No requests for ratings/reviews within the description text.',
              '',
              'PROHIBITED CONTENT (Apple):',
              '- No defamatory, offensive, insensitive, or mean-spirited content about real people or groups.',
              '- No objectionable material: hate speech, harassment, sexual content, graphic violence.',
              '- No false, misleading, or fabricated information of any kind.',
              '- No content that endangers health, safety, or well-being of any user.',
              '- No content facilitating illegal activities or circumventing laws.',
              '',
              'LEGAL (Apple):',
              '- No intellectual property infringement — no trademarks, logos, or copyrighted names you do not own.',
              '- No privacy violations or language implying unauthorized data use.',
              '- No medical, diagnostic, or therapeutic claims without appropriate regulatory approval references.',
              '- No financial advice, guaranteed investment returns, or misleading financial representations.',
              '',
              '=== WRITING STANDARDS ===',
              '- Write in clear, natural, user-focused English. Be honest about what the app actually does.',
              '- Keywords must integrate organically — never forced, never repeated for stuffing.',
              '- Do NOT include any markdown formatting (**, ##, -, etc.) inside the description text itself.',
              '- Both descriptions must be fully compliant with all rules above simultaneously.',
              '',
              'Return ONLY a valid JSON object, no markdown wrapper, no commentary.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `App concept: "${prompt}"`,
              '',
              'Keyword directive:',
              keywordDirective,
              totalKeywordsLine,
              '',
              'Produce:',
              '1. "short": A punchy, policy-compliant tagline (max 80 characters, no emojis, no ALL CAPS).',
              '2. "long": A detailed, policy-compliant Google Play description (<= 900 words).',
              '3. "keywords": The array of main keywords you actually used.',
              '',
              'Format strictly as: {"short": "...", "long": "...", "keywords": ["..."]}',
            ].join('\n'),
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return { success: true, data: result };
  } catch (error) {
    console.error('AI Generation Error:', error);
    return { error: (error as Error).message };
  }
}

export type GenerateFieldTarget = 'short' | 'long';

export type GenerateFieldOptions = GenerateDescriptionsOptions & {
  current?: string;
  appName?: string;
  mode?: 'generate' | 'refine';
};

export async function generateDescriptionField(
  target: GenerateFieldTarget,
  prompt: string,
  opts: GenerateFieldOptions = {},
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { error: 'OPENROUTER_API_KEY is not configured in .env.local' };
  }

  const keywordCount = Math.max(1, Math.min(20, Math.floor(opts.keywordCount ?? 5)));
  const kwRepeatCount = Math.max(1, Math.min(10, Math.floor(opts.kwRepeatCount ?? 3)));
  const providedKeywords = (opts.keywords ?? [])
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 20);
  const current = (opts.current ?? '').trim();
  const mode: 'generate' | 'refine' = opts.mode ?? (current ? 'refine' : 'generate');
  const appName = (opts.appName ?? '').trim();

  const repeatInstruction = target === 'long'
    ? ` Each keyword must appear EXACTLY ${kwRepeatCount} time${kwRepeatCount > 1 ? 's' : ''} (spread naturally — not clustered).`
    : '';

  const keywordDirective = providedKeywords.length
    ? `Integrate these exact main keywords naturally (no stuffing): ${providedKeywords.map((k) => `"${k}"`).join(', ')}.${repeatInstruction}`
    : `Target ${keywordCount} relevant main keywords for this app concept. Integrate them organically.${repeatInstruction}`;

  const targetRules =
    target === 'short'
      ? [
          'TARGET FIELD: Google Play "Short Description".',
          'Hard limits: 1 sentence, MAX 80 CHARACTERS. Style: benefit-led, no emojis, no ALL CAPS.',
        ].join('\n')
      : [
          'TARGET FIELD: Google Play "Full Description".',
          'Hard limits: MAX 900 WORDS total.',
          'Structure: strong hook, feature list, benefits, who it\'s for, soft closing CTA.',
        ].join('\n');

  const userContent =
    mode === 'refine' && current
      ? [
          appName ? `App name: "${appName}"` : null,
          `App concept: "${prompt}"`,
          '',
          'Keyword directive:',
          keywordDirective,
          '',
          targetRules,
          '',
          "Refine the following text. Fix issues, tighten wording, improve clarity. Stay faithful to intent.",
          '',
          'EXISTING TEXT:',
          '"""',
          current,
          '"""',
          '',
          'Return ONLY: {"text": "..."}',
        ].filter(Boolean).join('\n')
      : [
          appName ? `App name: "${appName}"` : null,
          `App concept: "${prompt}"`,
          '',
          'Keyword directive:',
          keywordDirective,
          '',
          targetRules,
          '',
          'Return ONLY: {"text": "..."}',
        ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'App Manager Pro',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.1',
        messages: [
          {
            role: 'system',
            content: [
              'You are a senior ASO copywriter for BOTH Google Play and Apple App Store.',
              'Every output MUST comply 100% with ALL of the following:',
              '',
              'GOOGLE PLAY RULES:',
              '- Short description: HARD MAX 80 characters, one sentence, no emojis, no ALL CAPS.',
              '- Long description: HARD MAX 900 WORDS, readable paragraphs, no markdown inside the text.',
              '- No keyword stuffing, no repeated terms for ranking, no irrelevant keywords.',
              '- No misleading metadata — must honestly represent the app.',
              '- No ALL-CAPS emphasis, no emoji spam, no excessive punctuation.',
              '- No prices, discounts, sale text, or limited-time offers.',
              '- No promotional superlatives (#1, Best, Download now) without proof.',
              '- No hate speech, harassment, sexual content, graphic violence, illegal activity promotion.',
              '- No financial guarantees, unqualified medical/health claims, or dangerous activity promotion.',
              '- No fake reviews, fake user counts, fake awards, fake badges.',
              '- No competitor app names, other stores, or trademarks you do not own.',
              '- No impersonation, no false endorsements, no hidden data collection language.',
              '',
              'APPLE APP STORE RULES:',
              '- No competitor names, cross-platform references, or third-party trademarks.',
              '- Description must clearly and accurately represent actual app functionality.',
              '- No pricing, subscription terms, or in-app purchase details in descriptions.',
              '- No references to unreleased features or beta functionality.',
              '- No defamatory, offensive, or objectionable content of any kind.',
              '- No false or misleading information.',
              '- No medical, diagnostic, or therapeutic claims without regulatory qualification.',
              '- No intellectual property infringement.',
              '- No requests for ratings/reviews inside description text.',
              '',
              'Write in clear, natural, user-focused English. Keywords must read organically.',
              'Return ONLY a valid JSON object: {"text": "..."} — no markdown wrapper, no commentary.',
            ].join('\n'),
          },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    const text = typeof parsed.text === 'string' ? parsed.text : '';
    const trimmed = target === 'short' ? text.slice(0, 80) : text.slice(0, 4000);
    return { success: true, data: { text: trimmed } };
  } catch (error) {
    console.error('AI Field Generation Error:', error);
    return { error: (error as Error).message };
  }
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export type Payer = 'marwan' | 'abdsamad';
export type Currency = 'MAD' | 'USD';
export type PaymentStatus = 'paid' | 'pending';

const PAYERS: Payer[] = ['marwan', 'abdsamad'];
const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'pending'];

export async function getExchangeRate(): Promise<number> {
  const { data: row } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'usd_mad_rate')
    .single();
  const parsed = row ? parseFloat(row.value) : 10;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export async function setExchangeRate(rate: number): Promise<ActionResponse> {
  try {
    if (!Number.isFinite(rate) || rate <= 0) {
      return { error: 'Rate must be a positive number.' };
    }
    await supabase.from('settings').upsert({ key: 'usd_mad_rate', value: String(rate) });
    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Error in setExchangeRate:', error);
    return { error: (error as Error).message };
  }
}

export async function addExpense(formData: FormData): Promise<ActionResponse<{ id: number }>> {
  try {
    const payer = (formData.get('payer') as string)?.toLowerCase() as Payer;
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || '';
    const currency = ((formData.get('currency') as string) || 'MAD').toUpperCase() as Currency;
    const amountRaw = parseFloat((formData.get('amount') as string) || '0');
    const expenseDate =
      (formData.get('expenseDate') as string) || new Date().toISOString().slice(0, 10);
    const paymentStatus = ((formData.get('paymentStatus') as string) || 'paid').toLowerCase() as PaymentStatus;

    if (!PAYERS.includes(payer)) return { error: 'Payer must be marwan or abdsamad.' };
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) return { error: 'Amount must be a positive number.' };
    if (currency !== 'MAD' && currency !== 'USD') return { error: 'Currency must be MAD or USD.' };
    if (!PAYMENT_STATUSES.includes(paymentStatus)) return { error: 'Payment status must be paid or pending.' };

    const rate = await getExchangeRate();
    const amount_mad = currency === 'MAD' ? amountRaw : amountRaw * rate;
    const amount_usd = currency === 'USD' ? amountRaw : amountRaw / rate;

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        payer, description, category, amount: amountRaw,
        currency, exchange_rate: rate, amount_mad, amount_usd,
        expense_date: expenseDate, payment_status: paymentStatus,
      })
      .select('id')
      .single();

    if (error) throw error;
    revalidatePath('/expenses');
    return { success: true, data: { id: expense.id } };
  } catch (error) {
    console.error('Error in addExpense:', error);
    return { error: (error as Error).message };
  }
}

export async function setExpensePaymentStatus(id: number, status: string): Promise<ActionResponse> {
  try {
    if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) {
      return { error: `Status must be one of: ${PAYMENT_STATUSES.join(', ')}` };
    }
    await supabase.from('expenses').update({ payment_status: status }).eq('id', id);
    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Error in setExpensePaymentStatus:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteExpense(id: number): Promise<ActionResponse> {
  try {
    await supabase.from('expenses').delete().eq('id', id);
    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteExpense:', error);
    return { error: (error as Error).message };
  }
}

export async function getExpenses() {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('id', { ascending: false });
  return data || [];
}

export type PersonBucket = { mad: number; usd: number; count: number };

export type ExpenseSummary = {
  rate: number;
  paidTotalMAD: number;
  paidTotalUSD: number;
  pendingTotalMAD: number;
  pendingTotalUSD: number;
  perPerson: Record<
    Payer,
    { paid: PersonBucket; pending: PersonBucket; share: number; balance: number }
  >;
  whoOwes: Payer | null;
  whoReceives: Payer | null;
  settlementMAD: number;
  settlementUSD: number;
};

export async function getExpenseSummary(): Promise<ExpenseSummary> {
  const rate = await getExchangeRate();
  const { data: rows } = await supabase
    .from('expenses')
    .select('payer, amount_mad, amount_usd, payment_status');

  const empty = (): PersonBucket => ({ mad: 0, usd: 0, count: 0 });
  const buckets: Record<Payer, { paid: PersonBucket; pending: PersonBucket }> = {
    marwan: { paid: empty(), pending: empty() },
    abdsamad: { paid: empty(), pending: empty() },
  };

  for (const r of rows || []) {
    const person = buckets[r.payer as Payer];
    if (!person) continue;
    const target = r.payment_status === 'pending' ? person.pending : person.paid;
    target.mad += r.amount_mad;
    target.usd += r.amount_usd;
    target.count += 1;
  }

  const paidTotalMAD = buckets.marwan.paid.mad + buckets.abdsamad.paid.mad;
  const paidTotalUSD = buckets.marwan.paid.usd + buckets.abdsamad.paid.usd;
  const pendingTotalMAD = buckets.marwan.pending.mad + buckets.abdsamad.pending.mad;
  const pendingTotalUSD = buckets.marwan.pending.usd + buckets.abdsamad.pending.usd;
  const fairShareMAD = paidTotalMAD / 2;

  const marwanBalance = buckets.marwan.paid.mad - fairShareMAD;
  const abdsamadBalance = buckets.abdsamad.paid.mad - fairShareMAD;

  let whoOwes: Payer | null = null;
  let whoReceives: Payer | null = null;
  let settlementMAD = 0;

  if (Math.abs(marwanBalance) > 0.005) {
    if (marwanBalance > 0) {
      whoReceives = 'marwan'; whoOwes = 'abdsamad'; settlementMAD = marwanBalance;
    } else {
      whoReceives = 'abdsamad'; whoOwes = 'marwan'; settlementMAD = -marwanBalance;
    }
  }

  return {
    rate, paidTotalMAD, paidTotalUSD, pendingTotalMAD, pendingTotalUSD,
    perPerson: {
      marwan: { paid: buckets.marwan.paid, pending: buckets.marwan.pending, share: fairShareMAD, balance: marwanBalance },
      abdsamad: { paid: buckets.abdsamad.paid, pending: buckets.abdsamad.pending, share: fairShareMAD, balance: abdsamadBalance },
    },
    whoOwes, whoReceives, settlementMAD, settlementUSD: settlementMAD / rate,
  };
}

// ── Companies ─────────────────────────────────────────────────────────────────

export async function getCompanies() {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*, company_documents(*), accounts(developer_name, type)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getCompanies: ${error.message} (code: ${error.code})`);


  return (companies || []).map((co: any) => ({
    ...co,
    documents: co.company_documents || [],
    account_name: co.accounts?.developer_name,
    account_type: co.accounts?.type,
    company_documents: undefined,
    accounts: undefined,
  }));
}

export async function addCompany(formData: FormData): Promise<ActionResponse> {
  try {
    const name = formData.get('name')?.toString() || '';
    const ice = formData.get('ice')?.toString() || '';
    const duns = formData.get('duns')?.toString() || '';
    const ded = formData.get('ded')?.toString() || '';
    const hasId = formData.get('hasId') === '1' ? 1 : 0;
    const linkedAccountId = formData.get('linkedAccountId')?.toString() || null;
    const notes = formData.get('notes')?.toString() || '';

    const { data: company, error } = await supabase
      .from('companies')
      .insert({ name, ice, duns, ded, has_id: hasId, linked_account_id: linkedAccountId || null, notes })
      .select('id')
      .single();

    if (error) throw error;
    const companyId = company.id;

    await saveMultiDocs(formData, 'idFront', companyId, 'id_front', 'id-front-');
    await saveMultiDocs(formData, 'idBack', companyId, 'id_back', 'id-back-');
    await saveMultiDocs(formData, 'companyDoc', companyId, 'company_doc', 'doc-');
    await saveMultiDocs(formData, 'otherDoc', companyId, 'other', 'other-');

    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error in addCompany:', error);
    return { error: (error as Error).message };
  }
}

export async function updateCompany(id: number, formData: FormData): Promise<ActionResponse> {
  try {
    const name = formData.get('name')?.toString() || '';
    const ice = formData.get('ice')?.toString() || '';
    const duns = formData.get('duns')?.toString() || '';
    const ded = formData.get('ded')?.toString() || '';
    const hasId = formData.get('hasId') === '1' ? 1 : 0;
    const linkedAccountId = formData.get('linkedAccountId')?.toString() || null;
    const notes = formData.get('notes')?.toString() || '';
    const status = formData.get('companyStatus')?.toString() || 'not_used';

    const { data: existing } = await supabase.from('companies').select('id').eq('id', id).single();
    if (!existing) return { error: 'Company not found.' };

    await supabase
      .from('companies')
      .update({ name, ice, duns, ded, has_id: hasId, linked_account_id: linkedAccountId || null, notes, status })
      .eq('id', id);

    await saveMultiDocs(formData, 'idFront', id, 'id_front', 'id-front-');
    await saveMultiDocs(formData, 'idBack', id, 'id_back', 'id-back-');
    await saveMultiDocs(formData, 'companyDoc', id, 'company_doc', 'doc-');
    await saveMultiDocs(formData, 'otherDoc', id, 'other', 'other-');

    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error in updateCompany:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteCompanyDocument(docId: number): Promise<ActionResponse> {
  try {
    const { data: doc } = await supabase.from('company_documents').select('file_path').eq('id', docId).single();
    await deleteFile(doc?.file_path);
    await supabase.from('company_documents').delete().eq('id', docId);
    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteCompanyDocument:', error);
    return { error: (error as Error).message };
  }
}

export async function linkCompanyToAccount(companyId: number, accountId: number): Promise<ActionResponse> {
  try {
    await supabase.from('companies').update({ linked_account_id: accountId }).eq('id', companyId);
    revalidatePath('/companies');
    revalidatePath(`/accounts/${accountId}`);
    return { success: true };
  } catch (error) {
    console.error('Error in linkCompanyToAccount:', error);
    return { error: (error as Error).message };
  }
}

export async function addCompanyQuick(
  name: string,
  linkedAccountId: number,
): Promise<ActionResponse<{ id: number; name: string }>> {
  try {
    if (!name.trim()) return { error: 'Company name is required.' };
    const { data: company, error } = await supabase
      .from('companies')
      .insert({ name: name.trim(), linked_account_id: linkedAccountId })
      .select('id')
      .single();
    if (error) throw error;
    revalidatePath('/companies');
    revalidatePath(`/accounts/${linkedAccountId}`);
    return { success: true, data: { id: company.id, name: name.trim() } };
  } catch (error) {
    console.error('Error in addCompanyQuick:', error);
    return { error: (error as Error).message };
  }
}

export async function addCompanyName(
  name: string,
): Promise<ActionResponse<{ id: number; name: string }>> {
  try {
    if (!name.trim()) return { error: 'Company name is required.' };
    const { data: company, error } = await supabase
      .from('companies')
      .insert({ name: name.trim() })
      .select('id')
      .single();
    if (error) throw error;
    revalidatePath('/companies');
    return { success: true, data: { id: company.id, name: name.trim() } };
  } catch (error) {
    console.error('Error in addCompanyName:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteCompany(id: number): Promise<ActionResponse> {
  try {
    const { data: docs } = await supabase.from('company_documents').select('file_path').eq('company_id', id);
    for (const doc of docs || []) await deleteFile(doc.file_path);
    await supabase.from('companies').delete().eq('id', id);
    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteCompany:', error);
    return { error: (error as Error).message };
  }
}

// ── Tutorials ─────────────────────────────────────────────────────────────────

export async function getTutorials() {
  const { data } = await supabase.from('tutorials').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function addTutorial(formData: FormData): Promise<ActionResponse> {
  try {
    const title = formData.get('title')?.toString() || '';
    const description = formData.get('description')?.toString() || '';
    const type = formData.get('type')?.toString() || 'link';
    const category = formData.get('category')?.toString() || '';
    const url = formData.get('url')?.toString() || '';

    let filePath = '';
    let fileName = '';
    if (type === 'upload') {
      const file = formData.get('file') as any;
      const pairedName = (formData.get('file__filename') as string) || '';
      if (typeof file === 'string') {
        if (file.trim()) {
          filePath = file;
          fileName = resolveFileName(file, pairedName, 'tutorial');
        }
      } else if (file?.size) {
        filePath = await saveUploadedFile(file, 'tutorials');
        fileName = file.name || '';
      }
    }

    const { data: inserted, error } = await supabase.from('tutorials').insert({
      title, description, type, file_path: filePath, file_name: fileName, url, category,
    }).select().single();
    if (error) throw error;

    revalidatePath('/tutorials');
    return { success: true, data: inserted };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateTutorial(id: number, formData: FormData): Promise<ActionResponse> {
  try {
    const title = formData.get('title')?.toString() || '';
    const description = formData.get('description')?.toString() || '';
    const category = formData.get('category')?.toString() || '';
    const url = formData.get('url')?.toString() || '';

    if (!title) return { error: 'Title is required.' };

    const { data: updated, error } = await supabase
      .from('tutorials')
      .update({ title, description, category, url })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    revalidatePath('/tutorials');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteTutorial(id: number): Promise<ActionResponse> {
  try {
    const { data: tutorial } = await supabase.from('tutorials').select('file_path').eq('id', id).single();
    await deleteFile(tutorial?.file_path);
    await supabase.from('tutorials').delete().eq('id', id);
    revalidatePath('/tutorials');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ── Websites ──────────────────────────────────────────────────────────────────

export async function getWebsites() {
  const { data } = await supabase.from('websites').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function addWebsite(formData: FormData): Promise<ActionResponse> {
  try {
    const title = formData.get('title')?.toString() || '';
    const url = formData.get('url')?.toString() || '';
    const description = formData.get('description')?.toString() || '';
    const category = formData.get('category')?.toString() || '';

    if (!title) return { error: 'Title is required.' };
    if (!url) return { error: 'URL is required.' };

    const { data: inserted, error } = await supabase
      .from('websites')
      .insert({ title, url, description, category })
      .select()
      .single();
    if (error) throw error;

    revalidatePath('/websites');
    return { success: true, data: inserted };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateWebsite(id: number, formData: FormData): Promise<ActionResponse> {
  try {
    const title = formData.get('title')?.toString() || '';
    const url = formData.get('url')?.toString() || '';
    const description = formData.get('description')?.toString() || '';
    const category = formData.get('category')?.toString() || '';

    if (!title) return { error: 'Title is required.' };
    if (!url) return { error: 'URL is required.' };

    const { data: updated, error } = await supabase
      .from('websites')
      .update({ title, url, description, category })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    revalidatePath('/websites');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteWebsite(id: number): Promise<ActionResponse> {
  try {
    await supabase.from('websites').delete().eq('id', id);
    revalidatePath('/websites');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ── Nitch ─────────────────────────────────────────────────────────────────────

export type NitchPriority = 'low' | 'medium' | 'high';

export type Nitch = {
  id: number;
  keyword: string;
  url: string;
  note: string | null;
  priority: NitchPriority;
  created_at: string;
};

export async function getNitches(): Promise<Nitch[]> {
  const { data } = await supabase
    .from('nitch')
    .select('*')
    .order('created_at', { ascending: false });
  return (data || []) as Nitch[];
}

export async function addNitch(formData: FormData): Promise<ActionResponse> {
  try {
    const keyword = formData.get('keyword')?.toString() || '';
    const url = formData.get('url')?.toString() || '';
    const note = formData.get('note')?.toString() || '';
    const priority = formData.get('priority')?.toString() || 'medium';

    if (!keyword) return { error: 'Keyword is required.' };
    if (!url) return { error: 'URL is required.' };

    const { data: inserted, error } = await supabase
      .from('nitch')
      .insert({ keyword, url, note, priority })
      .select()
      .single();
    if (error) throw error;

    revalidatePath('/nitch');
    return { success: true, data: inserted as Nitch };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateNitch(id: number, formData: FormData): Promise<ActionResponse> {
  try {
    const keyword = formData.get('keyword')?.toString() || '';
    const url = formData.get('url')?.toString() || '';
    const note = formData.get('note')?.toString() || '';
    const priority = formData.get('priority')?.toString() || 'medium';

    if (!keyword) return { error: 'Keyword is required.' };
    if (!url) return { error: 'URL is required.' };

    const { data: updated, error } = await supabase
      .from('nitch')
      .update({ keyword, url, note, priority })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    revalidatePath('/nitch');
    return { success: true, data: updated as Nitch };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteNitch(id: number): Promise<ActionResponse> {
  try {
    await supabase.from('nitch').delete().eq('id', id);
    revalidatePath('/nitch');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ── Missions ──────────────────────────────────────────────────────────────────

export type MissionStatus = 'pending' | 'done';
export type MissionPriority = 'low' | 'normal' | 'high';

export type Mission = {
  id: number;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string;
  status: MissionStatus;
  priority: MissionPriority;
  created_by: string | null;
  created_at: string;
};

export async function getMissions(date?: string): Promise<Mission[]> {
  let query = supabase
    .from('missions')
    .select('*')
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (date) query = query.eq('due_date', date);

  const { data } = await query;
  return (data || []) as Mission[];
}

export async function addMission(formData: FormData): Promise<ActionResponse> {
  try {
    const title = formData.get('title')?.toString().trim() || '';
    if (!title) return { error: 'Title is required.' };
    const description = formData.get('description')?.toString() || '';
    const assigned_to = formData.get('assigned_to')?.toString() || '';
    const due_date = formData.get('due_date')?.toString() || '';
    if (!due_date) return { error: 'Due date is required.' };
    const priority = (formData.get('priority')?.toString() || 'normal') as MissionPriority;
    const created_by = formData.get('created_by')?.toString() || '';

    const { data: inserted, error } = await supabase.from('missions').insert({
      title, description, assigned_to, due_date, status: 'pending', priority, created_by,
    }).select().single();
    if (error) throw error;

    revalidatePath('/missions');
    return { success: true, data: inserted as Mission };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleMission(id: number): Promise<ActionResponse> {
  try {
    const { data: mission } = await supabase.from('missions').select('status').eq('id', id).single();
    if (!mission) return { error: 'Mission not found.' };
    const next = mission.status === 'done' ? 'pending' : 'done';
    await supabase.from('missions').update({ status: next }).eq('id', id);
    revalidatePath('/missions');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteMission(id: number): Promise<ActionResponse> {
  try {
    await supabase.from('missions').delete().eq('id', id);
    revalidatePath('/missions');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateMission(id: number, formData: FormData): Promise<ActionResponse> {
  try {
    const title = formData.get('title')?.toString().trim() || '';
    if (!title) return { error: 'Title is required.' };
    const description = formData.get('description')?.toString() || '';
    const assigned_to = formData.get('assigned_to')?.toString() || '';
    const due_date = formData.get('due_date')?.toString() || '';
    if (!due_date) return { error: 'Due date is required.' };
    const priority = (formData.get('priority')?.toString() || 'normal') as MissionPriority;

    const { error } = await supabase
      .from('missions')
      .update({ title, description, assigned_to, due_date, priority })
      .eq('id', id);
    if (error) throw error;

    revalidatePath('/missions');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
