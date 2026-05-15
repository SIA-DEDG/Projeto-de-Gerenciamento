import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _instance: SupabaseClient | null = null;

const handler: ProxyHandler<object> = {
  get(_target, prop: string) {
    if (!_instance) {
      _instance = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (_instance as any)[prop];
    return typeof value === 'function' ? value.bind(_instance) : value;
  },
};

export const supabase = new Proxy({}, handler) as SupabaseClient;
