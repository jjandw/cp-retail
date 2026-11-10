import { useState, useSyncExternalStore } from 'react';
import { useCurrentUser } from './user';
import { createDemoRow, getSnapshot, products, projectRow, subscribe, tables, updateDemoRow } from './demo-data';
import type { Row } from './demo-data';
import { matchesFilters } from './workspace-query';
import type { LinkedQuery, Mutation, Query } from './workspace-query';

function pages<T>(items: T[], total = items.length) {
  return { pages: [{ items, total }] };
}

export function useRecords({ from, select, enabled = true, where, orderBy, count = 100 }: Query) {
  const user = useCurrentUser();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const [pageCount, setPageCount] = useState(1);
  const query = (current: ReturnType<typeof getSnapshot>) => {
    const rows = enabled && user
      ? current[from].filter(row => row.fields[tables[from].owner] === user.email)
        .map(row => projectRow(current, row, select)).filter(row => matchesFilters(row.fields, where))
      : [];
    if (orderBy) rows.sort((a, b) => String(b.fields[orderBy] ?? '').localeCompare(String(a.fields[orderBy] ?? '')));
    const limit = pageCount * count;
    return { data: pages(rows.slice(0, limit), rows.length), hasNextPage: rows.length > limit, error: null };
  };
  return {
    ...query(snapshot), status: 'success', isFetching: false, isRefetching: false, isFetchingNextPage: false,
    refetch: async () => query(getSnapshot()),
    fetchNextPage: () => setPageCount(n => n + 1),
  };
}

export function useRecord({ from, select, recordId }: Query & { recordId: string }) {
  const user = useCurrentUser();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const query = (current: ReturnType<typeof getSnapshot>) => {
    const row = current[from].find(row => user && row.id === recordId && row.fields[tables[from].owner] === user.email);
    return { data: row ? projectRow(current, row, select) : null, error: null };
  };
  return { ...query(snapshot), status: 'success', isRefetching: false, refetch: async () => query(getSnapshot()) };
}

export function useLinkedRecords({ field, search = '', enabled = true }: LinkedQuery) {
  const user = useCurrentUser();
  const options = field === 'product' ? products : user ? [{ id: user.id, title: user.email }] : [];
  const items = enabled && user ? options.filter(item => item.title.toLowerCase().includes(search.toLowerCase())) : [];
  return { data: pages(items), status: 'success', hasNextPage: false };
}

function useMutation<T>(enabled: boolean, execute: (payload: T) => Promise<Row>, onSuccess?: () => void) {
  const [status, setStatus] = useState('idle');
  return {
    enabled, status,
    async mutateAsync(payload: T) {
      if (!enabled) throw Error('This action is unavailable in the independent preview.');
      setStatus('pending');
      try {
        const row = await execute(payload);
        setStatus('success');
        onSuccess?.();
        return row;
      } catch (error) {
        setStatus('error');
        throw error;
      }
    },
  };
}

export function useRecordCreate({ from, fields, onSuccess }: Mutation) {
  const user = useCurrentUser();
  return useMutation(!!user && from !== 'aiRequests', (values: Row['fields']) => createDemoRow(from, fields, values), onSuccess);
}

export function useRecordUpdate({ from, fields, onSuccess }: Mutation) {
  const user = useCurrentUser();
  return useMutation(!!user && from === 'decisions', (values: { recordId: string; fields: Row['fields'] }) =>
    updateDemoRow(from, values.recordId, fields, values.fields), onSuccess);
}
