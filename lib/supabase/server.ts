import { createClient } from '@supabase/supabase-js';

let instance: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!instance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        `Supabase Admin client missing env variables. NEXT_PUBLIC_SUPABASE_URL: ${
          supabaseUrl ? 'exists' : 'missing'
        }, SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'exists' : 'missing'}`
      );
    }
    instance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return instance;
}

const dummyInit = () => createClient('', '');

// Service role client — bypasses RLS, only use server-side
// Wrapped in Proxy to defer createClient initialization until first use
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
}) as unknown as ReturnType<typeof dummyInit>;
