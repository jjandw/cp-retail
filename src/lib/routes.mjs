export const workspacePaths = ['/workspace', '/pixso-preview', '/my-decisions'];
export const staticPaths = ['/welcome', ...workspacePaths, '/login', '/sign-up', '/forgot-password', '/reset-password', '/account'];

export function workspaceReturnPath(search, origin) {
  const next = new URLSearchParams(search).get('next');
  if (!next?.startsWith('/')) return '/workspace';
  try {
    const url = new URL(next, origin);
    const path = url.pathname.replace(/\/$/, '');
    if (url.origin === origin && workspacePaths.includes(path)) {
      return (path === '/pixso-preview' ? '/workspace' : path) + url.search;
    }
  } catch {
    // Fall back to the workspace when a saved sign-in link is malformed.
  }
  return '/workspace';
}
