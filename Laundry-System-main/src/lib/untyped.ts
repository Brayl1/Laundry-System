import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * The same client without table typing. Used for the tables and functions added in
 * 20261101000000_advanced_features.sql so the app compiles before `npm run db:types` is re-run.
 * Each feature maps rows into its own interfaces, so nothing untyped leaks past its api.ts.
 */
export const db = supabase as unknown as SupabaseClient
