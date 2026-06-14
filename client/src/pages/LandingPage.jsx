import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell.jsx';
import { AnimeCard, AnimeCardSkeleton } from '../components/AnimeCard.jsx';
import { api } from '../lib/api.js';

function SectionRow({ title, items }) {
  if (!items?.length) return null;
  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
        </div>
        <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-2">
          {items.map((a, i) => (
            <AnimeCard key={a._id} anime={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(true);
  const [home, setHome] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/home');
        if (!cancelled) setHome(data);
      } catch {
        if (!cancelled) setHome(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hero = useMemo(() => {
    const b = home?.banners?.[0];
    if (b?.animeId) return b.animeId;
    return home?.trending?.[0] || null;
  }, [home]);

  const onGenre = (g) => {
    setGenre(g);
    if (g) navigate(`/search?genre=${encodeURIComponent(g)}`);
    else navigate('/');
  };

  return (
    <AppShell genre={genre} onGenre={onGenre}>
      <div className="relative min-h-[70vh] overflow-hidden">
        {hero ? (
          <>
            <img
              src={hero.bannerImage || hero.coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l rtl:bg-gradient-to-r from-black via-black/80 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-red-950/40" />
        )}

        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 pt-24 lg:flex-row lg:items-end lg:px-8 lg:pb-24 lg:pt-32">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-red-400">مميز</p>
            <h1 className="text-4xl font-black leading-tight text-white drop-shadow-lg md:text-6xl">
              {hero?.title || 'شاهد العوالم التي تحبها'}
            </h1>
            <p className="max-w-xl text-sm text-zinc-300 md:text-base">
              {hero?.description?.slice(0, 220) || 'واجهة سينمائية داكنة مع حركات سلسة - صُممت لقوائم الأنمي الحديثة وروابط البث الخارجية.'}
              {hero?.description?.length > 220 ? '…' : ''}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => hero && navigate(`/anime/${hero._id}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b5c] to-[#e50914] px-6 py-3 text-sm font-bold text-white shadow-xl shadow-red-900/40"
              >
                ▶ شاهد الآن
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/search')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/10"
              >
                ℹ استكشف الكتالوج
              </motion.button>
            </div>
            {hero && (
              <div className="flex flex-wrap gap-3 text-xs text-zinc-300 md:text-sm">
                {hero.rating > 0 && (
                  <span className="rounded-lg bg-red-600/90 px-3 py-1 font-semibold text-white">★ {hero.rating.toFixed(1)}</span>
                )}
                <span>{hero.year || '—'}</span>
                <span>{hero.episodeCount ? `${hero.episodeCount} حلقة` : ''}</span>
                <span>{hero.genres?.slice(0, 3).join(' · ')}</span>
              </div>
            )}
          </motion.div>

          <div className="glass mx-auto mt-8 w-full max-w-md rounded-2xl p-4 lg:mt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">بحث سريع</p>
            <div className="mt-2 flex gap-2">
              <input
                placeholder="ابحث عن أنمي..."
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-red-500/40 focus:ring-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/search?q=${encodeURIComponent(e.currentTarget.value)}`);
                  }
                }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">اضغط Enter للبحث في الكتالوج.</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 lg:px-8">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {!loading && home?.continueWatching?.length > 0 && (
        <SectionRow title="متابعة المشاهدة" items={home.continueWatching.map((w) => w.animeId).filter(Boolean)} />
      )}

      {!loading && home?.sections?.map((s) => <SectionRow key={s._id} title={s.title} items={s.animes} />)}

      {!loading && !home?.sections?.length && (
        <>
          <SectionRow title="الأكثر مشاهدة" items={home?.trending} />
          <SectionRow title="الأعلى تقييماً" items={home?.topRated} />
          <SectionRow title="أُضيف مؤخراً" items={home?.recent} />
        </>
      )}

      {!loading && home?.popularGenres?.length > 0 && (
        <section className="py-10">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <h2 className="mb-4 text-xl font-bold text-white md:text-2xl">التصنيفات الشائعة</h2>
            <div className="flex flex-wrap gap-2">
              {home.popularGenres.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => navigate(`/search?genre=${encodeURIComponent(g.name)}`)}
                  className="rounded-full border border-white/10 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-200 hover:border-red-500/40 hover:text-white"
                >
                  {g.name}
                  <span className="mr-2 rtl:ml-2 text-xs text-zinc-500">{g.count}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
