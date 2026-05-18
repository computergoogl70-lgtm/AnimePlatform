import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

const JIKAN = 'https://api.jikan.moe/v4';

async function getCached(key, fetcher) {
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await fetcher();
  cache.set(key, data);
  return data;
}

export async function jikanGetAnimeByMalId(malId) {
  const key = `jikan:anime:${malId}`;
  return getCached(key, async () => {
    const { data } = await axios.get(`${JIKAN}/anime/${malId}/full`, { timeout: 15000 });
    return data.data;
  });
}

export async function jikanSearchAnime(query, page = 1) {
  const { data } = await axios.get(`${JIKAN}/anime`, {
    params: { q: query, page, limit: 24, sfw: true },
    timeout: 15000,
  });
  return data;
}

export async function jikanTopAnime(filter = 'airing', page = 1) {
  const key = `jikan:top:${filter}:${page}`;
  return getCached(key, async () => {
    const { data } = await axios.get(`${JIKAN}/top/anime`, {
      params: { filter, page, limit: 25 },
      timeout: 15000,
    });
    return data;
  });
}

export function mapJikanAnimeToDoc(j) {
  const title = j.title_english || j.title || 'Untitled';
  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return {
    title,
    slug: `${slugBase}-${j.mal_id}`,
    description: j.synopsis || '',
    coverImage: j.images?.jpg?.large_image_url || j.images?.jpg?.image_url || '',
    bannerImage: j.trailer?.images?.maximum_image_url || j.images?.jpg?.large_image_url || '',
    genres: (j.genres || []).map((g) => g.name),
    rating: j.score && j.score > 0 ? j.score : 0,
    malId: j.mal_id,
    year: j.year || (j.aired?.from ? new Date(j.aired.from).getFullYear() : null),
    status: j.status || 'Unknown',
    episodeCount: j.episodes || 0,
    trailerUrl: j.trailer?.url || '',
    popularity: j.popularity || 0,
    trendingScore: j.members || 0,
    source: 'jikan',
  };
}
