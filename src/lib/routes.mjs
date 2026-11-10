const scenarioPaths = ['/old-home', '/item-details'];
const workspaceViews = new Set([
  'start', 'dashboard', 'profiles', 'upload', 'recommendations',
  'my-scenarios', 'my-decisions', 'test', 'login', 'scenarios', 'decisions',
]);
export const workspacePaths = ['/workspace', '/pixso-preview', '/my-decisions', ...scenarioPaths];
export const staticPaths = ['/welcome', ...workspacePaths, '/login', '/sign-up', '/forgot-password', '/reset-password', '/account'];

export function workspaceInitialView(path) {
  if (path === '/my-decisions') return 'my-decisions';
  if (scenarioPaths.includes(path)) return 'my-scenarios';
}

export function workspaceLocation({ pathname, search }) {
  const path = pathname.replace(/\/$/, '');
  const params = new URLSearchParams(search);
  const legacyView = workspaceInitialView(path);
  const recordId = legacyView === 'my-decisions' ? null : params.get('recordId') || null;
  if (recordId) return { view: 'my-scenarios', recordId };
  const requested = params.get('view');
  const view = legacyView ?? (workspaceViews.has(requested) ? requested : 'start');
  return { view, recordId: null };
}

export function workspaceHref(view, recordId = null) {
  const params = new URLSearchParams();
  if (view === 'my-scenarios' && recordId) params.set('recordId', recordId);
  else if (view !== 'start' && workspaceViews.has(view)) params.set('view', view);
  return params.size ? '/workspace?' + params : '/workspace';
}

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
