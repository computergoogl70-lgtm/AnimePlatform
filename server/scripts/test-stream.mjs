import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ANIME } = require('@consumet/extensions');

async function testProvider(name, query = 'naruto') {
  console.log('\n===', name, '===');
  const p = new ANIME[name]();
  const search = await p.search(query);
  const first = search.results?.[0];
  if (!first) {
    console.log('no search results');
    return;
  }
  console.log('anime:', first.title, first.id);
  const info = await p.fetchAnimeInfo(first.id);
  const ep = info.episodes?.[0];
  if (!ep) {
    console.log('no episodes');
    return;
  }
  console.log('ep:', ep.number, ep.id);
  try {
    const watch = await p.fetchEpisodeSources(ep.id);
    console.log('sources:', watch.sources?.map((s) => ({ isM3U8: s.isM3U8, url: s.url?.slice(0, 100) })));
    console.log('subs:', watch.subtitles?.length);
  } catch (e) {
    console.log('WATCH FAIL:', e.message);
  }
}

await testProvider('AnimeSaturn', 'naruto');
await testProvider('AnimeUnity', 'naruto');
