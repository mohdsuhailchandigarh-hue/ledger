import { createClient } from '@supabase/supabase-js';

let instance: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!instance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        `Supabase client missing env variables. NEXT_PUBLIC_SUPABASE_URL: ${
          supabaseUrl ? 'exists' : 'missing'
        }, NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'exists' : 'missing'}`
      );
    }
    instance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return instance;
}

// Client-side Supabase client
// Wrapped in Proxy to defer createClient initialization until first use
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
