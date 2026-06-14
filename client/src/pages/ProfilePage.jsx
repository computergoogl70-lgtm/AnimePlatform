import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [continueList, setContinueList] = useState([]);
  const [form, setForm] = useState({ displayName: '', avatarUrl: '', autoPlayNext: true, preferredSubtitleLang: 'en' });

  useEffect(() => {
    if (!user) return;
    setForm({
      displayName: user.displayName || '',
      avatarUrl: user.avatarUrl || '',
      autoPlayNext: !!user.autoPlayNext,
      preferredSubtitleLang: user.preferredSubtitleLang || 'en',
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, f, c] = await Promise.all([
          api.get('/user/watch-history'),
          api.get('/user/favorites'),
          api.get('/user/continue-watching'),
        ]);
        if (!cancelled) {
          setHistory(h.data.data || []);
          setFavorites(f.data.data || []);
          setContinueList(c.data.data || []);
        }
      } catch {
        if (!cancelled) {
          setHistory([]);
          setFavorites([]);
          setContinueList([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = async () => {
    try {
      await api.patch('/user/me', form);
      await refreshUser();
      toast.success('تم تحديث الملف الشخصي');
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!user) return null;

  return (
    <AppShell showSidebar={false}>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 md:flex-row md:items-center">
          <img
            src={form.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(user.email)}
            alt=""
            className="h-28 w-28 rounded-2xl border border-white/10 bg-zinc-900 object-cover"
          />
          <div>
            <h1 className="text-3xl font-black text-white">{user.displayName || 'ملفك الشخصي'}</h1>
            <p className="text-sm text-zinc-500">{user.email}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-zinc-600">الدور: {user.role === 'admin' ? 'مسؤول' : 'مستخدم'}</p>
          </div>
        </motion.div>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">إعدادات الحساب</h2>
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">الاسم</label>
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
            />
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">رابط الصورة</label>
            <input
              value={form.avatarUrl}
              onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={form.autoPlayNext}
                onChange={(e) => setForm((f) => ({ ...f, autoPlayNext: e.target.checked }))}
              />
              تشغيل الحلقة التالية تلقائياً
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">الترجمة المفضلة</label>
            <select
              value={form.preferredSubtitleLang}
              onChange={(e) => setForm((f) => ({ ...f, preferredSubtitleLang: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="en">الإنجليزية</option>
              <option value="ja">اليابانية</option>
              <option value="ar">العربية</option>
            </select>
            <button
              type="button"
              onClick={save}
              className="w-full rounded-xl bg-gradient-to-r from-[#ff4b5c] to-[#e50914] py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30"
            >
              حفظ التغييرات
            </button>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white">متابعة المشاهدة</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {continueList.length === 0 && <li className="text-zinc-500">لا توجد حلقات قيد المشاهدة.</li>}
                {continueList.map((row) => (
                  <li key={row._id}>
                    <Link className="text-red-300 hover:text-red-200" to={`/watch/${row.animeId?._id}/${row.episodeId?._id}`}>
                      {row.animeId?.title} — ح {row.episodeId?.number}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white">المفضلة</h2>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {favorites.length === 0 && <li className="text-zinc-500">لا توجد مفضلة بعد.</li>}
                {favorites.map((a) => (
                  <li key={a._id}>
                    <Link className="hover:text-white" to={`/anime/${a._id}`}>
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white">سجل المشاهدة</h2>
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm text-zinc-400">
                {history.length === 0 && <li className="text-zinc-500">لا يوجد سجل بعد.</li>}
                {history.map((row) => (
                  <li key={row._id} className="flex justify-between gap-2">
                    <span className="truncate">{row.animeId?.title}</span>
                    <span className="shrink-0 text-xs text-zinc-600">{new Date(row.lastWatchedAt).toLocaleDateString('ar-SA')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
