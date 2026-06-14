import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={linkClass}>
            الرئيسية
          </NavLink>
          <NavLink to="/search" className={linkClass}>
            بحث
          </NavLink>
          {user && (
            <NavLink to="/profile" className={linkClass}>
              الملف الشخصي
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={linkClass}>
              لوحة التحكم
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-2">
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
              تسجيل الخروج
            </motion.button>
          ) : (
            <Link
              to="/login"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              دخول
            </Link>
          )}
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-2 text-zinc-400 hover:text-white md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="القائمة"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-1 overflow-hidden border-t border-white/5 bg-[#050508] px-4 pb-4 pt-2 md:hidden"
          >
            <NavLink to="/" onClick={() => setMobileOpen(false)} className={linkClass}>
              الرئيسية
            </NavLink>
            <NavLink to="/search" onClick={() => setMobileOpen(false)} className={linkClass}>
              بحث
            </NavLink>
            {user && (
              <NavLink to="/profile" onClick={() => setMobileOpen(false)} className={linkClass}>
                الملف الشخصي
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" onClick={() => setMobileOpen(false)} className={linkClass}>
                لوحة التحكم
              </NavLink>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
