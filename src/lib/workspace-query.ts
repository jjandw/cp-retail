import type { Row, Table } from './demo-data';

export type Selection = Record<string, string>;
export type Filter = { field: string; op: 'is'; value: string } | { field: string; op: 'nonempty' };
export type Query = {
  from: Table;
  select: Selection;
  enabled?: boolean;
  count?: number;
  where?: Filter | Filter[];
  orderBy?: string;
};
export type Mutation = { from: Table; fields: Selection; onSuccess?: () => void };
export type LinkedQuery = {
  from: Table;
  select: Selection;
  field: string;
  search?: string;
  sortOrder?: string;
  count?: number;
  enabled?: boolean;
};

export const datasource = { define: <T,>(sources: T) => sources };
export const q = {
  select: (fields: Selection) => fields,
  and: (...filters: Filter[]) => filters,
  text: (field: string) => ({
    is: (value: string): Filter => ({ field, op: 'is', value }),
    isNotEmpty: (): Filter => ({ field, op: 'nonempty' }),
  }),
  desc: (field: string) => field,
};

export function filtersFor(where: Query['where']) {
  return where === undefined ? [] : [where].flat();
}

export function matchesFilters(fields: Row['fields'], where: Query['where']) {
  return filtersFor(where).every(filter =>
    filter.op === 'is' ? fields[filter.field] === filter.value : Boolean(fields[filter.field]));
}
