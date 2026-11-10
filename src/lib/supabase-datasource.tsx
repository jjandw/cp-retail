import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Row, Table } from './demo-data';
import { useCurrentUser } from './user';
import type { WorkspaceUser } from './user';
import { advisorEnabled, supabase } from './supabase-client';
import { columnFor, projectWorkspaceRow, selectColumns, tableNames, workspaceWrite } from './workspace-fields';
import type { DatabaseRow } from './workspace-fields';
import { filtersFor } from './workspace-query';
import type { LinkedQuery, Mutation, Query } from './workspace-query';

const prefix = (owner: string, from: Table) => ['workspace', owner, from];

export function useRecords({ from, select, enabled = true, where, orderBy, count = 100 }: Query) {
  const user = useCurrentUser();
  return useInfiniteQuery({
    queryKey: [...prefix(user?.id ?? '', from), 'list', select, where, orderBy, count],
    enabled: enabled && !!user,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const filters = filtersFor(where);
      if (filters.some(filter => filter.field === 'owner' && filter.op === 'is' && filter.value !== user!.email)) {
        return { items: [], total: 0 };
      }
      let request = supabase!.from(tableNames[from]).select(selectColumns(from, select), { count: 'exact' })
        .eq('owner_id', user!.id);
      for (const filter of filters) {
        if (filter.field === 'owner') continue;
        const column = columnFor(from, select[filter.field]);
        request = filter.op === 'is' ? request.eq(column, filter.value) : request.not(column, 'is', null).neq(column, '');
      }
      const orderColumn = orderBy ? columnFor(from, select[orderBy]) : 'created_at';
      const result = await request.order(orderColumn, { ascending: false }).order('id')
        .range(pageParam, pageParam + count - 1).abortSignal(signal);
      if (result.error) throw Error(result.error.message);
      return {
        items: (result.data as unknown as DatabaseRow[]).map(row => projectWorkspaceRow(from, row, select, user!)),
        total: result.count ?? result.data.length,
      };
    },
    getNextPageParam: (page, _pages, start) => {
      const next = start + page.items.length;
      return page.items.length && next < page.total ? next : undefined;
    },
  });
}

export function useRecord({ from, select, recordId }: Query & { recordId: string }) {
  const user = useCurrentUser();
  return useQuery({
    queryKey: [...prefix(user?.id ?? '', from), 'record', recordId, select],
    enabled: !!user && !!recordId,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase!.from(tableNames[from])
        .select(selectColumns(from, select)).eq('owner_id', user!.id).eq('id', recordId).abortSignal(signal).maybeSingle();
      if (error) throw Error(error.message);
      return data ? projectWorkspaceRow(from, data as unknown as DatabaseRow, select, user!) : null;
    },
  });
}

export function useLinkedRecords({ field, search = '', enabled = true, count = 1000 }: LinkedQuery) {
  const user = useCurrentUser();
  const catalog = useQuery({
    queryKey: ['workspace', user?.id, 'products', search, count],
    enabled: enabled && !!user && field === 'product',
    queryFn: async ({ signal }) => {
      let request = supabase!.from('products').select('id,title', { count: 'exact' }).order('title').limit(count);
      if (search) request = request.ilike('title', '%' + search + '%');
      const { data, error, count: total } = await request.abortSignal(signal);
      if (error) throw Error(error.message);
      return { pages: [{ items: data, total: total ?? data.length }] };
    },
  });
  if (field === 'product') {
    const page = catalog.data?.pages[0];
    return { ...catalog, hasNextPage: !!page && page.total > page.items.length };
  }
  const items = enabled && user && user.email.toLowerCase().includes(search.toLowerCase())
    ? [{ id: user.id, title: user.email }]
    : [];
  return { data: { pages: [{ items, total: items.length }] }, status: 'success', hasNextPage: false };
}

function useWorkspaceMutation<T>(from: Table, enabled: boolean, write: (values: T, user: WorkspaceUser) => Promise<Row>, after?: () => void) {
  const user = useCurrentUser();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: T) => {
      if (!enabled || !user) throw Error('This action is unavailable.');
      return write(values, user);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: prefix(user!.id, from) });
      after?.();
    },
  });
  return { enabled: enabled && !!user, status: mutation.status, mutateAsync: mutation.mutateAsync };
}

export function useRecordCreate({ from, fields, onSuccess }: Mutation) {
  return useWorkspaceMutation(from, from !== 'aiRequests' || advisorEnabled, async (values: Row['fields'], user) => {
    const payload = workspaceWrite(from, fields, values);
    if (from === 'aiRequests') {
      const { data, error } = await supabase!.rpc('queue_advisor_review', {
        p_name: payload.name,
        p_source_id: payload.source_id,
        p_context: payload.context,
        p_fingerprint: payload.fingerprint,
      });
      if (error) throw Error(error.message);
      return { id: data, fields: values };
    }
    const { data, error } = await supabase!.from(tableNames[from])
      .insert({ ...payload, owner_id: user.id }).select('id').single();
    if (error?.code === '23505' && from === 'datasets' && payload.csv === 'demo:207') {
      const existing = await supabase!.from('datasets').select(selectColumns(from, fields))
        .eq('owner_id', user.id).eq('csv', 'demo:207').single();
      if (!existing.error) return projectWorkspaceRow(from, existing.data as unknown as DatabaseRow, fields, user);
    }
    if (error?.code === '23505' && from === 'decisions') throw Error('A decision already exists for this scenario.');
    if (error) throw Error(error.message);
    return { id: data.id, fields: values };
  }, onSuccess);
}

export function useRecordUpdate({ from, fields, onSuccess }: Mutation) {
  return useWorkspaceMutation(from, from === 'decisions', async ({ recordId, fields: values }: { recordId: string; fields: Row['fields'] }, user) => {
    const payload = workspaceWrite(from, fields, values);
    const { data, error } = await supabase!.from(tableNames[from])
      .update(payload).eq('owner_id', user.id).eq('id', recordId).select('id').single();
    if (error) throw Error(error.message);
    return { id: data.id, fields: values };
  }, onSuccess);
}
