'use server';

import db from './db';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';

export type ActionResponse<T = any> = {
  success?: boolean;
  error?: string;
  data?: T;
};

async function ensureDirs() {
  const dirs = [
    join(process.cwd(), 'public', 'uploads', 'icons'),
    join(process.cwd(), 'public', 'uploads', 'apps'),
    join(process.cwd(), 'public', 'uploads', 'documents'),
    join(process.cwd(), 'public', 'uploads', 'screenshots'),
    join(process.cwd(), 'public', 'uploads', 'versions'),
    join(process.cwd(), 'public', 'uploads', 'companies'),
    join(process.cwd(), 'public', 'uploads', 'tutorials'),
  ];
  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
}

/** Save a single uploaded file under public/uploads/<bucket>/ and return the public path. */
async function saveUploadedFile(file: any, bucket: string, prefix = ''): Promise<string | ''> {
  if (!file || !file.size || typeof file.arrayBuffer !== 'function') return '';
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${Date.now()}-${prefix}${safeName}`;
  const path = join(process.cwd(), 'public', 'uploads', bucket, filename);
  await writeFile(path, buffer);
  return `/uploads/${bucket}/${filename}`;
}

export async function getAccounts() {
  const accounts = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all() as any[];
  for (const acc of accounts) {
    acc.documents = db.prepare('SELECT * FROM account_documents WHERE account_id = ?').all(acc.id);
    const c = db.prepare('SELECT COUNT(*) as count FROM apps WHERE account_id = ?').get(acc.id) as { count: number };
    acc.app_count = c.count;
  }
  return accounts;
}

export async function getAccountById(id: number) {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
  if (!account) return null;
  account.documents = db.prepare('SELECT * FROM account_documents WHERE account_id = ?').all(id);
  account.linkedCompanies = db.prepare('SELECT id, name FROM companies WHERE linked_account_id = ? ORDER BY name ASC').all(id);
  return account;
}

export async function addAccount(formData: FormData): Promise<ActionResponse> {
  try {
    await ensureDirs();
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
    const documents = formData.getAll('documents'); // Multiple files

    const result = db.prepare(`
      INSERT INTO accounts (type, developer_name, developer_id, email, website, phone,
                            company_name, dev_password, dev_2fa_secret, dev_security_notes,
                            vcc_number, vcc_holder, vcc_expiry, vcc_cvv, vcc_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(type, developerName, developerId, email, website, phone,
           companyName, devPassword, dev2faSecret, devSecurityNotes,
           vccNumber, vccHolder, vccExpiry, vccCvv, vccNotes);
    
    const accountId = result.lastInsertRowid;

    for (const doc of documents) {
      if (doc && typeof doc !== 'string' && (doc as any).size > 0) {
        const file = doc as any;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name}`;
        const path = join(process.cwd(), 'public', 'uploads', 'documents', filename);
        await writeFile(path, buffer);
        
        db.prepare('INSERT INTO account_documents (account_id, file_path, file_name) VALUES (?, ?, ?)')
          .run(accountId, `/uploads/documents/${filename}`, file.name);
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

// --- Apps ---

/** Snapshot the current state of an app's listing into listing_versions. */
function snapshotListing(appId: number, releaseFilePath?: string) {
  const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId) as any;
  if (!app) return;
  const shots = db
    .prepare('SELECT file_path FROM app_screenshots WHERE app_id = ? ORDER BY id ASC')
    .all(appId) as Array<{ file_path: string }>;
  const existing = db
    .prepare('SELECT COUNT(*) as c FROM listing_versions WHERE app_id = ?')
    .get(appId) as { c: number };
  const label = `v${existing.c + 1}`;
  db.prepare(`
    INSERT INTO listing_versions
      (app_id, version_label, name, short_description, long_description,
       icon_small_path, icon_large_path, store_url, contact_email,
       privacy_url, website_url, screenshots_json, release_file_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    appId,
    label,
    app.name,
    app.short_description,
    app.long_description,
    app.icon_small_path,
    app.icon_large_path,
    app.store_url,
    app.contact_email,
    app.privacy_url,
    app.website_url,
    JSON.stringify(shots.map(s => s.file_path)),
    releaseFilePath || null,
  );
}

export async function getListingVersions(appId: number) {
  // Backfill an initial snapshot for apps created before this feature existed.
  const existing = db
    .prepare('SELECT COUNT(*) as c FROM listing_versions WHERE app_id = ?')
    .get(appId) as { c: number };
  if (existing.c === 0) {
    const appExists = db.prepare('SELECT id FROM apps WHERE id = ?').get(appId);
    if (appExists) snapshotListing(appId);
  }

  const rows = db
    .prepare(
      'SELECT * FROM listing_versions WHERE app_id = ? ORDER BY created_at DESC, id DESC',
    )
    .all(appId) as any[];
  return rows.map(r => ({
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

export async function getApps(accountId?: number) {
  let apps: any[] = [];
  if (accountId) {
    apps = db.prepare(`
      SELECT apps.*,
             accounts.email as account_email,
             accounts.developer_name as account_developer_name,
             accounts.developer_id as account_developer_id,
             (SELECT version_number FROM versions WHERE app_id = apps.id ORDER BY release_date DESC LIMIT 1) as latest_version
      FROM apps
      JOIN accounts ON apps.account_id = accounts.id
      WHERE apps.account_id = ?
      ORDER BY apps.created_at DESC
    `).all(accountId);
  } else {
    apps = db.prepare(`
      SELECT apps.*, 
             accounts.email as account_email, 
             accounts.developer_name as account_developer_name,
             accounts.developer_id as account_developer_id,
             (SELECT version_number FROM versions WHERE app_id = apps.id ORDER BY release_date DESC LIMIT 1) as latest_version
      FROM apps 
      JOIN accounts ON apps.account_id = accounts.id 
      ORDER BY apps.created_at DESC
    `).all();
  }

  for (const app of apps) {
    app.screenshots = db.prepare('SELECT * FROM app_screenshots WHERE app_id = ?').all(app.id);
  }
  return apps;
}

export async function addApp(formData: FormData): Promise<ActionResponse<{ id: number }>> {
  try {
    await ensureDirs();
    const accountId = formData.get('accountId');
    const name = formData.get('name') as string;
    const short_description = formData.get('shortDescription') as string;
    const long_description = formData.get('longDescription') as string;
    const store_url = formData.get('storeUrl') as string;
    const contact_email = (formData.get('contactEmail') as string) || '';
    const privacy_url = (formData.get('privacyUrl') as string) || '';
    const website_url = (formData.get('websiteUrl') as string) || '';

    const iconSmall = formData.get('iconSmall') as any;
    const iconLarge = formData.get('iconLarge') as any;
    const aabFile  = formData.get('aabFile')  as any;

    let iconSmallPath = '';
    let iconLargePath = '';
    let aabPath = '';

    if (iconSmall && iconSmall.size > 0 && typeof iconSmall.arrayBuffer === 'function') {
      const bytes = await iconSmall.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-small-${iconSmall.name}`;
      const path = join(process.cwd(), 'public', 'uploads', 'icons', filename);
      await writeFile(path, buffer);
      iconSmallPath = `/uploads/icons/${filename}`;
    }

    if (iconLarge && iconLarge.size > 0 && typeof iconLarge.arrayBuffer === 'function') {
      const bytes = await iconLarge.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-large-${iconLarge.name}`;
      const path = join(process.cwd(), 'public', 'uploads', 'icons', filename);
      await writeFile(path, buffer);
      iconLargePath = `/uploads/icons/${filename}`;
    }

    if (aabFile && aabFile.size > 0 && typeof aabFile.arrayBuffer === 'function') {
      aabPath = await saveUploadedFile(aabFile, 'apps');
    }

    const result = db.prepare(`
      INSERT INTO apps (account_id, name, short_description, long_description, icon_small_path, icon_large_path, store_url, contact_email, privacy_url, website_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(accountId, name, short_description, long_description, iconSmallPath, iconLargePath, store_url, contact_email, privacy_url, website_url);

    const appId = Number(result.lastInsertRowid);

    // Handle screenshots
    for (let i = 0; i < 8; i++) {
      const screenshot = formData.get(`screenshot_${i}`) as any;
      if (screenshot && screenshot.size > 0 && typeof screenshot.arrayBuffer === 'function') {
        const bytes = await screenshot.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-shot-${i}-${screenshot.name}`;
        const path = join(process.cwd(), 'public', 'uploads', 'screenshots', filename);
        await writeFile(path, buffer);
        const screenshotPath = `/uploads/screenshots/${filename}`;

        db.prepare('INSERT INTO app_screenshots (app_id, file_path) VALUES (?, ?)').run(appId, screenshotPath);
      }
    }

    snapshotListing(appId, aabPath || undefined);

    revalidatePath('/apps');
    revalidatePath('/');
    return { success: true, data: { id: appId } };
  } catch (error) {
    console.error('Error in addApp:', error);
    return { error: (error as Error).message };
  }
}

// --- Versions ---

export async function getVersions(appId: number) {
  const versions = db.prepare(
    'SELECT * FROM versions WHERE app_id = ? ORDER BY release_date DESC, id DESC'
  ).all(appId) as any[];
  for (const v of versions) {
    v.screenshots = db.prepare(
      'SELECT * FROM version_screenshots WHERE version_id = ? ORDER BY id ASC'
    ).all(v.id);
  }
  return versions;
}

/**
 * Add a new version. Accepts:
 *   appId, versionNumber, changelog
 *   file        — AAB / IPA binary
 *   iconSmall   — optional new app icon snapshot for this version
 *   iconLarge   — optional new promo graphic snapshot for this version
 *   screenshot_0..7 — optional new screenshot files for this version
 *   updateAppAssets ('1' | '0') — also overwrite the app's *current* icon/promo
 *      and replace its current screenshots with these uploads (default '1').
 */
export async function addVersion(formData: FormData): Promise<ActionResponse<{ id: number }>> {
  try {
    await ensureDirs();
    const appId = Number(formData.get('appId'));
    const versionNumber = (formData.get('versionNumber') as string)?.trim();
    const changelog = (formData.get('changelog') as string) || '';
    const updateAppAssets = (formData.get('updateAppAssets') as string) !== '0';

    if (!appId) return { error: 'Missing appId.' };
    if (!versionNumber) return { error: 'Version number is required.' };

    const filePath    = await saveUploadedFile(formData.get('file'), 'apps');
    const iconPath    = await saveUploadedFile(formData.get('iconSmall'), 'icons',  `v-small-`);
    const promoPath   = await saveUploadedFile(formData.get('iconLarge'), 'icons',  `v-large-`);

    const result = db.prepare(`
      INSERT INTO versions (app_id, version_number, changelog, file_path, icon_path, promo_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(appId, versionNumber, changelog, filePath, iconPath, promoPath);

    const versionId = Number(result.lastInsertRowid);

    // Per-version screenshot snapshots
    const versionScreenshots: string[] = [];
    for (let i = 0; i < 8; i++) {
      const shot = formData.get(`screenshot_${i}`) as any;
      const path = await saveUploadedFile(shot, 'screenshots', `v-`);
      if (path) {
        db.prepare('INSERT INTO version_screenshots (version_id, file_path) VALUES (?, ?)')
          .run(versionId, path);
        versionScreenshots.push(path);
      }
    }

    // Optionally roll the version's assets up to the app's "current" listing assets
    if (updateAppAssets) {
      const updates: string[] = [];
      const params: any[] = [];
      if (iconPath)  { updates.push('icon_small_path = ?'); params.push(iconPath); }
      if (promoPath) { updates.push('icon_large_path = ?'); params.push(promoPath); }
      if (updates.length) {
        params.push(appId);
        db.prepare(`UPDATE apps SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
      if (versionScreenshots.length) {
        // Replace current app screenshots with the new set
        db.prepare('DELETE FROM app_screenshots WHERE app_id = ?').run(appId);
        const insert = db.prepare('INSERT INTO app_screenshots (app_id, file_path) VALUES (?, ?)');
        for (const p of versionScreenshots) insert.run(appId, p);
      }
    }

    // Snapshot the listing state at this release point, attaching the AAB path so
    // the user can re-download the binary from the listing history.
    snapshotListing(appId, filePath || undefined);

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
    const v = db.prepare('SELECT app_id, file_path, icon_path, promo_path FROM versions WHERE id = ?').get(versionId) as any;
    if (!v) return { error: 'Version not found.' };

    const screenshots = db.prepare('SELECT file_path FROM version_screenshots WHERE version_id = ?').all(versionId) as any[];

    // Best-effort unlink of binary + assets
    const tryUnlink = async (p?: string) => {
      if (!p) return;
      try { await unlink(join(process.cwd(), 'public', p)); } catch {}
    };
    await tryUnlink(v.file_path);
    await tryUnlink(v.icon_path);
    await tryUnlink(v.promo_path);
    for (const s of screenshots) await tryUnlink(s.file_path);

    db.prepare('DELETE FROM versions WHERE id = ?').run(versionId);

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

// --- App Details ---

export async function getAppById(id: number) {
  const app = db.prepare(`
    SELECT apps.*,
           accounts.email as account_email,
           accounts.type as account_type,
           accounts.developer_name as account_developer_name,
           accounts.developer_id as account_developer_id,
           accounts.website as account_website,
           accounts.phone as account_phone
    FROM apps
    JOIN accounts ON apps.account_id = accounts.id
    WHERE apps.id = ?
  `).get(id) as any;

  if (app) {
    app.screenshots = db.prepare('SELECT * FROM app_screenshots WHERE app_id = ?').all(id);
  }
  return app;
}

// --- Stats ---

export async function getStats() {
  const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
  const appCount = db.prepare('SELECT COUNT(*) as count FROM apps').get() as { count: number };
  const versionCount = db.prepare('SELECT COUNT(*) as count FROM versions').get() as { count: number };

  return {
    accounts: accountCount.count,
    apps: appCount.count,
    versions: versionCount.count
  };
}

export async function deleteAccount(id: number) {
  try {
    // Get documents to delete from disk
    const docs = db.prepare('SELECT file_path FROM account_documents WHERE account_id = ?').all(id) as any[];
    for (const doc of docs) {
      if (doc.file_path) {
        try {
          await unlink(join(process.cwd(), 'public', doc.file_path));
        } catch (e) { console.error('Failed to unlink:', doc.file_path); }
      }
    }

    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
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
    db.prepare('UPDATE accounts SET status = ? WHERE id = ?').run(status, id);
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error in updateAccountStatus:', error);
    return { error: (error as Error).message };
  }
}

export async function updateAccount(id: number, formData: FormData) {
  try {
    await ensureDirs();
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

    db.prepare(`
      UPDATE accounts
      SET developer_name = ?, developer_id = ?, email = ?, website = ?, phone = ?, status = ?,
          company_name = ?, dev_password = ?, dev_2fa_secret = ?, dev_security_notes = ?,
          vcc_number = ?, vcc_holder = ?, vcc_expiry = ?, vcc_cvv = ?, vcc_notes = ?
      WHERE id = ?
    `).run(developerName, developerId, email, website, phone, status,
           companyName, devPassword, dev2faSecret, devSecurityNotes,
           vccNumber, vccHolder, vccExpiry, vccCvv, vccNotes, id);

    // When account is closed, automatically close all its apps
    if (status === 'closed') {
      db.prepare(`UPDATE apps SET status = 'closed' WHERE account_id = ?`).run(id);
    }

    // Save any newly uploaded documents
    const newDocs = formData.getAll('newDocuments');
    for (const doc of newDocs) {
      if (doc && typeof doc !== 'string' && (doc as any).size > 0) {
        const file = doc as any;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path = join(process.cwd(), 'public', 'uploads', 'documents', filename);
        await writeFile(path, buffer);
        db.prepare('INSERT INTO account_documents (account_id, file_path, file_name) VALUES (?, ?, ?)')
          .run(id, `/uploads/documents/${filename}`, file.name);
      }
    }

    revalidatePath('/accounts');
    revalidatePath(`/accounts/${id}`);
    const documents = db.prepare('SELECT * FROM account_documents WHERE account_id = ? ORDER BY created_at ASC').all(id);
    return { success: true, data: { documents } };
  } catch (error) {
    console.error('Error in updateAccount:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteAccountDocument(docId: number): Promise<ActionResponse> {
  try {
    const doc = db.prepare('SELECT file_path FROM account_documents WHERE id = ?').get(docId) as any;
    if (doc?.file_path) {
      try { await unlink(join(process.cwd(), 'public', doc.file_path)); } catch {}
    }
    db.prepare('DELETE FROM account_documents WHERE id = ?').run(docId);
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteAccountDocument:', error);
    return { error: (error as Error).message };
  }
}

// --- App Management ---

export async function deleteApp(id: number) {
  try {
    // Get app to delete icons and screenshots
    const app = db.prepare('SELECT icon_small_path, icon_large_path FROM apps WHERE id = ?').get(id) as any;
    if (app) {
      if (app.icon_small_path) try { await unlink(join(process.cwd(), 'public', app.icon_small_path)); } catch(e){}
      if (app.icon_large_path) try { await unlink(join(process.cwd(), 'public', app.icon_large_path)); } catch(e){}
      
      const screenshots = db.prepare('SELECT file_path FROM app_screenshots WHERE app_id = ?').all(id) as any[];
      for (const shot of screenshots) {
        try { await unlink(join(process.cwd(), 'public', shot.file_path)); } catch(e){}
      }
    }

    db.prepare('DELETE FROM apps WHERE id = ?').run(id);
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

    const iconSmall = formData.get('iconSmall') as any;
    const iconLarge = formData.get('iconLarge') as any;

    let updateQuery = `UPDATE apps SET name = ?, short_description = ?, long_description = ?, store_url = ?, contact_email = ?, privacy_url = ?, website_url = ?`;
    let params: any[] = [name, short_description, long_description, store_url, contact_email, privacy_url, website_url];

    if (iconSmall && iconSmall.size > 0 && typeof iconSmall.arrayBuffer === 'function') {
      const bytes = await iconSmall.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-small-${iconSmall.name}`;
      const path = join(process.cwd(), 'public', 'uploads', 'icons', filename);
      await writeFile(path, buffer);
      updateQuery += `, icon_small_path = ?`;
      params.push(`/uploads/icons/${filename}`);
    }

    if (iconLarge && iconLarge.size > 0 && typeof iconLarge.arrayBuffer === 'function') {
      const bytes = await iconLarge.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-large-${iconLarge.name}`;
      const path = join(process.cwd(), 'public', 'uploads', 'icons', filename);
      await writeFile(path, buffer);
      updateQuery += `, icon_large_path = ?`;
      params.push(`/uploads/icons/${filename}`);
    }

    updateQuery += ` WHERE id = ?`;
    params.push(id);

    db.prepare(updateQuery).run(...params);

    // Handle screenshots
    for (let i = 0; i < 8; i++) {
      const screenshot = formData.get(`screenshot_${i}`) as any;
      if (screenshot && screenshot.size > 0 && typeof screenshot.arrayBuffer === 'function') {
        const bytes = await screenshot.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-shot-${i}-${screenshot.name}`;
        const path = join(process.cwd(), 'public', 'uploads', 'screenshots', filename);
        await writeFile(path, buffer);
        const screenshotPath = `/uploads/screenshots/${filename}`;
        
        db.prepare('INSERT INTO app_screenshots (app_id, file_path) VALUES (?, ?)').run(id, screenshotPath);
      }
    }

    snapshotListing(id);

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

export type AppStatus = 'draft' | 'pending_review' | 'live' | 'removed' | 'rejected' | 'suspended' | 'closed';

const VALID_APP_STATUSES: AppStatus[] = ['draft', 'pending_review', 'live', 'removed', 'rejected', 'suspended', 'closed'];

export async function updateAppStatus(id: number, status: string): Promise<ActionResponse> {
  try {
    if (!VALID_APP_STATUSES.includes(status as AppStatus)) {
      return { error: `Invalid status. Allowed: ${VALID_APP_STATUSES.join(', ')}` };
    }
    db.prepare('UPDATE apps SET status = ? WHERE id = ?').run(status, id);
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
    const shot = db.prepare('SELECT file_path FROM app_screenshots WHERE id = ?').get(screenshotId) as any;
    if (shot && shot.file_path) {
      try {
        await unlink(join(process.cwd(), 'public', shot.file_path));
      } catch (e) {}
    }
    db.prepare('DELETE FROM app_screenshots WHERE id = ?').run(screenshotId);
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

// --- AI Generation ---

export type GenerateDescriptionsOptions = {
  keywordCount?: number;
  keywords?: string[];
};

export async function generateAppDescriptions(
  prompt: string,
  opts: GenerateDescriptionsOptions = {}
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { error: 'OPENROUTER_API_KEY is not configured in .env.local' };
  }

  const keywordCount = Math.max(1, Math.min(20, Math.floor(opts.keywordCount ?? 5)));
  const providedKeywords = (opts.keywords ?? [])
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 20);

  const keywordDirective = providedKeywords.length
    ? `MUST naturally integrate these user-supplied main keywords (verbatim, without stuffing): ${providedKeywords.map(k => `"${k}"`).join(', ')}. Use each at least once in the long description and, where it fits naturally, in the short description.`
    : `MUST select exactly ${keywordCount} high-intent, relevant main keywords for this app concept and integrate them naturally across both descriptions (no keyword stuffing, no repetition spam).`;

  const totalKeywordsLine = providedKeywords.length
    ? `Total main keywords to surface: ${providedKeywords.length} (the ones listed above).`
    : `Total main keywords to surface: exactly ${keywordCount}.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", // Optional for OpenRouter
        "X-Title": "App Manager Pro",           // Optional for OpenRouter
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001",
        "messages": [
          {
            "role": "system",
            "content": [
              "You are a senior App Store Optimization (ASO) copywriter specialized in Google Play listings.",
              "Every output you produce MUST comply 100% with the Google Play Developer Program Policies and Store Listing & Promotional Content policies, including (non-exhaustive):",
              "- No misleading claims, fake reviews/testimonials, fake badges, fake awards, or fabricated user counts.",
              "- No prohibited content: hate speech, harassment, sexual content, violence, illegal activities, dangerous products, regulated goods, financial misrepresentation, or medical claims.",
              "- No references to competitor apps, other stores, or third-party trademarks you do not own.",
              "- No ALL-CAPS promotional shouting, no emoji spam, no excessive punctuation, no repeated keywords (keyword stuffing is strictly forbidden).",
              "- No prices, sale/discount text, or calls-to-action that belong in the store metadata, not the description.",
              "- No personal data collection language that would contradict a real privacy policy.",
              "- Short description: max 80 characters, one clean sentence.",
              "- Long description: max 4000 characters, well-structured, readable, honest about functionality.",
              "Write in natural, user-focused English. Keywords must read organically — if removing a keyword breaks grammar, it is integrated correctly; if removing it barely changes meaning, it is stuffed.",
              "Return ONLY a valid JSON object, no markdown, no commentary."
            ].join('\n')
          },
          {
            "role": "user",
            "content": [
              `App concept: "${prompt}"`,
              '',
              'Keyword directive:',
              keywordDirective,
              totalKeywordsLine,
              '',
              'Produce:',
              '1. "short": A punchy, policy-compliant tagline (max 80 characters, no emojis, no ALL CAPS).',
              '2. "long": A detailed, policy-compliant Google Play description (<= 4000 chars) covering: what the app does, key features as a short bulleted or structured list, benefits, who it is for, and a soft closing line. No competitor names, no fake claims.',
              '3. "keywords": The array of main keywords you actually used (verbatim, in order of prominence).',
              '',
              'Format strictly as: {"short": "...", "long": "...", "keywords": ["..."]}'
            ].join('\n')
          }
        ],
        "response_format": { "type": "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

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
  opts: GenerateFieldOptions = {}
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { error: 'OPENROUTER_API_KEY is not configured in .env.local' };
  }

  const keywordCount = Math.max(1, Math.min(20, Math.floor(opts.keywordCount ?? 5)));
  const providedKeywords = (opts.keywords ?? [])
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 20);
  const current = (opts.current ?? '').trim();
  const mode: 'generate' | 'refine' = opts.mode ?? (current ? 'refine' : 'generate');
  const appName = (opts.appName ?? '').trim();

  const keywordDirective = providedKeywords.length
    ? `Integrate these exact main keywords naturally (no stuffing): ${providedKeywords.map(k => `"${k}"`).join(', ')}.`
    : `Target ${keywordCount} relevant main keywords for this app concept. Integrate them organically — no stuffing, no repetition spam.`;

  const targetRules = target === 'short'
    ? [
        'TARGET FIELD: Google Play "Short Description" (the single-line tagline shown under the app name).',
        'Hard limits: 1 sentence, MAX 80 CHARACTERS (including spaces). Count characters carefully.',
        'Style: clear value proposition, benefit-led, no emojis, no ALL CAPS, no exclamation spam, no competitor names.',
      ].join('\n')
    : [
        'TARGET FIELD: Google Play "Full Description" (the long marketing body shown on the listing page).',
        'Hard limits: MAX 4000 CHARACTERS total.',
        'Structure: a strong 1–2 sentence hook, a concise feature list (bulleted with "•" or "-"), a benefits/why-users-love-it section, a "who is this for" line, a soft closing CTA.',
        'Style: natural paragraphs, readable on mobile, no emoji spam, no ALL CAPS shouting, no competitor names, no fake stats.',
      ].join('\n');

  const userContent = mode === 'refine' && current
    ? [
        appName ? `App name: "${appName}"` : null,
        `App concept: "${prompt}"`,
        '',
        'Keyword directive:',
        keywordDirective,
        '',
        targetRules,
        '',
        'Refine and improve the following existing text. Fix policy issues, tighten wording, improve clarity and keyword integration, but stay faithful to the author\'s intent. Do NOT invent new features that aren\'t implied by the concept or existing text.',
        '',
        'EXISTING TEXT TO REFINE:',
        '"""',
        current,
        '"""',
        '',
        `Return ONLY: {"text": "..."}`,
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
        `Return ONLY: {"text": "..."}`,
      ].filter(Boolean).join('\n');

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "App Manager Pro",
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001",
        "messages": [
          {
            "role": "system",
            "content": [
              "You are a senior App Store Optimization (ASO) copywriter specialized in Google Play listings.",
              "Every output MUST comply 100% with Google Play Developer Program & Store Listing policies:",
              "- No misleading claims, fake reviews/ratings/awards/user counts.",
              "- No hate speech, harassment, sexual, violent, illegal, dangerous, or regulated-goods content.",
              "- No competitor app names, other app stores, or third-party trademarks you do not own.",
              "- No ALL-CAPS promotion, no emoji spam, no repeated keywords (keyword stuffing is forbidden).",
              "- No prices, discount text, or CTAs that belong in store metadata rather than the description.",
              "- Respect the target field's character limits strictly.",
              "Return ONLY a valid JSON object of the form {\"text\": \"...\"} — no markdown, no commentary."
            ].join('\n')
          },
          {
            "role": "user",
            "content": userContent,
          }
        ],
        "response_format": { "type": "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    const text = typeof parsed.text === 'string' ? parsed.text : '';

    // Hard-enforce client-side char ceilings as a safety net.
    const trimmed = target === 'short' ? text.slice(0, 80) : text.slice(0, 4000);

    return { success: true, data: { text: trimmed } };
  } catch (error) {
    console.error('AI Field Generation Error:', error);
    return { error: (error as Error).message };
  }
}

// =============================================================
// Shared Expenses (Charges) — Marwan / Abdsamad split tracking
// =============================================================

export type Payer = 'marwan' | 'abdsamad';
export type Currency = 'MAD' | 'USD';
export type PaymentStatus = 'paid' | 'pending';

const PAYERS: Payer[] = ['marwan', 'abdsamad'];
const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'pending'];

export async function getExchangeRate(): Promise<number> {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'usd_mad_rate'").get() as { value: string } | undefined;
  const parsed = row ? parseFloat(row.value) : 10;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export async function setExchangeRate(rate: number): Promise<ActionResponse> {
  try {
    if (!Number.isFinite(rate) || rate <= 0) {
      return { error: 'Rate must be a positive number.' };
    }
    db.prepare(`
      INSERT INTO settings (key, value) VALUES ('usd_mad_rate', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(rate));
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
    const expenseDate = (formData.get('expenseDate') as string) || new Date().toISOString().slice(0, 10);
    const paymentStatus = ((formData.get('paymentStatus') as string) || 'paid').toLowerCase() as PaymentStatus;

    if (!PAYERS.includes(payer)) {
      return { error: 'Payer must be marwan or abdsamad.' };
    }
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
      return { error: 'Amount must be a positive number.' };
    }
    if (currency !== 'MAD' && currency !== 'USD') {
      return { error: 'Currency must be MAD or USD.' };
    }
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return { error: 'Payment status must be paid or pending.' };
    }

    const rate = await getExchangeRate();
    const amount_mad = currency === 'MAD' ? amountRaw : amountRaw * rate;
    const amount_usd = currency === 'USD' ? amountRaw : amountRaw / rate;

    const result = db.prepare(`
      INSERT INTO expenses
        (payer, description, category, amount, currency, exchange_rate, amount_mad, amount_usd, expense_date, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(payer, description, category, amountRaw, currency, rate, amount_mad, amount_usd, expenseDate, paymentStatus);

    revalidatePath('/expenses');
    return { success: true, data: { id: Number(result.lastInsertRowid) } };
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
    db.prepare('UPDATE expenses SET payment_status = ? WHERE id = ?').run(status, id);
    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Error in setExpensePaymentStatus:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteExpense(id: number): Promise<ActionResponse> {
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteExpense:', error);
    return { error: (error as Error).message };
  }
}

export async function getExpenses() {
  return db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC').all();
}

export type PersonBucket = { mad: number; usd: number; count: number };

export type ExpenseSummary = {
  rate: number;

  /** Cash actually spent — counts toward settlement. */
  paidTotalMAD: number;
  paidTotalUSD: number;

  /** Commitments (kridi) — promised but not yet paid. Excluded from settlement. */
  pendingTotalMAD: number;
  pendingTotalUSD: number;

  perPerson: Record<Payer, {
    paid: PersonBucket;
    pending: PersonBucket;
    /** Fair share of total paid. */
    share: number;
    /** Paid - share. Positive = over-paid (should receive). Negative = owes. */
    balance: number;
  }>;

  /** Settlement is calculated from PAID amounts only. */
  whoOwes: Payer | null;
  whoReceives: Payer | null;
  settlementMAD: number;
  settlementUSD: number;
};

// =============================================================
// Companies
// =============================================================

/** Save multiple files from a FormData field name, return inserted rows. */
async function saveMultiDocs(
  formData: FormData,
  fieldName: string,
  companyId: number,
  docType: string,
  prefix: string,
) {
  const files = formData.getAll(fieldName) as any[];
  for (const file of files) {
    if (!file || typeof file === 'string' || !file.size) continue;
    const filePath = await saveUploadedFile(file, 'companies', prefix);
    if (filePath) {
      db.prepare(
        'INSERT INTO company_documents (company_id, file_path, file_name, doc_type) VALUES (?, ?, ?, ?)',
      ).run(companyId, filePath, file.name || fieldName, docType);
    }
  }
}

export async function getCompanies() {
  const companies = db.prepare(`
    SELECT companies.*, accounts.developer_name as account_name, accounts.type as account_type
    FROM companies
    LEFT JOIN accounts ON companies.linked_account_id = accounts.id
    ORDER BY companies.created_at DESC
  `).all() as any[];

  for (const co of companies) {
    const tableDocs = db.prepare(
      'SELECT * FROM company_documents WHERE company_id = ? ORDER BY created_at ASC',
    ).all(co.id) as any[];

    // One-time migration: pull legacy path-column files into company_documents
    const legacyMap: Array<{ path: string; name: string; type: string }> = [
      { path: co.id_front_path, name: 'ID Front', type: 'id_front' },
      { path: co.id_back_path,  name: 'ID Back',  type: 'id_back'  },
      { path: co.company_doc_path, name: 'Company Document', type: 'company_doc' },
    ];
    for (const { path, name, type } of legacyMap) {
      if (path && !tableDocs.some((d: any) => d.file_path === path)) {
        db.prepare(
          'INSERT INTO company_documents (company_id, file_path, file_name, doc_type) VALUES (?, ?, ?, ?)',
        ).run(co.id, path, name, type);
        tableDocs.push({ company_id: co.id, file_path: path, file_name: name, doc_type: type });
      }
    }

    co.documents = tableDocs;
  }
  return companies;
}

export async function addCompany(formData: FormData): Promise<ActionResponse> {
  try {
    await ensureDirs();
    const name    = formData.get('name')?.toString() || '';
    const ice     = formData.get('ice')?.toString() || '';
    const duns    = formData.get('duns')?.toString() || '';
    const ded     = formData.get('ded')?.toString() || '';
    const hasId   = formData.get('hasId') === '1' ? 1 : 0;
    const linkedAccountId = formData.get('linkedAccountId')?.toString() || null;
    const notes   = formData.get('notes')?.toString() || '';

    const result = db.prepare(`
      INSERT INTO companies (name, ice, duns, ded, has_id, linked_account_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, ice, duns, ded, hasId, linkedAccountId || null, notes);

    const companyId = Number(result.lastInsertRowid);
    await saveMultiDocs(formData, 'idFront',    companyId, 'id_front',    'id-front-');
    await saveMultiDocs(formData, 'idBack',     companyId, 'id_back',     'id-back-');
    await saveMultiDocs(formData, 'companyDoc', companyId, 'company_doc', 'doc-');
    await saveMultiDocs(formData, 'otherDoc',   companyId, 'other',       'other-');

    revalidatePath('/companies');
    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    console.error('Error in addCompany:', error);
    return { error: (error as Error).message };
  }
}

export async function updateCompany(id: number, formData: FormData): Promise<ActionResponse> {
  try {
    await ensureDirs();
    const name    = formData.get('name')?.toString() || '';
    const ice     = formData.get('ice')?.toString() || '';
    const duns    = formData.get('duns')?.toString() || '';
    const ded     = formData.get('ded')?.toString() || '';
    const hasId   = formData.get('hasId') === '1' ? 1 : 0;
    const linkedAccountId = formData.get('linkedAccountId')?.toString() || null;
    const notes   = formData.get('notes')?.toString() || '';
    const status  = formData.get('companyStatus')?.toString() || 'not_used';

    if (!db.prepare('SELECT id FROM companies WHERE id = ?').get(id)) {
      return { error: 'Company not found.' };
    }

    db.prepare(`
      UPDATE companies SET name=?, ice=?, duns=?, ded=?, has_id=?, linked_account_id=?, notes=?, status=?
      WHERE id=?
    `).run(name, ice, duns, ded, hasId, linkedAccountId || null, notes, status, id);

    // Append any new uploads — existing docs stay untouched
    await saveMultiDocs(formData, 'idFront',    id, 'id_front',    'id-front-');
    await saveMultiDocs(formData, 'idBack',     id, 'id_back',     'id-back-');
    await saveMultiDocs(formData, 'companyDoc', id, 'company_doc', 'doc-');
    await saveMultiDocs(formData, 'otherDoc',   id, 'other',       'other-');

    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error in updateCompany:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteCompanyDocument(docId: number): Promise<ActionResponse> {
  try {
    const doc = db.prepare('SELECT file_path FROM company_documents WHERE id = ?').get(docId) as any;
    if (doc?.file_path) {
      try { await unlink(join(process.cwd(), 'public', doc.file_path)); } catch {}
    }
    db.prepare('DELETE FROM company_documents WHERE id = ?').run(docId);
    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteCompanyDocument:', error);
    return { error: (error as Error).message };
  }
}

export async function linkCompanyToAccount(companyId: number, accountId: number): Promise<ActionResponse> {
  try {
    db.prepare('UPDATE companies SET linked_account_id = ? WHERE id = ?').run(accountId, companyId);
    revalidatePath('/companies');
    revalidatePath(`/accounts/${accountId}`);
    return { success: true };
  } catch (error) {
    console.error('Error in linkCompanyToAccount:', error);
    return { error: (error as Error).message };
  }
}

export async function addCompanyQuick(name: string, linkedAccountId: number): Promise<ActionResponse<{ id: number; name: string }>> {
  try {
    if (!name.trim()) return { error: 'Company name is required.' };
    const result = db.prepare(
      'INSERT INTO companies (name, linked_account_id) VALUES (?, ?)',
    ).run(name.trim(), linkedAccountId);
    revalidatePath('/companies');
    revalidatePath('/accounts');
    revalidatePath(`/accounts/${linkedAccountId}`);
    return { success: true, data: { id: Number(result.lastInsertRowid), name: name.trim() } };
  } catch (error) {
    console.error('Error in addCompanyQuick:', error);
    return { error: (error as Error).message };
  }
}

/** Create a company with just a name (no linked account yet). Used from account creation flow. */
export async function addCompanyName(name: string): Promise<ActionResponse<{ id: number; name: string }>> {
  try {
    if (!name.trim()) return { error: 'Company name is required.' };
    const result = db.prepare('INSERT INTO companies (name) VALUES (?)').run(name.trim());
    revalidatePath('/companies');
    revalidatePath('/accounts');
    return { success: true, data: { id: Number(result.lastInsertRowid), name: name.trim() } };
  } catch (error) {
    console.error('Error in addCompanyName:', error);
    return { error: (error as Error).message };
  }
}

export async function deleteCompany(id: number): Promise<ActionResponse> {
  try {
    const docs = db.prepare('SELECT file_path FROM company_documents WHERE company_id = ?').all(id) as any[];
    for (const doc of docs) {
      if (doc.file_path) try { await unlink(join(process.cwd(), 'public', doc.file_path)); } catch {}
    }
    db.prepare('DELETE FROM companies WHERE id = ?').run(id);
    revalidatePath('/companies');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteCompany:', error);
    return { error: (error as Error).message };
  }
}

export async function getExpenseSummary(): Promise<ExpenseSummary> {
  const rate = await getExchangeRate();
  const rows = db.prepare(
    'SELECT payer, amount_mad, amount_usd, payment_status FROM expenses'
  ).all() as Array<{
    payer: Payer;
    amount_mad: number;
    amount_usd: number;
    payment_status: PaymentStatus | null;
  }>;

  const empty = (): PersonBucket => ({ mad: 0, usd: 0, count: 0 });
  const buckets: Record<Payer, { paid: PersonBucket; pending: PersonBucket }> = {
    marwan:   { paid: empty(), pending: empty() },
    abdsamad: { paid: empty(), pending: empty() },
  };

  for (const r of rows) {
    const person = buckets[r.payer];
    if (!person) continue;
    const target = (r.payment_status === 'pending') ? person.pending : person.paid;
    target.mad   += r.amount_mad;
    target.usd   += r.amount_usd;
    target.count += 1;
  }

  const paidTotalMAD = buckets.marwan.paid.mad + buckets.abdsamad.paid.mad;
  const paidTotalUSD = buckets.marwan.paid.usd + buckets.abdsamad.paid.usd;
  const pendingTotalMAD = buckets.marwan.pending.mad + buckets.abdsamad.pending.mad;
  const pendingTotalUSD = buckets.marwan.pending.usd + buckets.abdsamad.pending.usd;
  const fairShareMAD = paidTotalMAD / 2;

  const marwanBalance   = buckets.marwan.paid.mad   - fairShareMAD;
  const abdsamadBalance = buckets.abdsamad.paid.mad - fairShareMAD;

  let whoOwes: Payer | null = null;
  let whoReceives: Payer | null = null;
  let settlementMAD = 0;

  if (Math.abs(marwanBalance) > 0.005) {
    if (marwanBalance > 0) {
      whoReceives = 'marwan';
      whoOwes = 'abdsamad';
      settlementMAD = marwanBalance;
    } else {
      whoReceives = 'abdsamad';
      whoOwes = 'marwan';
      settlementMAD = -marwanBalance;
    }
  }

  return {
    rate,
    paidTotalMAD,
    paidTotalUSD,
    pendingTotalMAD,
    pendingTotalUSD,
    perPerson: {
      marwan: {
        paid:    buckets.marwan.paid,
        pending: buckets.marwan.pending,
        share:   fairShareMAD,
        balance: marwanBalance,
      },
      abdsamad: {
        paid:    buckets.abdsamad.paid,
        pending: buckets.abdsamad.pending,
        share:   fairShareMAD,
        balance: abdsamadBalance,
      },
    },
    whoOwes,
    whoReceives,
    settlementMAD,
    settlementUSD: settlementMAD / rate,
  };
}

// ─── Tutorials ──────────────────────────────────────────────────────────────

export async function getTutorials() {
  return db.prepare('SELECT * FROM tutorials ORDER BY created_at DESC').all();
}

export async function addTutorial(formData: FormData): Promise<ActionResponse> {
  try {
    await ensureDirs();
    const title = formData.get('title')?.toString() || '';
    const description = formData.get('description')?.toString() || '';
    const type = formData.get('type')?.toString() || 'link';
    const category = formData.get('category')?.toString() || '';
    const url = formData.get('url')?.toString() || '';
    const file = formData.get('file') as any;

    let filePath = '';
    let fileName = '';
    if (type === 'upload' && file?.size) {
      filePath = await saveUploadedFile(file, 'tutorials');
      fileName = file.name || '';
    }

    db.prepare(`
      INSERT INTO tutorials (title, description, type, file_path, file_name, url, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, type, filePath, fileName, url, category);

    revalidatePath('/tutorials');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteTutorial(id: number): Promise<ActionResponse> {
  try {
    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(id) as any;
    if (tutorial?.file_path) {
      try {
        await unlink(join(process.cwd(), 'public', tutorial.file_path));
      } catch {}
    }
    db.prepare('DELETE FROM tutorials WHERE id = ?').run(id);
    revalidatePath('/tutorials');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ─── Missions ────────────────────────────────────────────────────────────────

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
  if (date) {
    return db.prepare(
      'SELECT * FROM missions WHERE due_date = ? ORDER BY priority DESC, created_at ASC'
    ).all(date) as Mission[];
  }
  return db.prepare(
    'SELECT * FROM missions ORDER BY due_date ASC, priority DESC, created_at ASC'
  ).all() as Mission[];
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

    db.prepare(`
      INSERT INTO missions (title, description, assigned_to, due_date, status, priority, created_by)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(title, description, assigned_to, due_date, priority, created_by);

    revalidatePath('/missions');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleMission(id: number): Promise<ActionResponse> {
  try {
    const mission = db.prepare('SELECT status FROM missions WHERE id = ?').get(id) as Mission | undefined;
    if (!mission) return { error: 'Mission not found.' };
    const next = mission.status === 'done' ? 'pending' : 'done';
    db.prepare('UPDATE missions SET status = ? WHERE id = ?').run(next, id);
    revalidatePath('/missions');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteMission(id: number): Promise<ActionResponse> {
  try {
    db.prepare('DELETE FROM missions WHERE id = ?').run(id);
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

    db.prepare(`
      UPDATE missions SET title=?, description=?, assigned_to=?, due_date=?, priority=? WHERE id=?
    `).run(title, description, assigned_to, due_date, priority, id);

    revalidatePath('/missions');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
