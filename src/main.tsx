import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { demoUser, WorkspaceIdentity } from './lib/user';
import { cloudEnabled } from './lib/supabase-client';
import { workspacePaths } from './lib/routes.mjs';
import './shell.css';

const Landing = lazy(() => import('./screens/Landing'));
const Workspace = lazy(() => import('./screens/Workspace'));
const CloudApp = lazy(() => import('./CloudApp'));
const path = window.location.pathname.replace(/\/$/, '') || '/';

function PreviewEntry({ account = false, missing = false }: { account?: boolean; missing?: boolean }) {
  return <main className="preview-entry">
    <div className="preview-entry-card">
      <a className="preview-brand" href="/"><img src="/cp-retail.svg" alt="" width="36" height="36" /> CP Retail</a>
      <p className="preview-kicker">Independent preview</p>
      <h1>{account ? 'Demo workspace account' : missing ? 'Page not found' : 'Try CP Retail'}</h1>
      <p>Explore the sample store, check an offer, and save a decision. Use sample or synthetic data.</p>
      <p>Records are saved in this browser. Shared accounts and cloud AI are pending migration.</p>
      <div className="preview-actions">
        <a className="preview-primary" href="/workspace">{account ? 'Return to workspace' : 'Open demo workspace'}</a>
        <a href="/">Back to home</a>
      </div>
    </div>
  </main>;
}

function App() {
  const workspace = <Workspace initialView={path === '/my-decisions' ? 'my-decisions' : undefined} />;
  if (cloudEnabled) return <CloudApp path={path} landing={<Landing />} workspace={workspace} />;
  if (path === '/' || path === '/welcome') return <Landing />;
  if (workspacePaths.includes(path)) {
    return <WorkspaceIdentity.Provider value={demoUser}>{workspace}</WorkspaceIdentity.Provider>;
  }
  return <PreviewEntry account={path === '/account'}
    missing={!['/login', '/sign-up', '/forgot-password', '/reset-password', '/account'].includes(path)} />;
}

createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<main className="preview-entry" role="status">Loading CP Retail…</main>}><App /></Suspense>,
);
