import { Metadata } from 'next';
import { adminGetAllLedgersAction } from '@/lib/actions/admin.actions';
import { supabaseAdmin } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatDate(isoStr: string): string {
  const raw = isoStr?.slice(0, 10);
  if (!raw) return '—';
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return raw;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const metadata: Metadata = { title: 'Ledgers | Admin' };

export default async function AdminLedgersPage() {
  const { ledgers } = await adminGetAllLedgersAction();

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2rem)', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.75rem)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          All Ledgers
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          {ledgers.length} shared ledgers across the platform
        </p>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {ledgers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No ledgers found
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Party A', 'Party B', 'Created', 'Action'].map((h) => (
                      <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(ledgers as any[]).map((ledger, i) => (
                    <tr
                      key={ledger.id}
                      className="hover-bg-elevated"
                      style={{ borderBottom: i < ledgers.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    >
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                            {ledger.user_a?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ledger.user_a?.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{ledger.user_a?.username}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                            {ledger.user_b?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ledger.user_b?.name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{ledger.user_b?.username}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(ledger.created_at)}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <Link href={`/admin/ledgers/${ledger.id}`} className="btn btn-ghost btn-sm" style={{ gap: '0.25rem' }}>
                          View <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="mobile-list-view" style={{ display: 'flex', flexDirection: 'column' }}>
              {(ledgers as any[]).map((ledger, i) => (
                <div
                  key={ledger.id}
                  style={{
                    padding: '1.25rem',
                    borderBottom: i < ledgers.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                      {/* Party A */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '7px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {ledger.user_a?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ledger.user_a?.name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{ledger.user_a?.username}</p>
                        </div>
                      </div>
                      
                      {/* Connection indicator line */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                          <div style={{ width: '1px', height: '12px', background: 'var(--border-strong)', borderStyle: 'dashed' }} />
                        </div>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>connected with</span>
                      </div>

                      {/* Party B */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '7px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {ledger.user_b?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ledger.user_b?.name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>@{ledger.user_b?.username}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Joined {formatDate(ledger.created_at)}
                    </span>
                    <Link
                      href={`/admin/ledgers/${ledger.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{
                        height: '36px',
                        padding: '0 1rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        gap: '0.25rem',
                      }}
                    >
                      View Ledger <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        .desktop-table-view { display: none; }
        .mobile-list-view { display: flex; }
        @media (min-width: 769px) {
          .desktop-table-view { display: block; }
          .mobile-list-view { display: none !important; }
        }
      `}</style>
    </div>
  );
}
