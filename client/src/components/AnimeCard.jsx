import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function parseMalId(anime, id) {
  if (anime?.malId != null) return Number(anime.malId);
  const m = String(id || '').match(/^ext-(\d+)$/);
  return m ? Number(m[1]) : null;
}

export function AnimeCard({ anime, index = 0, preview = false, onImportMal }) {
  if (!anime) return null;
  const id = anime._id || anime.id;
  const malId = parseMalId(anime, id);
  const isExternal = preview || String(id).startsWith('ext-');

  const cover = (
    <div className="relative aspect-[2/3] overflow-hidden">
      <img
        src={anime.coverImage || '/placeholder-anime.jpg'}
        alt={anime.title}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        onError={(e) => {
          e.currentTarget.src = 'https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png';
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      {anime.rating > 0 && (
        <span className="absolute left-2 top-2 rtl:right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-amber-300">
          ★ {Number(anime.rating).toFixed(1)}
        </span>
      )}
    </div>
  );

  const meta = (
    <div className="space-y-1 p-3">
      <p className="line-clamp-2 text-sm font-semibold text-white">{anime.title}</p>
      <p className="text-xs text-zinc-500">
        {anime.year || '—'} · {anime.genres?.slice(0, 2).join(', ') || 'Anime'}
      </p>
    </div>
  );

  const wrapClass =
    'group block overflow-hidden rounded-xl border border-white/5 bg-zinc-900/60 shadow-xl shadow-black/40';

  if (isExternal) {
    const malUrl = malId ? `https://myanimelist.net/anime/${malId}` : null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ delay: index * 0.03 }}
        className="relative w-44 shrink-0 sm:w-48 md:w-52 max-w-full"
      >
        <div className={`${wrapClass} flex flex-col`}>
          {cover}
          <div className="border-t border-white/10 p-2">
            {meta}
            <div className="mt-2 flex flex-col gap-1.5">
              {malUrl && (
                <a
                  href={malUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white/10 py-2 text-center text-xs font-semibold text-white hover:bg-white/20"
                >
                  فتح على MyAnimeList
                </a>
              )}
              {onImportMal && malId ? (
                <button
                  type="button"
                  onClick={() => onImportMal(malId)}
                  className="rounded-lg bg-gradient-to-r from-[#ff4b5c] to-[#e50914] py-2 text-center text-xs font-bold text-white shadow-md shadow-red-900/30 hover:opacity-95"
                >
                  إضافة إلى الكتالوج
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <span className="pointer-events-none absolute right-2 top-2 rtl:left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
          خارج الكتالوج
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.03 }}
      className="relative w-40 shrink-0 sm:w-44 md:w-48 max-w-full"
    >
      <Link to={`/anime/${id}`} className={wrapClass}>
        {cover}
        {meta}
      </Link>
    </motion.div>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="w-40 shrink-0 animate-pulse sm:w-44 md:w-48 max-w-full">
      <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900/80">
        <div className="aspect-[2/3] bg-zinc-800" />
        <div className="space-y-2 p-3">
          <div className="h-4 rounded bg-zinc-800" />
          <div className="h-3 w-2/3 rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
