import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from './Logo.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/search" className={linkClass}>
            Search
          </NavLink>
          {user && (
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="rounded-lg bg-gradient-to-r from-[#ff4b5c] to-[#e50914] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/30"
            >
              Logout
            </motion.button>
          ) : (
            <Link
              to="/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
