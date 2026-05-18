import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '../components/AppShell.jsx';
import { AnimeCard, AnimeCardSkeleton } from '../components/AnimeCard.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function AnimeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [detail, r] = await Promise.all([
          api.get(`/anime/${id}`),
          api.get(`/anime/${id}/recommendations`),
        ]);
        if (!cancelled) {
          setData(detail.data);
          setRecs(r.data.data || []);
        }
      } catch (e) {
        toast.error(e.message);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const anime = data?.anime;
  const episodes = data?.episodes || [];
  const firstEp = episodes[0];

  const seasons = useMemo(() => {
    const s = new Set(episodes.map((e) => e.season || 1));
    return Array.from(s).sort((a, b) => a - b);
  }, [episodes]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Sign in to save favorites');
      navigate('/login');
      return;
    }
    try {
      if (data.isFavorite) {
        await api.delete(`/user/favorites/${id}`);
        setData((d) => ({ ...d, isFavorite: false }));
        toast.success('Removed from favorites');
      } else {
        await api.post(`/user/favorites/${id}`);
        setData((d) => ({ ...d, isFavorite: true }));
        toast.success('Saved to favorites');
      }
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <AppShell showSidebar={false}>
      {loading && (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 lg:px-8">
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-900" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {!loading && anime && (
        <div>
          <div className="relative h-[420px] w-full overflow-hidden md:h-[480px]">
            <img src={anime.bannerImage || anime.coverImage} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/80 to-black/40" />
            <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-10 lg:px-8">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-end">
                <img
                  src={anime.coverImage}
                  alt={anime.title}
                  className="w-40 shrink-0 rounded-xl border border-white/10 shadow-2xl shadow-black/60 md:w-52"
                />
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">Series</span>
                    {anime.genres?.map((g) => (
                      <span key={g} className="rounded-full border border-white/10 bg-black/40 px-3 py-0.5 text-xs text-zinc-300">
                        {g}
                      </span>
                    ))}
                  </div>
                  <h1 className="text-3xl font-black text-white md:text-5xl">{anime.title}</h1>
                  <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
                    {anime.rating > 0 && <span className="font-semibold text-amber-300">★ {anime.rating.toFixed(1)}</span>}
                    <span>{anime.year || '—'}</span>
                    <span>{anime.episodeCount || episodes.length} episodes</span>
                    <span>{anime.status}</span>
                  </div>
                  <p className="max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">{anime.description}</p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      disabled={!firstEp}
                      onClick={() => firstEp && navigate(`/watch/${id}/${firstEp._id}`)}
                      className="rounded-xl bg-gradient-to-r from-[#ff4b5c] to-[#e50914] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ▶ Watch
                    </button>
                    {anime.trailerUrl && (
                      <button
                        type="button"
                        onClick={() => setTrailerOpen(true)}
                        className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/10"
                      >
                        Trailer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleFavorite}
                      className={`rounded-xl border px-6 py-3 text-sm font-semibold ${
                        data.isFavorite ? 'border-red-500 bg-red-500/10 text-red-300' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      ♥ Favorite
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 lg:px-8">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Episodes</h2>
                <p className="text-sm text-zinc-500">
                  {seasons.length > 1 ? `Seasons: ${seasons.join(', ')}` : 'Season 1'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {episodes.map((ep) => (
                  <Link
                    key={ep._id}
                    to={`/watch/${id}/${ep._id}`}
                    className="glass group flex gap-3 rounded-xl p-3 transition hover:border-red-500/30"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600/20 text-sm font-bold text-red-300">
                      {ep.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white group-hover:text-red-200">{ep.title || `Episode ${ep.number}`}</p>
                      <p className="line-clamp-2 text-xs text-zinc-500">{ep.description || 'Watch now'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold text-white">Recommended</h2>
              <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-2">
                {recs.map((a, i) => (
                  <AnimeCard key={a._id} anime={a} index={i} />
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      <AnimatePresence>
        {trailerOpen && anime?.trailerUrl && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              layout
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-sm text-white hover:bg-black"
                onClick={() => setTrailerOpen(false)}
              >
                ✕
              </button>
              <div className="aspect-video w-full">
                <iframe title="Trailer" className="h-full w-full" src={anime.trailerUrl.replace('watch?v=', 'embed/')} allowFullScreen />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
