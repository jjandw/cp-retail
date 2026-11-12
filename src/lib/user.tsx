import { createContext, useContext } from 'react';

export type WorkspaceUser = { id: string; email: string; fullName: string };
export const demoUser: WorkspaceUser = { id: 'preview-user', email: 'demo@cp-retail.invalid', fullName: 'Demo manager' };
export const WorkspaceIdentity = createContext<WorkspaceUser | null>(null);

export function useCurrentUser() {
  return useContext(WorkspaceIdentity);
}
