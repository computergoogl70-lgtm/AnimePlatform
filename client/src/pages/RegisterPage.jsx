import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ email, password, displayName });
      toast.success('تم إنشاء الحساب');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050508] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,75,92,0.18),transparent_55%)]" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <h1 className="text-center text-2xl font-black text-white">إنشاء حساب جديد</h1>
        <p className="mt-2 text-center text-sm text-zinc-500">انضم إلى انمي ستريم في ثوانٍ</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">الاسم</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
              placeholder="أستا"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">كلمة المرور</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
              placeholder="6 أحرف على الأقل"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#ff4b5c] to-[#e50914] py-3 text-sm font-bold text-white shadow-lg shadow-red-900/40 disabled:opacity-60"
          >
            {busy ? 'جارٍ الإنشاء…' : 'تسجيل'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-semibold text-red-400 hover:text-red-300">
            تسجيل الدخول
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
