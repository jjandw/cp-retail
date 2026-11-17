import React, { useEffect, useRef, useState } from '@/i18n/react';
import { LandingPage } from './Landing';
import { useTextSetting } from '@/lib/editable-settings';
import { supabase } from '@/lib/supabase-client';
import {
  defaultLandingCopy, landingDemoUrl, landingImageUrl, readLandingRole, readPublishedLanding, uploadLandingImage,
} from '@/lib/landing-content';
import type { LandingCopy, LandingRole, LandingVersion } from '@/lib/landing-content';

type Publication = Awaited<ReturnType<typeof readPublishedLanding>>;
type PublicationEvent = { generation: number; action: 'publish' | 'rollback'; created_at: string };
type Studio = { role: LandingRole; publication: Publication; versions: LandingVersion[]; history: PublicationEvent[] };

async function readStudio(role: LandingRole): Promise<Studio> {
  const [publication, versions, history] = await Promise.all([
    readPublishedLanding(),
    supabase!.from('landing_versions').select('*').order('updated_at', { ascending: false }),
    role === 'reviewer'
      ? supabase!.from('landing_publication_log').select('generation,action,created_at').order('generation', { ascending: false }).limit(8)
      : { data: [], error: null },
  ]);
  if (versions.error || history.error) throw Error('Could not load content versions.');
  return { role, publication, versions: versions.data as LandingVersion[], history: history.data as PublicationEvent[] };
}

async function draftAction(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase!.rpc(name, args).single();
  if (error) throw Error(error.message);
  return data as LandingVersion;
}

export default function LandingStudio({ userId }: { userId: string }) {
  const brand = useTextSetting({ name: 'retail-brand', label: 'Brand name', initialValue: 'CP Retail' });
  const [studio, setStudio] = useState<Studio | null>();
  const [selected, setSelected] = useState<LandingVersion | null>(null);
  const [copy, setCopy] = useState<LandingCopy>(defaultLandingCopy);
  const [baseGeneration, setBaseGeneration] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<{ copy: LandingCopy; image: string; reviewKey: string | null } | null>(null);
  const [reviewed, setReviewed] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(false);

  function openDraft(version: LandingVersion | null, publication: Publication) {
    setSelected(version);
    setCopy(version ?? publication.copy ?? defaultLandingCopy);
    setBaseGeneration(version?.base_generation ?? publication.generation);
    setReviewed(null);
    setDirty(false);
  }

  useEffect(() => {
    let current = true;
    readLandingRole().then(async role => {
      const initial = role ? await readStudio(role) : null;
      if (!current) return;
      setStudio(initial);
      if (initial) openDraft(null, initial.publication);
    }).catch(() => {
      if (current) {
        setStudio(null);
        setError('Could not load Content studio. Refresh to try again.');
      }
    });
    return () => { current = false; };
  }, [userId]);

  if (studio === undefined) return <main className="preview-entry" role="status">Loading Content studio…</main>;
  if (!studio) return <main className="preview-entry"><div className="preview-entry-card">
    <h1>Content studio</h1>
    <p role={error ? 'alert' : undefined}>{error || 'A content member role is required.'}</p>
    <a href="/account">Return to account settings</a>
  </div></main>;

  const { publication, role } = studio;
  const editable = !selected || (selected.author_id === userId && selected.status === 'draft');
  const reviewing = selected?.status === 'submitted' && selected.author_id !== userId && role === 'reviewer';
  const reviewKey = reviewing ? selected.id + ':' + selected.edit_revision : null;
  const currentBase = baseGeneration === publication.generation;

  function change(field: keyof LandingCopy, value: string | null) {
    setCopy(draft => ({ ...draft, [field]: value }));
    setDirty(true);
  }

  async function perform(action: () => Promise<void>) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not complete this action.');
    } finally {
      active.current = false;
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editable) return;
    await perform(async () => {
      const demoUrl = landingDemoUrl(copy.demo_url);
      if (!demoUrl) throw Error('Enter a site path such as /sign-up or a valid HTTPS link.');
      const saved = await draftAction('save_landing_draft', {
        p_id: selected?.id ?? null,
        p_edit_revision: selected?.edit_revision ?? 0,
        p_base_generation: baseGeneration,
        p_title: copy.title,
        p_summary: copy.summary,
        p_image_path: copy.image_path,
        p_image_alt: copy.image_alt,
        p_demo_label: copy.demo_label,
        p_demo_url: demoUrl,
      });
      openDraft(saved, publication);
      setNotice('Draft saved.');
      setStudio(await readStudio(role));
    });
  }

  async function changeSubmission(action: 'submit_landing_draft' | 'return_landing_draft') {
    if (!selected || dirty) return;
    await perform(async () => {
      const changed = await draftAction(action, { p_id: selected.id, p_edit_revision: selected.edit_revision });
      openDraft(changed, publication);
      setNotice(action === 'submit_landing_draft' ? 'Submitted for review.' : 'Returned to the author’s drafts.');
      setStudio(await readStudio(role));
      if (changed.author_id !== userId && changed.status === 'draft') openDraft(null, publication);
    });
  }

  async function changePublication(action: 'publish' | 'rollback') {
    if (action === 'publish' && (!selected || !reviewKey || reviewed !== reviewKey)) return;
    await perform(async () => {
      const args = action === 'publish' && selected
        ? { p_id: selected.id, p_edit_revision: selected.edit_revision, p_expected_generation: publication.generation }
        : { p_expected_generation: publication.generation };
      const { error: updateError } = await supabase!.rpc(
        action === 'publish' ? 'publish_landing_version' : 'rollback_landing_version', args,
      );
      if (updateError) throw Error(updateError.message);
      setNotice(action === 'publish' ? 'Homepage published.' : 'Previous homepage restored.');
      const refreshed = await readStudio(role);
      setStudio(refreshed);
      openDraft(null, refreshed.publication);
    });
  }

  if (preview) return <>
    <div className="content-preview-bar">
      <span>Homepage preview · {preview.reviewKey ? 'Submitted version' : 'Draft'}</span>
      <button type="button" onClick={() => {
        setReviewed(preview.reviewKey);
        setPreview(null);
      }}>Back to Content studio</button>
    </div>
    <LandingPage brand={brand} content={preview.copy} imageUrl={preview.image} preview />
  </>;

  return <main className="content-studio">
    <header className="content-studio-header">
      <div><p className="preview-kicker">CP Retail</p><h1>Content studio</h1></div>
      <a href="/account">Account settings</a>
    </header>
    <p>Role: {role === 'editor' ? 'Content editor' : 'Content reviewer'} · Published revision {publication.generation}</p>
    {notice && <p role="status">{notice}</p>}
    {error && <p className="account-error" role="alert">{error}</p>}
    <div className="content-studio-grid">
      <section className="content-studio-panel" aria-label="Content versions">
        <h2>Content versions</h2>
        <button type="button" disabled={busy || dirty} onClick={() => openDraft(null, publication)}>New draft from published</button>
        <ul>{studio.versions.map(version => <li key={version.id}>
          <button type="button" disabled={busy || dirty} aria-pressed={selected?.id === version.id}
            onClick={() => openDraft(version, publication)}>{version.title} · {version.status}</button>
        </li>)}</ul>
        {role === 'reviewer' && <>
          <h2>Publication history</h2>
          <ol>{studio.history.map(event => <li key={event.generation}>Revision {event.generation} · {event.action}</li>)}</ol>
          <button type="button" disabled={busy || dirty || publication.generation === 0}
            onClick={() => void changePublication('rollback')}>Restore previous homepage</button>
        </>}
      </section>
      <section className="content-studio-panel" aria-label="Homepage content">
        <h2>{selected ? 'Homepage version' : 'New homepage draft'}</h2>
        {!currentBase && <p role="status">The published homepage has changed. Start a new draft from the current version before submitting.</p>}
        <form onSubmit={save}>
          <fieldset disabled={busy || !editable}>
            <label>Homepage title<textarea value={copy.title} onChange={event => change('title', event.target.value)} maxLength={180} rows={2} required /></label>
            <label>Homepage introduction<textarea value={copy.summary} onChange={event => change('summary', event.target.value)} maxLength={600} rows={4} required /></label>
            <label>Promotional image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void perform(async () => {
                change('image_path', await uploadLandingImage(userId, file));
                setNotice('Image uploaded. Preview or save the draft.');
              });
            }}/></label>
            <p>{copy.image_path ? 'An uploaded image is selected.' : 'The bundled homepage image is selected.'}</p>
            {copy.image_path && <button type="button" onClick={() => {
              change('image_path', null);
              change('image_alt', defaultLandingCopy.image_alt);
            }}>Use bundled image</button>}
            <label>Image description<input value={copy.image_alt} onChange={event => change('image_alt', event.target.value)} maxLength={180} required /></label>
            <label>Demo link label<input value={copy.demo_label} onChange={event => change('demo_label', event.target.value)} maxLength={80} required /></label>
            <label>Demo link<input value={copy.demo_url} onChange={event => change('demo_url', event.target.value)} maxLength={2048} required /></label>
            {editable && <button type="submit" disabled={!selected && !currentBase}>Save draft</button>}
          </fieldset>
        </form>
        <div className="content-studio-actions">
          <button type="button" disabled={busy} onClick={() => void perform(async () => {
            setPreview({ copy, image: await landingImageUrl(copy.image_path), reviewKey });
          })}>Preview homepage</button>
          {dirty && <button type="button" disabled={busy} onClick={() => openDraft(selected, publication)}>Discard unsaved edits</button>}
          {selected?.status === 'draft' && editable && <button type="button" disabled={busy || dirty || !currentBase}
            onClick={() => void changeSubmission('submit_landing_draft')}>Submit for review</button>}
          {selected?.status === 'submitted' && (selected.author_id === userId || reviewing) && <button type="button" disabled={busy}
            onClick={() => void changeSubmission('return_landing_draft')}>{reviewing ? 'Return to author' : 'Withdraw submission'}</button>}
          {reviewing && <button type="button" disabled={busy || !currentBase || reviewed !== reviewKey}
            onClick={() => void changePublication('publish')}>Approve and publish</button>}
        </div>
      </section>
    </div>
  </main>;
}
