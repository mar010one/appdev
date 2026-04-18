'use client';

import { createClient } from './supabase/client';

const STORAGE_MAX_BYTES = 100 * 1024 * 1024;

async function uploadOne(file: File, bucket: string, prefix = ''): Promise<string> {
  if (file.size > STORAGE_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    const limitMb = (STORAGE_MAX_BYTES / 1024 / 1024).toFixed(0);
    throw new Error(
      `"${file.name}" is ${mb} MB — exceeds the ${limitMb} MB storage limit. ` +
      `Compress the file or raise the bucket file-size limit in your Supabase dashboard.`,
    );
  }

  const supabase = createClient();
  const safeName = String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${Date.now()}-${prefix}${safeName}`;
  const storagePath = `${bucket}/${filename}`;

  const { error } = await supabase.storage
    .from('uploads')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    const msg = error.message || String(error);
    if (msg.toLowerCase().includes('size') || msg.toLowerCase().includes('exceeded')) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(
        `Storage upload failed: "${file.name}" (${mb} MB) exceeds your Supabase bucket size limit. ` +
        `Raise it in Storage → Buckets → uploads → Edit.`,
      );
    }
    throw new Error(`Storage upload failed for "${file.name}": ${msg}`);
  }

  const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Scan a FormData in-place, upload every File to Supabase Storage directly
 * from the browser, and replace the File entry with its resulting public URL.
 * Goes around Vercel's 4.5 MB request-body limit — server actions then only
 * receive small URL strings.
 *
 * Preserves multi-valued fields (e.g. multiple `documents`) and non-file
 * entries untouched.
 */
export async function uploadFilesInForm(
  formData: FormData,
  fieldBuckets: Record<string, { bucket: string; prefix?: string }> = {},
  defaultBucket = 'uploads',
): Promise<void> {
  const originalEntries = [...formData.entries()];
  const fieldsWithFiles = new Set<string>();

  for (const [name, value] of originalEntries) {
    if (value instanceof File && value.size > 0) fieldsWithFiles.add(name);
  }

  for (const fieldName of fieldsWithFiles) {
    const values = formData.getAll(fieldName);
    formData.delete(fieldName);
    formData.delete(`${fieldName}__filename`);
    const cfg = fieldBuckets[fieldName];
    const bucket = cfg?.bucket ?? defaultBucket;
    const prefix = cfg?.prefix ?? '';

    for (const value of values) {
      if (value instanceof File && value.size > 0) {
        const url = await uploadOne(value, bucket, prefix);
        formData.append(fieldName, url);
        formData.append(`${fieldName}__filename`, value.name);
      } else {
        formData.append(fieldName, value as string);
        formData.append(`${fieldName}__filename`, '');
      }
    }
  }
}
