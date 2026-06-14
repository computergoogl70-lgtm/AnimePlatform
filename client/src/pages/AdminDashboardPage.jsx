import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell.jsx';
import { api } from '../lib/api.js';
import { VideoPlayer } from '../components/VideoPlayer.jsx';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'import', label: 'استيراد (Jikan)' },
  { id: 'anime', label: 'الأنمي' },
  { id: 'episodes', label: 'الحلقات' },
  { id: 'users', label: 'المستخدمون' },
  { id: 'banners', label: 'اللافتات' },
  { id: 'sections', label: 'أقسام الرئيسية' },
];

export default function AdminDashboardPage() {
  const [tab, setTab] = useState('import');
  const [malId, setMalId] = useState('16498');
  const [animeList, setAnimeList] = useState([]);
  const [selectedAnime, setSelectedAnime] = useState('');
  const [episodeForm, setEpisodeForm] = useState({
    number: 1,
    season: 1,
    title: '',
    description: '',
    streamUrl: '',
    videoUrl: '',
    streamType: 'hls',
    sourceType: 'auto',
    durationSeconds: 600,
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('auto');
  const [users, setUsers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [sections, setSections] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [consumetProviders, setConsumetProviders] = useState([]);
  const [consumetProvider, setConsumetProvider] = useState('AnimeSaturn');
  const [consumetQuery, setConsumetQuery] = useState('');
  const [consumetResults, setConsumetResults] = useState([]);
  const [consumetBusy, setConsumetBusy] = useState(false);

  const loadAnime = async () => {
    const { data } = await api.get('/anime', { params: { limit: 50 } });
    setAnimeList(data.data || []);
  };

  const loadUsers = async () => {
    const { data } = await api.get('/admin/users');
    setUsers(data.data || []);
  };

  const loadBanners = async () => {
    const { data } = await api.get('/admin/banners');
    setBanners(data.data || []);
  };

  const loadSections = async () => {
    const { data } = await api.get('/admin/sections');
    setSections(data.data || []);
  };

  const loadEpisodes = async (animeId) => {
    if (!animeId) {
      setEpisodes([]);
      return;
    }
    const { data } = await api.get(`/admin/anime/${animeId}/episodes`);
    setEpisodes(data.data || []);
  };

  useEffect(() => {
    loadAnime().catch(() => {});
    api
      .get('/admin/consumet/providers')
      .then(({ data }) => setConsumetProviders(data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'episodes' && selectedAnime) {
      loadEpisodes(selectedAnime).catch((e) => toast.error(e.message));
    }
  }, [tab, selectedAnime]);

  useEffect(() => {
    if (tab === 'users') loadUsers().catch((e) => toast.error(e.message));
    if (tab === 'banners') loadBanners().catch((e) => toast.error(e.message));
    if (tab === 'sections') loadSections().catch((e) => toast.error(e.message));
  }, [tab]);

  const importMal = async () => {
    try {
      const { data } = await api.post('/admin/anime/import-jikan', { malId: Number(malId) });
      toast.success(`تم استيراد ${data.anime.title}`);
      await loadAnime();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const createEpisode = async (e) => {
    e.preventDefault();
    if (!selectedAnime) {
      toast.error('اختر أنمي');
      return;
    }
    try {
      await api.post(`/admin/anime/${selectedAnime}/episodes`, {
        ...episodeForm,
        videoUrl: episodeForm.streamUrl,
        streamSource: 'url',
      });
      toast.success('تم إنشاء الحلقة');
      setPreviewUrl('');
      setEpisodeForm((f) => ({ ...f, number: f.number + 1, title: '' }));
      await loadEpisodes(selectedAnime);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteEpisode = async (episodeId) => {
    if (!confirm('حذف هذه الحلقة؟')) return;
    try {
      await api.delete(`/admin/episodes/${episodeId}`);
      toast.success('تم حذف الحلقة');
      await loadEpisodes(selectedAnime);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const searchConsumet = async () => {
    if (!consumetQuery.trim()) return;
    setConsumetBusy(true);
    setConsumetResults([]);
    const loadingToast = toast.loading(`جارٍ البحث في ${consumetProvider} عن "${consumetQuery.trim()}"…`);
    try {
      const { data } = await api.get('/admin/consumet/search', {
        params: { provider: consumetProvider, q: consumetQuery.trim() },
        timeout: 30000,
      });
      const results = data.data || [];
      setConsumetResults(results);
      if (results.length === 0) {
        toast.error('لم يتم العثور على نتائج — جرب كتابة مختلفة.', { id: loadingToast });
      } else {
        toast.success(`تم العثور على ${results.length} نتيجة`, { id: loadingToast });
      }
    } catch (e) {
      toast.error(e.message || 'فشل البحث', { id: loadingToast });
      setConsumetResults([]);
    } finally {
      setConsumetBusy(false);
    }
  };

  const importConsumetEpisodes = async (consumetAnimeId) => {
    if (!selectedAnime) {
      toast.error('اختر أنمي من الكتالوج أولاً');
      return;
    }
    setConsumetBusy(true);
    try {
      const { data } = await api.post(`/admin/anime/${selectedAnime}/episodes/import-consumet`, {
        provider: consumetProvider,
        consumetAnimeId,
        season: episodeForm.season,
      });
      toast.success(`تم استيراد ${data.created} حلقة (تم تخطي ${data.skipped?.length || 0} مكررة)`);
      await loadEpisodes(selectedAnime);
      await loadAnime();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setConsumetBusy(false);
    }
  };

  const deleteAnime = async (id) => {
    if (!confirm('حذف الأنمي وجميع الحلقات؟')) return;
    try {
      await api.delete(`/admin/anime/${id}`);
      toast.success('تم الحذف');
      await loadAnime();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <AppShell showSidebar={false}>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
        <div>
          <h1 className="text-3xl font-black text-white">لوحة التحكم</h1>
          <p className="text-sm text-zinc-500">إدارة الكتالوج، البث، الصفحة الرئيسية، والمستخدمين.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === t.id ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'import' && (
          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">استيراد من MyAnimeList (Jikan)</h2>
            <p className="text-sm text-zinc-500">أدخل رقم MAL (مثال: 16498 = Attack on Titan).</p>
            <div className="flex flex-wrap gap-3">
              <input
                value={malId}
                onChange={(e) => setMalId(e.target.value)}
                className="w-40 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <button type="button" onClick={importMal} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                استيراد البيانات
              </button>
            </div>
          </div>
        )}

        {tab === 'anime' && (
          <div className="glass space-y-4 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">كتالوج الأنمي</h2>
              <button type="button" onClick={loadAnime} className="text-sm text-red-300 hover:text-red-200">
                تحديث
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-zinc-300">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2">العنوان</th>
                    <th className="py-2">MAL</th>
                    <th className="py-2">التقييم</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {animeList.map((a) => (
                    <tr key={a._id} className="border-t border-white/5">
                      <td className="py-2 pl-4">{a.title}</td>
                      <td className="py-2">{a.malId || '—'}</td>
                      <td className="py-2">{a.rating?.toFixed?.(1) || '—'}</td>
                      <td className="py-2 text-left">
                        <button type="button" className="text-red-400 hover:text-red-300" onClick={() => deleteAnime(a._id)}>
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'episodes' && (
          <motion.div className="space-y-6">
            <div className="glass space-y-4 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white">اختيار الأنمي المستهدف</h2>
              <select
                value={selectedAnime}
                onChange={(e) => {
                  setSelectedAnime(e.target.value);
                  loadEpisodes(e.target.value).catch(() => {});
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="">اختر أنمي…</option>
                {animeList.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="glass space-y-4 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white">استيراد حلقات عبر Consumet</h2>
              <p className="text-sm text-zinc-500">
                استيراد الحلقات من مزودي Consumet. يتم حل روابط البث عند المشاهدة.
              </p>
              <motion.div className="flex flex-wrap gap-3">
                <select
                  value={consumetProvider}
                  onChange={(e) => setConsumetProvider(e.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                >
                  {(consumetProviders.length ? consumetProviders : [{ id: 'AnimeSaturn', label: 'AnimeSaturn' }]).map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    )
                  )}
                </select>
                <input
                  value={consumetQuery}
                  onChange={(e) => setConsumetQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchConsumet())}
                  placeholder="ابحث في المزود…"
                  className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                />
                <button
                  type="button"
                  disabled={consumetBusy}
                  onClick={searchConsumet}
                  className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  {consumetBusy ? 'جارٍ البحث…' : 'بحث'}
                </button>
              </motion.div>
              {consumetResults.length > 0 && (
                <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                  {consumetResults.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/30 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {r.image && <img src={r.image} alt="" className="h-12 w-8 rounded object-cover" />}
                        <div>
                          <p className="font-semibold text-white">{r.title}</p>
                          <p className="text-xs text-zinc-500">{r.episodes ? `${r.episodes} حلقة` : ''}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={consumetBusy || !selectedAnime}
                        onClick={() => importConsumetEpisodes(r.id)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40"
                      >
                        استيراد الحلقات
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedAnime && (
              <div className="glass rounded-2xl p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">الحلقات في الكتالوج</h2>
                  <button
                    type="button"
                    onClick={() => loadEpisodes(selectedAnime)}
                    className="text-sm text-red-300 hover:text-red-200"
                  >
                    تحديث
                  </button>
                </div>
                {episodes.length === 0 ? (
                  <p className="text-sm text-zinc-500">لا توجد حلقات بعد.</p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                    {episodes.map((ep) => (
                      <li
                        key={ep._id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2"
                      >
                        <span className="text-zinc-300">
                          م{ep.season} ح{ep.number} — {ep.title || 'بدون عنوان'}
                          {ep.streamSource === 'consumet' && (
                            <span className="mr-2 rtl:ml-2 rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] uppercase text-amber-200">
                              consumet
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteEpisode(ep._id)}
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={createEpisode} className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">إضافة حلقة يدوياً</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                min={1}
                value={episodeForm.season}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, season: Number(e.target.value) }))}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="الموسم"
              />
              <input
                type="number"
                min={1}
                value={episodeForm.number}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, number: Number(e.target.value) }))}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="الرقم"
              />
            </div>
            <input
              value={episodeForm.title}
              onChange={(e) => setEpisodeForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="عنوان الحلقة"
            />
            <textarea
              value={episodeForm.description}
              onChange={(e) => setEpisodeForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="الوصف"
              rows={3}
            />
            <div className="flex gap-2">
              <input
                value={episodeForm.streamUrl}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, streamUrl: e.target.value, videoUrl: e.target.value }))}
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="أدخل رابط الفيديو أو البث..."
                required
              />
              <button
                type="button"
                onClick={() => {
                  if (!episodeForm.streamUrl) {
                    toast.error('أدخل رابطاً أولاً');
                    return;
                  }
                  setPreviewUrl(episodeForm.streamUrl);
                  setPreviewType(episodeForm.sourceType);
                  toast.success('جارٍ تحميل معاينة المشغل...');
                }}
                className="rounded-xl bg-zinc-800 px-4 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                معاينة
              </button>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={episodeForm.sourceType}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, sourceType: e.target.value }))}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="auto">كشف المصدر تلقائياً</option>
                <option value="mp4">رابط MP4 مباشر</option>
                <option value="m3u8">بث HLS / M3U8</option>
                <option value="embed">رابط تضمين / Iframe</option>
                <option value="iframe">رابط مزود Iframe</option>
                <option value="external">إعادة توجيه لصفحة خارجية</option>
              </select>

              <input
                type="number"
                value={episodeForm.durationSeconds}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, durationSeconds: Number(e.target.value) }))}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="المدة (بالثواني)"
              />
            </div>

            {previewUrl && (
              <div className="space-y-2 rounded-xl bg-black/50 p-3 border border-white/5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>معاينة المشغل ({previewType === 'auto' ? 'كشف تلقائي' : previewType})</span>
                  <button
                    type="button"
                    onClick={() => setPreviewUrl('')}
                    className="text-red-400 hover:text-red-300"
                  >
                    إغلاق
                  </button>
                </div>
                <VideoPlayer src={previewUrl} type={previewType} />
              </div>
            )}

            <button type="submit" className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] hover:bg-red-500">
              حفظ الحلقة
            </button>
          </form>
          </motion.div>
        )}

        {tab === 'users' && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">المستخدمون</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {users.map((u) => (
                <li key={u._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2">
                  <span>
                    {u.email} — <span className="text-zinc-500">{u.role === 'admin' ? 'مسؤول' : 'مستخدم'}</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-300 hover:text-red-200"
                    onClick={async () => {
                      const next = u.role === 'admin' ? 'user' : 'admin';
                      await api.patch(`/admin/users/${u._id}`, { role: next });
                      toast.success('تم تحديث الدور');
                      loadUsers();
                    }}
                  >
                    تبديل صلاحية المسؤول
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'banners' && (
          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">لافتات الصفحة الرئيسية</h2>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                await api.post('/admin/banners', {
                  imageUrl: fd.get('imageUrl'),
                  title: fd.get('title'),
                  order: Number(fd.get('order') || 0),
                  active: true,
                });
                toast.success('تمت إضافة اللافتة');
                e.target.reset();
                loadBanners();
              }}
            >
              <input name="title" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="العنوان" />
              <input
                name="imageUrl"
                required
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="رابط الصورة"
              />
              <input name="order" type="number" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="الترتيب" />
              <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                إضافة لافتة
              </button>
            </form>
            <ul className="space-y-2 text-sm text-zinc-400">
              {banners.map((b) => (
                <li key={b._id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{b.title || b.imageUrl}</span>
                  <button type="button" className="text-red-400" onClick={() => api.delete(`/admin/banners/${b._id}`).then(loadBanners)}>
                    إزالة
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'sections' && (
          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">أقسام الصفحة الرئيسية</h2>
            <p className="text-sm text-zinc-500">الأقسام تسحب البيانات مباشرة من التصنيفات والتقييمات.</p>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                await api.post('/admin/sections', {
                  key: fd.get('key'),
                  title: fd.get('title'),
                  type: fd.get('type'),
                  genre: fd.get('genre') || '',
                  order: Number(fd.get('order') || 0),
                  active: true,
                });
                toast.success('تم حفظ القسم');
                e.target.reset();
                loadSections();
              }}
            >
              <input name="key" required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="معرّف فريد" />
              <input name="title" required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="عنوان القسم" />
              <select name="type" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
                <option value="trending">الأكثر مشاهدة</option>
                <option value="top_rated">الأعلى تقييماً</option>
                <option value="recent">أُضيف مؤخراً</option>
                <option value="genre">تصنيف مميز</option>
                <option value="custom">معرّفات مخصصة</option>
              </select>
              <input name="genre" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="التصنيف (لنوع التصنيف)" />
              <input name="order" type="number" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="الترتيب" />
              <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                إضافة قسم
              </button>
            </form>
            <ul className="space-y-2 text-sm text-zinc-400">
              {sections.map((s) => (
                <li key={s._id} className="flex items-center justify-between gap-2">
                  <span>
                    {s.title} ({s.type})
                  </span>
                  <button type="button" className="text-red-400" onClick={() => api.delete(`/admin/sections/${s._id}`).then(loadSections)}>
                    إزالة
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
