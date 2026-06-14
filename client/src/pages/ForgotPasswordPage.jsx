import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api.js';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);

  const request = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      toast.success(data.message);
      if (data.demoToken) {
        setToken(data.demoToken);
        toast('تم نسخ رمز إعادة التعيين التلقائي', { icon: '🔑' });
      }
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      toast.success(data.message);
      setStep(3);
    } catch (err) {
      toast.error(err.message);
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
        <h1 className="text-center text-2xl font-black text-white">إعادة تعيين كلمة المرور</h1>
        {step === 1 && (
          <form onSubmit={request} className="mt-8 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
              placeholder="you@example.com"
            />
            <button type="submit" className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500">
              إرسال رابط إعادة التعيين
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={reset} className="mt-8 space-y-4">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
              placeholder="رمز إعادة التعيين"
            />
            <input
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
              placeholder="كلمة المرور الجديدة"
            />
            <button type="submit" className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500">
              تحديث كلمة المرور
            </button>
          </form>
        )}
        {step === 3 && <p className="mt-6 text-center text-sm text-emerald-400">يمكنك تسجيل الدخول بكلمة المرور الجديدة.</p>}
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link to="/login" className="text-red-400 hover:text-red-300">
            العودة إلى تسجيل الدخول
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
