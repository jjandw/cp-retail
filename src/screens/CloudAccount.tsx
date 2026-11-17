import React, { useEffect, useState } from '@/i18n/react';
import { DisplayPreferences } from '@/i18n/language';
import { BrandLogo } from '@/components/brand-logo';
import { supabase } from '@/lib/supabase-client';
import { landingStudioPath, workspaceReturnPath } from '@/lib/routes.mjs';
import { readLandingRole } from '@/lib/landing-content';

type Mode = 'login' | 'sign-up' | 'forgot-password' | 'reset-password';
const titles: Record<Mode, string> = {
  login: 'Log in to CP Retail',
  'sign-up': 'Create your workspace',
  'forgot-password': 'Reset your password',
  'reset-password': 'Set a new password',
};

export function workspaceDestination() {
  return workspaceReturnPath(window.location.search, window.location.origin);
}

function AccountCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="preview-entry"><div className="preview-entry-card">
    <a className="preview-brand" href="/"><BrandLogo /></a>
    <p className="preview-kicker">Account</p>
    <h1>{title}</h1>
    {children}
  </div></main>;
}

export function CloudAccount({ email, fullName }: { email: string; fullName: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(fullName);
  const [savedName, setSavedName] = useState(fullName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const nameChanged = name.trim() !== savedName;
  const [canEditLanding, setCanEditLanding] = useState(false);
  useEffect(() => {
    let current = true;
    setCanEditLanding(false);
    readLandingRole().then(role => { if (current) setCanEditLanding(!!role); }).catch(() => {});
    return () => { current = false; };
  }, [email]);
  const saveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingName || !nameChanged) return;
    const submittedName = name.trim();
    setNameError('');
    setNameSaved(false);
    if (!submittedName || submittedName.length > 100) {
      setNameError('Enter a name between 1 and 100 characters.');
      return;
    }
    setSavingName(true);
    try {
      const result = await supabase!.auth.updateUser({ data: { full_name: submittedName } });
      if (result.error) throw result.error;
      setSavedName(submittedName);
      // Keep edits made while this request was saving; they still need another save.
      setName(current => current.trim() === submittedName ? submittedName : current);
      setNameSaved(true);
    } catch {
      setNameError('Could not update your name. Your changes are still here; please try again.');
    } finally {
      setSavingName(false);
    }
  };
  const logOut = async () => {
    setBusy(true);
    const { error } = await supabase!.auth.signOut({ scope: 'local' });
    if (error) {
      setError('Could not log out. Please try again.');
      setBusy(false);
      return;
    }
  };
  return <AccountCard title="Account settings">
    <p>Signed in as {email}</p>
    <form className="account-form" onSubmit={saveName}>
      <label>Name<input name="full-name" autoComplete="name" required maxLength={100}
        value={name} onChange={event => { setName(event.target.value); setNameError(''); }} /></label>
      {nameError && <p className="account-error" role="alert">{nameError}</p>}
      {nameChanged && !savingName && <p role="status">You have unsaved name changes.</p>}
      {nameSaved && !nameChanged && !savingName && <p role="status">Name updated.</p>}
      <button type="submit" disabled={busy || savingName || !nameChanged}>
        {savingName ? 'Saving name…' : 'Update name'}
      </button>
    </form>
    <DisplayPreferences />
    {error && <p className="account-error" role="alert">{error}</p>}
    <div className="preview-actions">
      <a className="preview-primary" href="/workspace">Return to workspace</a>
      {canEditLanding && <a href={landingStudioPath}>Content studio</a>}
      <button type="button" onClick={logOut} disabled={busy || savingName}>{busy ? 'Logging out…' : 'Log out'}</button>
    </div>
  </AccountCard>;
}

export function CloudAuthForm({ mode, recovery }: { mode: Mode; recovery: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reset = mode === 'reset-password';
  const forgot = mode === 'forgot-password';
  const signUp = mode === 'sign-up';
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') ?? '').trim().toLowerCase();
    const password = String(fields.get('password') ?? '');
    const auth = supabase!.auth;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (forgot) {
        const result = await auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' });
        if (result.error) throw result.error;
        setNotice('If an account uses that email, look for a password reset link.');
      } else if (reset && recovery) {
        const result = await auth.updateUser({ password });
        if (result.error) throw result.error;
        window.location.replace('/workspace');
      } else if (signUp) {
        const result = await auth.signUp({ email, password, options: {
          emailRedirectTo: window.location.origin + '/workspace',
        } });
        if (result.error) throw result.error;
        if (!result.data.session) setNotice('Check your email for a verification link. You can then log in.');
      } else if (mode === 'login') {
        const result = await auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The account service could not complete this request.');
    } finally {
      setBusy(false);
    }
  };

  return <AccountCard title={titles[mode]}>
    {reset && !recovery ? <p role="status">Open a password reset link from your email to continue.</p> :
      <form className="account-form" onSubmit={submit}>
        {!reset && <label>Email<input type="email" name="email" autoComplete="email" required /></label>}
        {!forgot && <label>{reset ? 'New password' : 'Password'}<input type="password" name="password"
          autoComplete={signUp || reset ? 'new-password' : 'current-password'}
          minLength={signUp || reset ? 8 : undefined} required /></label>}
        {error && <p className="account-error" role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button className="preview-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' :
          forgot ? 'Send reset link' : reset ? 'Save password' : signUp ? 'Create account' : 'Log in'}</button>
      </form>}
    <div className="preview-actions">
      {mode !== 'login' && <a href="/login">Log in</a>}
      {mode === 'login' && <a href="/sign-up">Create account</a>}
      {!forgot && <a href="/forgot-password">Reset password</a>}
      <a href="/">Back to home</a>
    </div>
  </AccountCard>;
}
