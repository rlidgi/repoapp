import React, { useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { base44 } from '@/api/base44Client';
import { useSEO } from '@/seo/useSEO';

export default function Admin() {
  useSEO({
    title: 'Admin',
    description: 'Admin dashboard with user metrics for Piclumo.'
  });

  const { user } = useAuth();
  const ownerEmail = (import.meta.env.VITE_ADMIN_EMAIL && String(import.meta.env.VITE_ADMIN_EMAIL)) || 'yaronyaronlid@gmail.com';
  const [stats, setStats] = useState({ total: 0, last24h: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [galleryBackfilling, setGalleryBackfilling] = useState(false);
  const [galleryBackfillResult, setGalleryBackfillResult] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [deleteSrc, setDeleteSrc] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [assigningRand, setAssigningRand] = useState(false);
  const [assignResult, setAssignResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        // Ensure current user is recorded before fetching stats/list
        if (user) {
          try {
            await base44.users.upsert({ email: user.email, name: user.name });
          } catch (e) {
            // ignore upsert failure here; we'll still attempt to display existing data
          }
        }
        const [s, list] = await Promise.all([base44.users.stats(), base44.users.list({ limit: 100 })]);
        if (cancelled) return;
        setStats({ total: s.total || 0, last24h: s.last24h || 0 });
        setUsers(Array.isArray(list.users) ? list.users : []);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load admin data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    let intervalId;
    if (user && user.email && user.email.toLowerCase() === ownerEmail.toLowerCase()) {
      load();
      // Periodically refresh to pick up new registrations without manual sync
      intervalId = setInterval(() => {
        load();
      }, 30000);
    }
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  async function handleSync() {
    if (!user) return;
    setSyncing(true);
    setError('');
    try {
      await base44.users.upsert({ email: user.email, name: user.name });
      const [s, list] = await Promise.all([
        base44.users.stats(),
        base44.users.list({ limit: 100 })
      ]);
      setStats({ total: s.total || 0, last24h: s.last24h || 0 });
      setUsers(Array.isArray(list.users) ? list.users : []);
    } catch (e) {
      setError(e?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleBackfill() {
    if (!user) return;
    setBackfilling(true);
    setError('');
    setBackfillResult(null);
    try {
      const result = await base44.admin.backfillResolve({ limit: 200 });
      setBackfillResult(result);
      // Refresh lists after backfill
      const [s, list] = await Promise.all([
        base44.users.stats(),
        base44.users.list({ limit: 100 })
      ]);
      setStats({ total: s.total || 0, last24h: s.last24h || 0 });
      setUsers(Array.isArray(list.users) ? list.users : []);
    } catch (e) {
      setError(e?.message || 'Backfill failed');
    } finally {
      setBackfilling(false);
    }
  }

  async function handleDiagnostics() {
    if (!user) return;
    setDiagLoading(true);
    setError('');
    setDiagnostics(null);
    try {
      const r = await base44.admin.diagnostics();
      setDiagnostics(r);
    } catch (e) {
      setError(e?.message || 'Diagnostics failed');
    } finally {
      setDiagLoading(false);
    }
  }

  async function handleGalleryBackfill() {
    if (!user) return;
    setGalleryBackfilling(true);
    setError('');
    setGalleryBackfillResult(null);
    try {
      const r = await base44.galleryAdmin.backfill({ limit: 200 });
      setGalleryBackfillResult(r);
    } catch (e) {
      setError(e?.message || 'Gallery backfill failed');
    } finally {
      setGalleryBackfilling(false);
    }
  }

  async function handleSeedVotes() {
    if (!user) return;
    setSeeding(true);
    setError('');
    setSeedResult(null);
    try {
      const r = await base44.galleryAdmin.seedVotes({ min: 0, max: 50 });
      setSeedResult(r);
      // Trigger gallery refresh for clients
      try { window.dispatchEvent(new CustomEvent('gallery:refresh')); } catch {}
    } catch (e) {
      setError(e?.message || 'Seed votes failed');
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete() {
    if (!user || !deleteSrc) return;
    setDeleting(true);
    setError('');
    try {
      // Accept either the direct storage URL or a viewer URL with ?src=...
      let raw = deleteSrc.trim();
      try {
        const u = new URL(raw, window.location.origin);
        const maybeSrc = u.searchParams.get('src');
        if (maybeSrc) {
          raw = decodeURIComponent(maybeSrc);
        }
      } catch {
        // ignore parse errors, treat as raw URL
      }
      await base44.galleryAdmin.delete({ src: raw });
      setDeleteSrc('');
      try { window.dispatchEvent(new CustomEvent('gallery:refresh')); } catch {}
    } catch (e) {
      setError(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function handleAssignRand() {
    if (!user) return;
    setAssigningRand(true);
    setError('');
    setAssignResult(null);
    try {
      const r = await base44.galleryAdmin.assignRand();
      setAssignResult(r);
      try { window.dispatchEvent(new CustomEvent('gallery:refresh')); } catch {}
    } catch (e) {
      setError(e?.message || 'Assign rand failed');
    } finally {
      setAssigningRand(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-12">
          {/* Google Adsense exclusion for this page to avoid 'Low Value Content' */}
          <style>{`.adsbygoogle { display: none !important; }`}</style>
          <div className="p-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700">
            Please sign in to view the admin dashboard.
          </div>
        </div>
      </div>
    );
  }

  if (!user.email || user.email.toLowerCase() !== ownerEmail.toLowerCase()) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-12">
          {/* Google Adsense exclusion for this page */}
          <style>{`.adsbygoogle { display: none !important; }`}</style>
          <div className="p-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700">
            You are not authorized to view this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-12 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">User metrics and recent registrations.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {syncing ? 'Syncing…' : 'Sync my record now'}
          </button>
          <span className="text-xs text-slate-500">
            Use this if your account doesn’t appear in the list yet.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackfill}
            disabled={backfilling}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {backfilling ? 'Fixing…' : 'Fix links & archive to storage (scan 200)'}
          </button>
          {backfillResult ? (
            <span className="text-xs text-slate-500">
              Scanned {backfillResult.scanned} • Updated {backfillResult.updated}{' '}
              {typeof backfillResult.archived === 'number' ? `• Archived ${backfillResult.archived}` : ''}
            </span>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="font-semibold text-slate-900">Backend diagnostics</div>
          <div className="text-xs text-slate-500">Verify Firestore/Storage connectivity.</div>
          <button
            type="button"
            onClick={handleDiagnostics}
            disabled={diagLoading}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {diagLoading ? 'Checking…' : 'Check diagnostics'}
          </button>
          {diagnostics ? (
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(diagnostics, null, 2)}
            </pre>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="font-semibold text-slate-900">Gallery maintenance</div>
          <div className="text-xs text-slate-500">Register recent generated images into the community gallery.</div>
          <button
            type="button"
            onClick={handleGalleryBackfill}
            disabled={galleryBackfilling}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {galleryBackfilling ? 'Registering…' : 'Backfill from generated (scan 200)'}
          </button>
          {galleryBackfillResult ? (
            <span className="text-xs text-slate-500">Scanned {galleryBackfillResult.scanned} • Registered {galleryBackfillResult.created}</span>
          ) : null}
          <div className="pt-3" />
          <div className="text-xs text-slate-500">Seed random votes in range 0–50 for all gallery items.</div>
          <button
            type="button"
            onClick={handleSeedVotes}
            disabled={seeding}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {seeding ? 'Seeding…' : 'Seed votes (0–50)'}
          </button>
          {seedResult ? (
            <span className="text-xs text-slate-500">Updated {seedResult.updated} items</span>
          ) : null}
          <div className="pt-4" />
          <div className="text-xs text-slate-500 mb-1">Remove a specific gallery image by URL</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={deleteSrc}
              onChange={(e) => setDeleteSrc(e.target.value)}
              placeholder="Paste exact image URL"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || !deleteSrc.trim()}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </div>
          <div className="pt-4" />
          <div className="text-xs text-slate-500">Assign random keys to gallery docs missing them (for fair marquee selection).</div>
          <button
            type="button"
            onClick={handleAssignRand}
            disabled={assigningRand}
            className="mt-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {assigningRand ? 'Assigning…' : 'Assign random keys'}
          </button>
          {assignResult ? (
            <span className="ml-2 text-xs text-slate-500">Updated {assignResult.updated}</span>
          ) : null}
        </div>

        {error ? (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 break-all">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-slate-500 text-sm">Total Registered Users</div>
            <div className="text-3xl font-semibold text-slate-900 mt-2">
              {loading ? '—' : stats.total}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-slate-500 text-sm">New Users (Last 24h)</div>
            <div className="text-3xl font-semibold text-slate-900 mt-2">
              {loading ? '—' : stats.last24h}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="font-semibold text-slate-900">Recent Users</div>
            <div className="text-xs text-slate-500">Most recent 100 registrations</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">UID</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-6 py-4 text-slate-500" colSpan={5}>Loading…</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-slate-500" colSpan={5}>No users found.</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.uid} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-3">{u.email || '—'}</td>
                      <td className="px-6 py-3">{u.name || '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{u.uid}</td>
                      <td className="px-6 py-3">
                        {u.created_date ? new Date(u.created_date).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-3">
                        {u.last_login_date ? new Date(u.last_login_date).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


