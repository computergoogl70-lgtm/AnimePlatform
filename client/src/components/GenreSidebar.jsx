import { motion } from 'framer-motion';

const genres = ['All Genres', 'Action', 'Adventure', 'Comedy', 'Dark Fantasy', 'Fantasy', 'Mystery', 'Romance', 'Superhero', 'Thriller'];

export function GenreSidebar({ activeGenre, onGenre }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-white/5 bg-[#0a0b10] lg:flex">
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Categories</p>
        <nav className="mt-3 space-y-1">
          {genres.map((g) => {
            const active = activeGenre === g || (g === 'All Genres' && !activeGenre);
            return (
              <motion.button
                key={g}
                type="button"
                whileHover={{ x: 2 }}
                onClick={() => onGenre(g === 'All Genres' ? '' : g)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  active ? 'bg-gradient-to-r from-[#ff4b5c] to-[#e50914] text-white shadow-md shadow-red-900/30' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {g}
              </motion.button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
