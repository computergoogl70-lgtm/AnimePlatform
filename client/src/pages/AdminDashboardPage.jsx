import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell.jsx';
import { api } from '../lib/api.js';
import { VideoPlayer } from '../components/VideoPlayer.jsx';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'import', label: 'Import (Jikan)' },
  { id: 'anime', label: 'Anime' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'users', label: 'Users' },
  { id: 'banners', label: 'Banners' },
  { id: 'sections', label: 'Home sections' },
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
  const [consumetProvider, setConsumetProvider] = useState('Witanime');
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
      toast.success(`Imported ${data.anime.title}`);
      await loadAnime();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const createEpisode = async (e) => {
    e.preventDefault();
    if (!selectedAnime) {
      toast.error('Pick an anime');
      return;
    }
    try {
      await api.post(`/admin/anime/${selectedAnime}/episodes`, {
        ...episodeForm,
        videoUrl: episodeForm.streamUrl,
        streamSource: 'url',
      });
      toast.success('Episode created');
      setPreviewUrl('');
      setEpisodeForm((f) => ({ ...f, number: f.number + 1, title: '' }));
      await loadEpisodes(selectedAnime);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteEpisode = async (episodeId) => {
    if (!confirm('Delete this episode?')) return;
    try {
      await api.delete(`/admin/episodes/${episodeId}`);
      toast.success('Episode deleted');
      await loadEpisodes(selectedAnime);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const searchConsumet = async () => {
    if (!consumetQuery.trim()) return;
    setConsumetBusy(true);
    try {
      const { data } = await api.get('/admin/consumet/search', {
        params: { provider: consumetProvider, q: consumetQuery.trim() },
      });
      setConsumetResults(data.data || []);
    } catch (e) {
      toast.error(e.message);
      setConsumetResults([]);
    } finally {
      setConsumetBusy(false);
    }
  };

  const importConsumetEpisodes = async (consumetAnimeId) => {
    if (!selectedAnime) {
      toast.error('Select a catalog anime first (dropdown below)');
      return;
    }
    setConsumetBusy(true);
    try {
      const { data } = await api.post(`/admin/anime/${selectedAnime}/episodes/import-consumet`, {
        provider: consumetProvider,
        consumetAnimeId,
        season: episodeForm.season,
      });
      toast.success(`Imported ${data.created} episodes (${data.skipped?.length || 0} skipped as duplicates)`);
      await loadEpisodes(selectedAnime);
      await loadAnime();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setConsumetBusy(false);
    }
  };

  const deleteAnime = async (id) => {
    if (!confirm('Delete anime and episodes?')) return;
    try {
      await api.delete(`/admin/anime/${id}`);
      toast.success('Deleted');
      await loadAnime();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <AppShell showSidebar={false}>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
        <div>
          <h1 className="text-3xl font-black text-white">Admin dashboard</h1>
          <p className="text-sm text-zinc-500">Manage catalog, streams, homepage, and users.</p>
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
            <h2 className="text-lg font-bold text-white">Import from MyAnimeList (Jikan)</h2>
            <p className="text-sm text-zinc-500">Enter a numeric MAL ID (example: 16498 = Attack on Titan).</p>
            <div className="flex flex-wrap gap-3">
              <input
                value={malId}
                onChange={(e) => setMalId(e.target.value)}
                className="w-40 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <button type="button" onClick={importMal} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                Import metadata
              </button>
            </div>
          </div>
        )}

        {tab === 'anime' && (
          <div className="glass space-y-4 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">Anime catalog</h2>
              <button type="button" onClick={loadAnime} className="text-sm text-red-300 hover:text-red-200">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-zinc-300">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="py-2">Title</th>
                    <th className="py-2">MAL</th>
                    <th className="py-2">Rating</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {animeList.map((a) => (
                    <tr key={a._id} className="border-t border-white/5">
                      <td className="py-2 pr-4">{a.title}</td>
                      <td className="py-2">{a.malId || '—'}</td>
                      <td className="py-2">{a.rating?.toFixed?.(1) || '—'}</td>
                      <td className="py-2 text-right">
                        <button type="button" className="text-red-400 hover:text-red-300" onClick={() => deleteAnime(a._id)}>
                          Delete
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
              <h2 className="text-lg font-bold text-white">Target catalog anime</h2>
              <select
                value={selectedAnime}
                onChange={(e) => {
                  setSelectedAnime(e.target.value);
                  loadEpisodes(e.target.value).catch(() => {});
                }}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="">Select anime…</option>
                {animeList.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="glass space-y-4 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white">Import episodes via Consumet</h2>
              <p className="text-sm text-zinc-500">
                Pulls episode lists; stream is resolved when users watch. Prefer Witanime (Arabic - Recommended), AnimeSaturn, or AnimeUnity.
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
                  placeholder="Search on provider…"
                  className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                />
                <button
                  type="button"
                  disabled={consumetBusy}
                  onClick={searchConsumet}
                  className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  Search
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
                          <p className="text-xs text-zinc-500">{r.episodes ? `${r.episodes} episodes` : ''}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={consumetBusy || !selectedAnime}
                        onClick={() => importConsumetEpisodes(r.id)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40"
                      >
                        Import episodes
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedAnime && (
              <div className="glass rounded-2xl p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Episodes in catalog</h2>
                  <button
                    type="button"
                    onClick={() => loadEpisodes(selectedAnime)}
                    className="text-sm text-red-300 hover:text-red-200"
                  >
                    Refresh
                  </button>
                </div>
                {episodes.length === 0 ? (
                  <p className="text-sm text-zinc-500">No episodes yet.</p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
                    {episodes.map((ep) => (
                      <li
                        key={ep._id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2"
                      >
                        <span className="text-zinc-300">
                          S{ep.season} E{ep.number} — {ep.title || 'Untitled'}
                          {ep.streamSource === 'consumet' && (
                            <span className="ml-2 rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] uppercase text-amber-200">
                              consumet
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteEpisode(ep._id)}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={createEpisode} className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">Add one episode (manual URL)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                min={1}
                value={episodeForm.season}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, season: Number(e.target.value) }))}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="Season"
              />
              <input
                type="number"
                min={1}
                value={episodeForm.number}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, number: Number(e.target.value) }))}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="Number"
              />
            </div>
            <input
              value={episodeForm.title}
              onChange={(e) => setEpisodeForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="Episode title"
            />
            <textarea
              value={episodeForm.description}
              onChange={(e) => setEpisodeForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="Synopsis"
              rows={3}
            />
            <div className="flex gap-2">
              <input
                value={episodeForm.streamUrl}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, streamUrl: e.target.value, videoUrl: e.target.value }))}
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="Enter video, stream, or iframe/embed URL..."
                required
              />
              <button
                type="button"
                onClick={() => {
                  if (!episodeForm.streamUrl) {
                    toast.error('Enter a URL first');
                    return;
                  }
                  setPreviewUrl(episodeForm.streamUrl);
                  setPreviewType(episodeForm.sourceType);
                  toast.success('Loading preview player...');
                }}
                className="rounded-xl bg-zinc-800 px-4 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                Preview
              </button>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={episodeForm.sourceType}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, sourceType: e.target.value }))}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="auto">Auto Detect Source</option>
                <option value="mp4">Direct MP4 URL</option>
                <option value="m3u8">HLS / M3U8 Stream</option>
                <option value="embed">Embed / Iframe Link</option>
                <option value="iframe">Iframe Provider Link</option>
                <option value="external">External Page Redirect</option>
              </select>

              <input
                type="number"
                value={episodeForm.durationSeconds}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, durationSeconds: Number(e.target.value) }))}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="Duration (seconds)"
              />
            </div>

            {previewUrl && (
              <div className="space-y-2 rounded-xl bg-black/50 p-3 border border-white/5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Player Real-time Preview ({previewType === 'auto' ? 'Auto-detected' : previewType})</span>
                  <button
                    type="button"
                    onClick={() => setPreviewUrl('')}
                    className="text-red-400 hover:text-red-300"
                  >
                    Close
                  </button>
                </div>
                <VideoPlayer src={previewUrl} type={previewType} />
              </div>
            )}

            <button type="submit" className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] hover:bg-red-500">
              Save episode
            </button>
          </form>
          </motion.div>
        )}

        {tab === 'users' && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">Users</h2>
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {users.map((u) => (
                <li key={u._id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2">
                  <span>
                    {u.email} — <span className="text-zinc-500">{u.role}</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs text-red-300 hover:text-red-200"
                    onClick={async () => {
                      const next = u.role === 'admin' ? 'user' : 'admin';
                      await api.patch(`/admin/users/${u._id}`, { role: next });
                      toast.success('Role updated');
                      loadUsers();
                    }}
                  >
                    Toggle admin
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'banners' && (
          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">Hero banners</h2>
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
                toast.success('Banner added');
                e.target.reset();
                loadBanners();
              }}
            >
              <input name="title" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="Title" />
              <input
                name="imageUrl"
                required
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="Image URL"
              />
              <input name="order" type="number" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="Order" />
              <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                Add banner
              </button>
            </form>
            <ul className="space-y-2 text-sm text-zinc-400">
              {banners.map((b) => (
                <li key={b._id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{b.title || b.imageUrl}</span>
                  <button type="button" className="text-red-400" onClick={() => api.delete(`/admin/banners/${b._id}`).then(loadBanners)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'sections' && (
          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white">Homepage rows</h2>
            <p className="text-sm text-zinc-500">Rows pull live data for trending, ratings, recency, or a genre.</p>
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
                toast.success('Section saved');
                e.target.reset();
                loadSections();
              }}
            >
              <input name="key" required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="unique-key" />
              <input name="title" required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="Row title" />
              <select name="type" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white">
                <option value="trending">Trending</option>
                <option value="top_rated">Top rated</option>
                <option value="recent">Recently added</option>
                <option value="genre">Genre spotlight</option>
                <option value="custom">Custom IDs (advanced)</option>
              </select>
              <input name="genre" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="Genre (for genre type)" />
              <input name="order" type="number" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white" placeholder="Order" />
              <button type="submit" className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                Add section
              </button>
            </form>
            <ul className="space-y-2 text-sm text-zinc-400">
              {sections.map((s) => (
                <li key={s._id} className="flex items-center justify-between gap-2">
                  <span>
                    {s.title} ({s.type})
                  </span>
                  <button type="button" className="text-red-400" onClick={() => api.delete(`/admin/sections/${s._id}`).then(loadSections)}>
                    Remove
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
