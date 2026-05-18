import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 180, checkperiod: 90 });

export async function anilistSearch(query, page = 1, perPage = 24) {
  const key = `anilist:search:${query}:${page}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const queryDoc = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english native }
          description
          coverImage { extraLarge large }
          bannerImage
          genres
          averageScore
          episodes
          seasonYear
          status
          trailer { id site }
        }
      }
    }
  `;

  const { data } = await axios.post(
    'https://graphql.anilist.co',
    { query: queryDoc, variables: { search: query, page, perPage } },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  );

  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'AniList error');
  }

  cache.set(key, data.data);
  return data.data;
}

export function mapAnilistMediaToPreview(m) {
  const title = m.title?.english || m.title?.romaji || m.title?.native || 'Untitled';
  return {
    anilistId: m.id,
    title,
    description: (m.description || '').replace(/<[^>]+>/g, ''),
    coverImage: m.coverImage?.extraLarge || m.coverImage?.large || '',
    bannerImage: m.bannerImage || '',
    genres: m.genres || [],
    rating: m.averageScore ? m.averageScore / 10 : 0,
    year: m.seasonYear || null,
    status: m.status || 'Unknown',
    episodeCount: m.episodes || 0,
    trailerUrl: m.trailer?.site === 'youtube' ? `https://www.youtube.com/watch?v=${m.trailer.id}` : '',
  };
}
