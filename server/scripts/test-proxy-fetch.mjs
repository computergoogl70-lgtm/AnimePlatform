import { createRequire } from 'module';
import axios from 'axios';
const require = createRequire(import.meta.url);
const { ANIME } = require('@consumet/extensions');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getUnityUrl() {
  const p = new ANIME.AnimeUnity();
  const s = await p.search('naruto shippuden');
  const main = s.results.find((r) => r.title?.toLowerCase().includes('shippuden')) || s.results[0];
  const info = await p.fetchAnimeInfo(main.id);
  const watch = await p.fetchEpisodeSources(info.episodes[0].id);
  return watch.sources[0].url;
}

const unityUrl = await getUnityUrl();
console.log('unity url', unityUrl.slice(0, 120));

for (const ref of ['https://www.animeunity.to/', undefined, 'https://vixcloud.co/']) {
  try {
    const headers = { 'User-Agent': UA };
    if (ref) {
      headers.Referer = ref;
      try {
        headers.Origin = new URL(ref).origin;
      } catch {
        /* */
      }
    }
    const { status, data } = await axios.get(unityUrl, { timeout: 15000, headers });
    const text = String(data);
    console.log('OK ref=', ref, status, text.slice(0, 120));
  } catch (e) {
    console.log('FAIL ref=', ref, e.response?.status || e.message);
  }
}
