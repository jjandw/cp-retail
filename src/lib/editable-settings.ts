import settings from '../studio-settings.json';

type Navigation = { destination: string; openIn?: string };
type Setting<T> = { name: string; label: string; initialValue: T };
type LinkOptions = { recordId?: string; datasourceId?: string };

export function useTextSetting({ name, initialValue }: Setting<string>) {
  const value = settings[name];
  return typeof value === 'string' ? value : initialValue;
}

export function useNavigationSetting({ name, initialValue }: Setting<Navigation>) {
  const value = settings[name];
  return value && typeof value === 'object' ? value : initialValue;
}

export function navigationHref(navigation: Navigation, { recordId }: LinkOptions = {}) {
  const url = new URL(navigation.destination, window.location.origin);
  if (url.origin !== window.location.origin) return '/';
  if (url.pathname === '/pixso-preview') url.pathname = '/workspace';
  if (recordId) url.searchParams.set('recordId', recordId);
  return url.pathname + url.search + url.hash;
}

export function useNavigation() {
  return (navigation: Navigation, options?: LinkOptions) => {
    const href = navigationHref(navigation, options);
    if (options?.recordId && new URL(href, window.location.origin).pathname === window.location.pathname) {
      window.history.replaceState(null, '', href);
    } else {
      window.location.assign(href);
    }
  };
}
