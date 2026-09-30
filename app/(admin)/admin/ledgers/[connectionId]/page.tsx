import { supabaseAdmin } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';

type Params = Promise<{ connectionId: string }>;

export default async function AdminLedgerRedirectPage({ params }: { params: Params }) {
  const { connectionId } = await params;

  const { data: connection } = await supabaseAdmin
    .from('connections')
    .select('user_a_id')
    .eq('id', connectionId)
    .single();

  if (!connection) {
    notFound();
  }

  redirect(`/admin/users/${connection.user_a_id}/ledgers/${connectionId}`);
}
