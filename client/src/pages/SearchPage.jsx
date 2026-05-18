import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell.jsx';
import { AnimeCard, AnimeCardSkeleton } from '../components/AnimeCard.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

const years = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i);

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const genre = params.get('genre') || '';
  const year = params.get('year') || '';
  const sort = params.get('sort') || '';
  const popularity = params.get('popularity') || '';

  const [localQ, setLocalQ] = useState(q);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [external, setExternal] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      const cur = next.get('q') || '';
      if (localQ === cur) return;
      if (localQ) next.set('q', localQ);
      else next.delete('q');
      setParams(next, { replace: true });
    }, 400);
    return () => clearTimeout(id);
  }, [localQ, setParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/anime/search', {
          params: {
            q,
            genre: genre || undefined,
            year: year || undefined,
            sort: sort || undefined,
            popularity: popularity || undefined,
            page,
            limit: 24,
          },
        });
        if (!cancelled) {
          setResults(data.data || []);
          setExternal(data.externalSuggestions || []);
        }
      } catch (e) {
        if (!cancelled) toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, genre, year, sort, popularity, page]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
  };

  const heading = useMemo(() => {
    if (q) return `Results for “${q}”`;
    if (genre) return `${genre} anime`;
    return 'Browse the catalog';
  }, [q, genre]);

  const handleImportMal = useCallback(
    async (malId) => {
      if (!isAdmin) {
        toast.error('Sign in as admin to import titles.');
        return;
      }
      try {
        const { data } = await api.post('/admin/anime/import-jikan', { malId });
        toast.success(`Imported: ${data.anime.title}`);
        navigate(`/anime/${data.anime._id}`);
      } catch (e) {
        toast.error(e.message);
      }
    },
    [isAdmin, navigate]
  );

  return (
    <AppShell showSidebar={false}>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h1 className="text-3xl font-black text-white md:text-4xl">{heading}</h1>
          <p className="text-sm text-zinc-500">Real-time search with MongoDB text indexes plus Jikan fallbacks.</p>
        </motion.div>

        <div className="glass flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Search</label>
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Titles, studios, vibes…"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
            />
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Genre</label>
              <select
                value={genre}
                onChange={(e) => update('genre', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"
              >
                <option value="">Any</option>
                {['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Thriller'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Year</label>
              <select
                value={year}
                onChange={(e) => update('year', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"
              >
                <option value="">Any</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sort</label>
              <select
                value={sort || (popularity === 'high' ? 'popularity' : '')}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'popularity') {
                    update('sort', '');
                    update('popularity', 'high');
                  } else {
                    update('popularity', '');
                    update('sort', v);
                  }
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"
              >
                <option value="">Newest</option>
                <option value="rating">Top rated</option>
                <option value="popularity">Popularity</option>
                <option value="year">Release year</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-6">
            {external.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-zinc-300">Live suggestions (Jikan)</h2>
                <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-2">
                  {external.map((a, i) => (
                    <AnimeCard
                      key={`ext-${a.malId || i}`}
                      anime={{ ...a, _id: `ext-${a.malId}` }}
                      index={i}
                      onImportMal={isAdmin ? handleImportMal : undefined}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-600">
                  These hits are from MyAnimeList (live lookup), not your database yet. Use <strong className="text-zinc-400">Open on MyAnimeList</strong> to see the listing, or{' '}
                  <strong className="text-zinc-400">Add to my catalog</strong> (admins only) to import metadata—then add episodes in Admin.
                </p>
              </section>
            )}

            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Catalog</h2>
              {results.length === 0 ? (
                <p className="text-sm text-zinc-500">No local results yet. Seed the database or import from MyAnimeList.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {results.map((a, i) => (
                    <AnimeCard key={a._id} anime={a} index={i} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
