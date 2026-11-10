import { cloudEnabled } from './supabase-client';
import * as demo from './demo-datasource';
import * as hosted from './supabase-datasource';

export { datasource, q } from './workspace-query';

export const { useRecords, useRecord, useRecordCreate, useRecordUpdate, useLinkedRecords } =
  cloudEnabled ? hosted : demo;
