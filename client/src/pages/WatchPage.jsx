import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '../components/AppShell.jsx';
import { VideoPlayer } from '../components/VideoPlayer.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function WatchPage() {
  const { animeId, episodeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [episode, setEpisode] = useState(null);
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [recs, setRecs] = useState([]);
  const [stream, setStream] = useState(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState('');
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const lastSave = useRef(0);

  const loadComments = useCallback(async () => {
    const { data } = await api.get(`/anime/${animeId}/comments`);
    setComments(data.data || []);
  }, [animeId]);

  const loadStream = useCallback(async () => {
    setStreamLoading(true);
    setStreamError('');
    setStream(null);
    try {
      const s = await api.get(`/episodes/${episodeId}/stream`);
      setStream(s.data);
    } catch (e) {
      setStreamError(e.message);
      toast.error(e.message);
    } finally {
      setStreamLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user) {
          navigate('/login', { state: { from: `/watch/${animeId}/${episodeId}` } });
          return;
        }
        setStreamLoading(true);
        setStreamError('');
        const [epRes, listRes, r] = await Promise.all([
          api.get(`/episodes/${episodeId}`),
          api.get(`/episodes/anime/${animeId}`),
          api.get(`/anime/${animeId}/recommendations`),
        ]);
        if (cancelled) return;
        setEpisode(epRes.data.episode);
        setAnime(epRes.data.anime);
        setEpisodes(listRes.data.data || []);
        setRecs(r.data.data || []);
        await loadStream();
        if (!cancelled) await loadComments();
      } catch (e) {
        if (!cancelled) {
          setStreamError(e.message);
          setStreamLoading(false);
          toast.error(e.message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [animeId, episodeId, user, navigate, loadComments, loadStream]);

  const index = useMemo(() => episodes.findIndex((e) => e._id === episodeId), [episodes, episodeId]);
  const prevEp = index > 0 ? episodes[index - 1] : null;
  const nextEp = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null;

  const sendProgress = async (t, dur) => {
    const now = Date.now();
    if (now - lastSave.current < 8000 && t / (dur || 1) < 0.92) return;
    lastSave.current = now;
    try {
      await api.post(`/episodes/${episodeId}/progress`, {
        progressSeconds: Math.floor(t),
        completed: dur > 0 && t / dur > 0.92,
      });
    } catch {
      /* ignore */
    }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/anime/${animeId}/comments`, { text: commentText, episodeId });
      setCommentText('');
      await loadComments();
      toast.success('Comment posted');
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!user) return null;

  return (
    <AppShell showSidebar={false}>
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            {streamLoading && (
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-zinc-950 ring-1 ring-white/10">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
              </div>
            )}
            {!streamLoading && streamError && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl bg-zinc-950 p-6 text-center ring-1 ring-white/10">
                <p className="text-sm text-red-300">{streamError}</p>
                <p className="max-w-md text-xs text-zinc-500">
                  Use <strong className="text-zinc-300">Witanime (Arabic - Recommended)</strong> when importing in Admin.
                  Delete bad episodes and re-import.
                </p>
                <button
                  type="button"
                  onClick={loadStream}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Retry stream
                </button>
              </div>
            )}
            {!streamLoading && stream?.url && !streamError && (
              <VideoPlayer
                key={`${episodeId}-${stream.url}`}
                src={stream.url}
                type={stream.type === 'mp4' ? 'mp4' : 'hls'}
                subtitles={stream.subtitles || []}
                poster={episode?.thumbnail || anime?.coverImage}
                onTime={sendProgress}
                onError={(msg) => setStreamError(msg)}
                onEnded={() => {
                  if (user?.autoPlayNext !== false && nextEp) {
                    navigate(`/watch/${animeId}/${nextEp._id}`);
                  }
                }}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                  Episode {episode?.number}
                  {episode?.season ? ` · Season ${episode.season}` : ''}
                </p>
                <h1 className="text-2xl font-bold text-white md:text-3xl">{episode?.title || 'Episode'}</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  {anime?.title} · {episode?.durationSeconds ? `${Math.round(episode.durationSeconds / 60)} min` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                ✕ Close
              </button>
            </div>

            <section className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white">Episode description</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{episode?.description || 'No synopsis for this episode.'}</p>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                disabled={!prevEp}
                onClick={() => prevEp && navigate(`/watch/${animeId}/${prevEp._id}`)}
                className="text-sm text-zinc-400 hover:text-white disabled:opacity-30"
              >
                ‹ Previous
              </button>
              <p className="text-sm text-zinc-500">
                {index + 1} / {episodes.length || '—'}
              </p>
              <button
                type="button"
                disabled={!nextEp}
                onClick={() => nextEp && navigate(`/watch/${animeId}/${nextEp._id}`)}
                className="rounded-xl bg-gradient-to-r from-[#ff4b5c] to-[#e50914] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/30 disabled:opacity-30"
              >
                Next ›
              </button>
            </div>

            <section>
              <h3 className="mb-3 text-lg font-bold text-white">Episode list</h3>
              <div className="scrollbar-thin flex flex-wrap gap-2">
                {episodes.map((ep) => (
                  <Link
                    key={ep._id}
                    to={`/watch/${animeId}/${ep._id}`}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      ep._id === episodeId ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    Ep {ep.number}
                  </Link>
                ))}
              </div>
            </section>

            <section className="glass rounded-2xl p-5">
              <h3 className="text-lg font-bold text-white">Discussion</h3>
              <div className="mt-4 space-y-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none ring-red-500/30 focus:ring-2"
                  placeholder="Share your thoughts…"
                />
                <button
                  type="button"
                  onClick={postComment}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Post comment
                </button>
              </div>
              <ul className="mt-6 space-y-4">
                {comments.map((c) => (
                  <li key={c._id} className="border-b border-white/5 pb-4 last:border-0">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-200">{c.userId?.displayName || 'User'}</span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">{c.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Related</h3>
              <ul className="mt-3 space-y-3">
                {recs.slice(0, 8).map((a) => (
                  <li key={a._id}>
                    <Link to={`/anime/${a._id}`} className="flex gap-3 rounded-lg p-2 hover:bg-white/5">
                      <img
                        src={a.coverImage}
                        alt=""
                        className="h-16 w-12 rounded-md object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png';
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{a.title}</p>
                        <p className="text-xs text-zinc-500">★ {a.rating?.toFixed?.(1) || '—'}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <motion.div layout className="glass rounded-2xl p-4 text-xs text-zinc-500">
              Streams load only after a signed-in request. Configure licensed HLS or MP4 URLs per episode in the admin panel.
            </motion.div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
