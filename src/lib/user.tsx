import { createContext, useContext } from 'react';

export const demoUser = { id: 'preview-user', email: 'demo@cp-retail.invalid', fullName: 'Demo manager' };
export const PreviewUser = createContext<typeof demoUser | null>(null);

export function useCurrentUser() {
  return useContext(PreviewUser);
}
