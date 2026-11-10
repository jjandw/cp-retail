import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CloudAccount, CloudAuthForm, workspaceDestination } from './screens/CloudAccount';
import { getAuthState, subscribeAuth } from './lib/supabase-client';
import { workspacePaths } from './lib/routes.mjs';
import { WorkspaceIdentity } from './lib/user';
import type { WorkspaceUser } from './lib/user';

function Redirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return <main className="preview-entry" role="status">Opening CP Retail…</main>;
}

function SignedInWorkspace({ user, children }: { user: WorkspaceUser; children: React.ReactNode }) {
  const [queries] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 15000 } },
  }));
  useEffect(() => () => queries.clear(), [queries]);
  return <WorkspaceIdentity.Provider value={user}>
    <QueryClientProvider client={queries}>{children}</QueryClientProvider>
  </WorkspaceIdentity.Provider>;
}

export default function CloudApp({ path, landing, workspace }: {
  path: string;
  landing: React.ReactNode;
  workspace: React.ReactNode;
}) {
  const { session, recovery } = useSyncExternalStore(subscribeAuth, getAuthState);

  const authUser = session?.user;
  const user = authUser?.email ? {
    id: authUser.id,
    email: authUser.email,
    fullName: typeof authUser.user_metadata.full_name === 'string' ? authUser.user_metadata.full_name : '',
  } : null;

  if (path === '/' || path === '/welcome') {
    if (user) return <Redirect to="/workspace" />;
    return landing;
  }
  if (session === undefined) return <main className="preview-entry" role="status">Checking your session…</main>;
  if (workspacePaths.includes(path)) {
    const destination = path === '/pixso-preview' ? '/workspace' : path;
    if (!user) return <Redirect to={'/login?next=' + encodeURIComponent(destination + window.location.search)} />;
    return <SignedInWorkspace user={user} key={user.id}>{workspace}</SignedInWorkspace>;
  }
  if (path === '/account') return user ? <CloudAccount email={user.email} /> : <Redirect to="/login" />;
  if (path === '/login' || path === '/sign-up') {
    return user ? <Redirect to={workspaceDestination()} /> : <CloudAuthForm mode={path === '/login' ? 'login' : 'sign-up'} recovery={false} />;
  }
  if (path === '/reset-password') return <CloudAuthForm mode="reset-password" recovery={recovery && !!user} />;
  if (path === '/forgot-password') return <CloudAuthForm mode="forgot-password" recovery={false} />;
  return <Redirect to="/" />;
}
