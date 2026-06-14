import { motion, AnimatePresence } from 'framer-motion';

const genres = ['All Genres', 'Action', 'Adventure', 'Comedy', 'Dark Fantasy', 'Fantasy', 'Mystery', 'Romance', 'Superhero', 'Thriller'];

export function GenreSidebar({ activeGenre, onGenre, mobileOpen, onMobileToggle }) {
  const sidebar = (
    <aside className="w-56 shrink-0 flex-col border-l border-white/5 bg-[#0a0b10] lg:flex">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">التصنيفات</p>
          <button type="button" onClick={onMobileToggle} className="text-zinc-400 hover:text-white lg:hidden">
            ✕
          </button>
        </div>
        <nav className="mt-3 space-y-1">
          {genres.map((g) => {
            const active = activeGenre === g || (g === 'All Genres' && !activeGenre);
            return (
              <motion.button
                key={g}
                type="button"
                whileHover={{ x: 2 }}
                onClick={() => { onGenre(g === 'All Genres' ? '' : g); onMobileToggle?.(); }}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-right text-sm font-medium transition-colors ${
                  active ? 'bg-gradient-to-r from-[#ff4b5c] to-[#e50914] text-white shadow-md shadow-red-900/30' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {g === 'All Genres' ? 'الكل' : g}
              </motion.button>
            );
          })}
        </nav>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{sidebar}</div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed inset-y-0 right-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50" onClick={onMobileToggle} />
            <div className="relative h-full">{sidebar}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
