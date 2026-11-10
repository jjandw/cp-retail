import React from 'react';
import { navigationHref } from '@/lib/editable-settings';

export function NavigationAction({ navigation, recordId, children, className }: {
  navigation: Parameters<typeof navigationHref>[0];
  recordId?: string;
  datasourceId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const newTab = navigation.openIn === 'NEW_TAB';
  return <a className={className} href={navigationHref(navigation, { recordId })}
    target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined}>{children}</a>;
}
