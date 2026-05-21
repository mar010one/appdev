// Force a real "save as" download from a cross-origin URL. The native
// <a download> attribute is ignored when href points at a different origin
// (e.g. Supabase storage), so browsers just navigate to the URL and display
// the image inline instead of downloading it. Fetching the asset as a Blob
// and creating an object-URL link works around that.
//
// On CORS failure (e.g. the bucket isn't configured with the right headers)
// we fall back to opening the URL in a new tab so the user can still save
// it manually with right-click → "Save As".
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}
