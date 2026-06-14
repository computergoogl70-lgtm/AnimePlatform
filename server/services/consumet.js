import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ANIME } = require('@consumet/extensions');

/** All providers available for importing episodes in the Admin panel */
export const CONSUMET_PROVIDERS = [
  { id: 'AnimeSaturn', label: 'AnimeSaturn (Italian - Recommended)', watch: true },
];

export const WATCH_PROVIDERS = CONSUMET_PROVIDERS.filter((p) => p.watch);

function getConsometProvider(providerId) {
  const id = providerId?.trim();
  if (!id || !ANIME[id]) {
    throw new Error(`Unknown Consumet provider: ${providerId}`);
  }
  return new ANIME[id]();
}

export function assertWatchProvider(providerId) {
  const meta = CONSUMET_PROVIDERS.find((p) => p.id === providerId);
  if (!meta?.watch) {
    throw new Error(
      `${providerId || 'This provider'} cannot play video here.`
    );
  }
}

export async function consumetSearch(providerId, query) {
  assertWatchProvider(providerId);
  const provider = getConsometProvider(providerId);
  const data = await provider.search(query);
  return (data?.results || []).map((r) => ({
    id: r.id,
    title: r.title,
    image: r.image || '',
    url: r.url || '',
    sub: r.sub,
    dub: r.dub,
    episodes: r.episodes,
    type: r.type,
  }));
}

export async function consumetAnimeInfo(providerId, animeId) {
  assertWatchProvider(providerId);
  const provider = getConsometProvider(providerId);
  const info = await provider.fetchAnimeInfo(animeId);
  return {
    id: info.id,
    title: info.title,
    image: info.image || '',
    description: info.description || '',
    genres: info.genres || [],
    status: info.status,
    totalEpisodes: info.totalEpisodes,
    episodes: (info.episodes || []).map((ep) => ({
      id: ep.id,
      number: ep.number,
      title: ep.title || `Episode ${ep.number}`,
      isFiller: ep.isFiller,
      url: ep.url,
    })),
  };
}

export async function consumetEpisodeStream(providerId, episodeId) {
  assertWatchProvider(providerId);
  const provider = getConsometProvider(providerId);

  try {
    const data = await provider.fetchEpisodeSources(episodeId);
    const sources = (data?.sources || []).filter(
      (s) => s?.url && !s.url.includes('.replace(') && !s.url.includes('undefined')
    );
    const m3u8 =
      sources.find((s) => s.isM3U8 && /\.m3u8/i.test(s.url)) ||
      sources.find((s) => /\.m3u8/i.test(s.url || '')) ||
      sources.find((s) => s.isM3U8 && s.url) ||
      sources[0];

    if (m3u8?.url) {
      const subtitles = (data.subtitles || []).map((sub) => ({
        label: sub.lang || sub.language || 'Unknown',
        src: sub.url,
        srclang: (sub.lang || 'en').slice(0, 2).toLowerCase(),
      }));

      const isHls = m3u8.isM3U8 || /\.m3u8/i.test(m3u8.url);

      return {
        url: m3u8.url,
        type: isHls ? 'hls' : 'mp4',
        subtitles,
      };
    }
  } catch (e) {
    console.warn(`[consumet] Stream extraction failed for ${providerId} (${episodeId}): ${e.message}`);
  }

  // Graceful fallback: if no direct video streams are resolved,
  // return the episode page link as an iframe 'embed' fallback source
  console.log(`[consumet] Falling back to embed/iframe for ${providerId} episode: ${episodeId}`);
  return {
    url: episodeId,
    type: 'embed',
    subtitles: [],
  };
}
