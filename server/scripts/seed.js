import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Anime from '../models/Anime.js';
import Episode from '../models/Episode.js';
import HomeSection from '../models/HomeSection.js';
import Banner from '../models/Banner.js';
import { connectDb } from '../config/db.js';

const DEMO_HLS = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

async function run() {
  await connectDb();
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@animestream.local';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      email: adminEmail,
      password: adminPass,
      displayName: 'Admin',
      role: 'admin',
    });
    console.log('Created admin:', adminEmail, adminPass);
  } else {
    console.log('Admin exists:', adminEmail);
  }

  let anime = await Anime.findOne({ slug: 'demo-stream-show' });
  if (!anime) {
    anime = await Anime.create({
      title: 'Demo Stream Show',
      slug: 'demo-stream-show',
      description:
        'Sample catalog entry with a legal test HLS stream for development. Replace stream URLs in admin with your licensed sources.',
      coverImage: 'https://cdn.myanimelist.net/images/anime/10/47373.jpg',
      bannerImage: 'https://cdn.myanimelist.net/images/anime/10/47373.jpg',
      genres: ['Action', 'Fantasy'],
      rating: 8.7,
      year: 2013,
      status: 'Finished Airing',
      episodeCount: 3,
      trendingScore: 1000000,
      popularity: 500000,
      isFeatured: true,
    });

    await Episode.insertMany([
      {
        animeId: anime._id,
        season: 1,
        number: 1,
        title: 'Pilot',
        description: 'Intro episode (demo stream).',
        streamUrl: DEMO_HLS,
        streamType: 'hls',
        durationSeconds: 600,
        subtitles: [
          {
            label: 'English',
            srclang: 'en',
            src: 'https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/docs/mediaelement.vtt',
          },
        ],
      },
      {
        animeId: anime._id,
        season: 1,
        number: 2,
        title: 'Continued',
        description: 'Second episode (same demo stream).',
        streamUrl: DEMO_HLS,
        streamType: 'hls',
        durationSeconds: 600,
      },
      {
        animeId: anime._id,
        season: 1,
        number: 3,
        title: 'Finale',
        description: 'Third episode (same demo stream).',
        streamUrl: DEMO_HLS,
        streamType: 'hls',
        durationSeconds: 600,
      },
    ]);
    console.log('Seeded demo anime + episodes');
  }

  const count = await HomeSection.countDocuments();
  if (count === 0) {
    await HomeSection.insertMany([
      { key: 'trending', title: 'Trending Now', type: 'trending', order: 1, active: true },
      { key: 'top', title: 'Top Rated', type: 'top_rated', order: 2, active: true },
      { key: 'recent', title: 'Recently Added', type: 'recent', order: 3, active: true },
      { key: 'action', title: 'Popular in Action', type: 'genre', genre: 'Action', order: 4, active: true },
    ]);
    console.log('Seeded home sections');
  }

  const bCount = await Banner.countDocuments();
  if (bCount === 0 && anime) {
    await Banner.create({
      imageUrl: anime.bannerImage,
      title: anime.title,
      animeId: anime._id,
      order: 0,
      active: true,
    });
    console.log('Seeded banner');
  }

  await mongoose.disconnect();
  console.log('Seed complete');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
