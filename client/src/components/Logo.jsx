import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <motion.span
        layout
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4b5c] to-[#ff5e99] shadow-lg shadow-red-900/30"
        whileHover={{ scale: 1.04 }}
      >
        <span className="relative block h-5 w-5">
          <span className="absolute inset-y-0 left-0 w-1 rounded-sm bg-black/35" />
          <span className="absolute inset-y-0 right-0 w-1 rounded-sm bg-black/35" />
          <span className="absolute left-1 right-1 top-1/2 h-1 -translate-y-1/2 rounded-sm bg-black/55" />
        </span>
      </motion.span>
      <span className="text-lg font-extrabold tracking-tight">
        <span className="bg-gradient-to-r from-[#ff4b5c] to-[#ff5e99] bg-clip-text text-transparent">Anime</span>
        <span className="text-white">Stream</span>
      </span>
    </Link>
  );
}
