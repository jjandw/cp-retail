import React, { lazy, Suspense } from './i18n/react';
import { createRoot } from 'react-dom/client';
import { BrandLogo } from './components/brand-logo';
import { demoUser, WorkspaceIdentity } from './lib/user';
import { cloudEnabled } from './lib/supabase-client';
import { workspacePaths } from './lib/routes.mjs';
import './shell.css';
import { LanguageProvider, AccountPreferencesDialog, DisplayPreferences } from './i18n/language';

const Landing = lazy(() => import('./screens/Landing'));
const Workspace = lazy(() => import('./screens/Workspace'));
const CloudApp = lazy(() => import('./CloudApp'));
const path = window.location.pathname.replace(/\/$/, '') || '/';

function PreviewEntry({ account = false, missing = false }: { account?: boolean; missing?: boolean }) {
  return <main className="preview-entry">
    <div className="preview-entry-card">
      <a className="preview-brand" href="/"><BrandLogo /></a>
      <p className="preview-kicker">Independent preview</p>
      <h1>{account ? 'Account settings' : missing ? 'Page not found' : 'Try CP Retail'}</h1>
      {!account && <p>Use simulated transactions to try the full decision workflow.</p>}
      {account && <DisplayPreferences />}
      <div className="preview-actions">
        <a className="preview-primary" href="/workspace">{account ? 'Return to workspace' : 'Open demo workspace'}</a>
        <a href="/">Back to home</a>
      </div>
    </div>
  </main>;
}

function App() {
  const workspace = <Workspace />;
  if (cloudEnabled) return <CloudApp path={path} landing={<Landing />} workspace={workspace} />;
  if (path === '/' || path === '/welcome') return <Landing />;
  if (workspacePaths.includes(path)) {
    return <WorkspaceIdentity.Provider value={demoUser}>{workspace}</WorkspaceIdentity.Provider>;
  }
  return <PreviewEntry account={path === '/account'}
    missing={!['/login', '/sign-up', '/forgot-password', '/reset-password', '/account'].includes(path)} />;
}

createRoot(document.getElementById('root')!).render(
  <LanguageProvider><AccountPreferencesDialog /><Suspense fallback={<main className="preview-entry" role="status">Loading CP Retail…</main>}><App /></Suspense></LanguageProvider>,
);
