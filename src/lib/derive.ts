/**
 * Derive a default privacy-policy URL from a developer website.
 *
 * Shared by app creation (CreateAppModal) and by moving an app to a different
 * developer account (changeAppAccount), so an app's contact details are filled
 * the same way no matter how it got its account.
 */
export function deriveDefaultPrivacyUrl(website?: string | null): string {
  if (!website) return '';
  try {
    const u = new URL(website);
    // Host root + /privacy
    return `${u.protocol}//${u.host}/privacy`;
  } catch {
    // Fallback: append the path if the user typed a bare domain
    const trimmed = website.replace(/\/+$/, '');
    return `${trimmed}/privacy`;
  }
}
