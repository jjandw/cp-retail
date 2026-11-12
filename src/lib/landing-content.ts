import { supabase } from './supabase-client';

export type LandingCopy = {
  title: string;
  summary: string;
  image_path: string | null;
  image_alt: string;
  demo_label: string;
  demo_url: string;
};

export type LandingVersion = LandingCopy & {
  id: string;
  author_id: string;
  status: 'draft' | 'submitted' | 'published';
  base_generation: number;
  edit_revision: number;
};

export type LandingRole = 'editor' | 'reviewer';

export const defaultLandingImage = '/studio-media/478a380e-df54-42c2-a1aa-116f4493ef46.jpeg';
export const defaultLandingCopy: LandingCopy = {
  title: 'Know who to win back.\nBefore you discount.',
  summary: 'See which customers are drifting away, check whether an offer pays for itself, and save the decision — in three steps.',
  image_path: null,
  image_alt: 'Convenience store',
  demo_label: 'Get started',
  demo_url: '/sign-up',
};

const mediaBucket = 'cp-retail-landing';
const imageTypes: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };

export function landingDemoUrl(value: string) {
  const url = value.trim();
  if (!url || url.length > 2048 || /[\s\\\u0000-\u001f\u007f]/u.test(url)) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (!/^https:\/\/[a-z0-9][a-z0-9.-]*(?::[0-9]{1,5})?(?:[/?#]|$)/i.test(url)) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && url.startsWith('https://') ? url : null;
  } catch {
    return null;
  }
}

export async function readLandingRole(): Promise<LandingRole | null> {
  const { data, error } = await supabase!.rpc('landing_member_role');
  if (error) throw Error(error.message);
  return data === 'editor' || data === 'reviewer' ? data : null;
}

export async function readPublishedLanding() {
  const { data, error } = await supabase!.rpc('get_published_landing').single();
  if (error) throw Error(error.message);
  const release = data as LandingCopy & { generation: number; version_id: string | null };
  return { generation: release.generation, versionId: release.version_id, copy: release.version_id ? release : null };
}

export async function landingImageUrl(path: string | null) {
  if (!path) return defaultLandingImage;
  const { data, error } = await supabase!.storage.from(mediaBucket).createSignedUrl(path, 900);
  if (error) throw Error('Could not load the selected image.');
  return data.signedUrl;
}

export async function uploadLandingImage(owner: string, file: File) {
  const extension = imageTypes[file.type];
  if (!extension || !file.size || file.size > 5 * 1024 * 1024) {
    throw Error('Choose a JPEG, PNG or WebP image up to 5 MB.');
  }
  const path = owner + '/' + crypto.randomUUID() + '.' + extension;
  const { error } = await supabase!.storage.from(mediaBucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw Error(error.message);
  return path;
}
