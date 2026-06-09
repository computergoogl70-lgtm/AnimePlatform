import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { connectDb } from './config/db.js';

import authRoutes from './routes/auth.js';
import animeRoutes from './routes/anime.js';
import episodeRoutes from './routes/episodes.js';
import userRoutes from './routes/user.js';
import commentRoutes from './routes/comments.js';
import homeRoutes from './routes/home.js';
import adminRoutes from './routes/admin.js';
import streamProxyRoutes from './routes/streamProxy.js';

const app = express();

const clientUrl = (process.env.CLIENT_URL || 'https://animechannet.vercel.app').replace(/\/$/, '');

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith('/api/proxy') || process.env.NODE_ENV !== 'production',
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'animestream-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/anime/:animeId/comments', commentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/proxy', streamProxyRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const port = process.env.PORT || 5000;

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`AnimeStream API listening on port ${port}`);
    });
  })
  .catch((e) => {
    console.error('Failed to connect to MongoDB', e);
    process.exit(1);
  });
