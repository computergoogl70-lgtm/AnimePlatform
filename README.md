# AnimeStream

Full-stack anime streaming platform UI with a separate **Express + MongoDB** API. Videos are **never** stored in the repo: each episode points at an **external HLS or MP4 URL** you configure in the admin panel (use only properly licensed sources).

## Stack

| Layer    | Tech |
|----------|------|
| Client   | React (JavaScript), Vite, Tailwind CSS v4, Framer Motion, React Router, Axios, Plyr, HLS.js |
| Server   | Node.js, Express 5, Mongoose, JWT (cookie + Bearer), bcrypt, Helmet, CORS, rate limiting |
| Data     | MongoDB (Users, Anime, Episodes, Comments, Favorites, WatchHistory, Banners, HomeSection) |
| Metadata | [Jikan](https://jikan.moe/) (MAL) import, optional [AniList](https://anilist.co/) GraphQL search |

## Repository layout

```
/client   — Vite + React frontend
/server   — Express REST API
```

## Prerequisites

- Node.js 20+
- MongoDB Atlas URI (or local MongoDB)

## Environment variables

### `server/.env`

Copy from `server/.env.example` and set:

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `CLIENT_URL` | Frontend origin, e.g. `http://localhost:5173` |

Optional seed overrides:

| Variable | Description |
|----------|-------------|
| `SEED_ADMIN_EMAIL` | Default `admin@animestream.local` |
| `SEED_ADMIN_PASSWORD` | Default `admin123` |

### `client/.env`

Copy from `client/.env.example`:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Use `/api` with the Vite dev proxy, or your deployed API URL in production |

## Install and run (development)

**Terminal 1 — API**

```bash
cd server
cp .env.example .env   # then edit MONGODB_URI and JWT_SECRET
npm install
npm run seed           # optional: demo anime + admin + homepage rows
npm run dev
```

**Terminal 2 — Client**

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` → `http://localhost:5000`.

- After seeding, sign in with the admin email/password from your `.env` (defaults above).
- Demo catalog includes a **legal test HLS** stream (Mux test asset) on three episodes.

## Production build

```bash
cd client && npm run build
# Serve client/dist via Netlify/Vercel static hosting
cd server && npm start
```

Point `CLIENT_URL` and the frontend `VITE_API_URL` at your real origins. Enable HTTPS so `secure` cookies work if you rely on cookie-only auth.

## Deployment notes

| Piece | Suggested host |
|-------|----------------|
| Frontend | [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/) |
| API | [Render](https://render.com/) or [Railway](https://railway.app/) |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) |

Configure CORS `CLIENT_URL` to the deployed SPA origin. For cross-domain JWTs, the client stores the token from the login/register JSON body in `localStorage` and sends `Authorization: Bearer …` (cookie is also set when same-site).

## Security features (server)

- JWT authentication (`requireAuth` / `requireAdmin`)
- Password hashing with bcrypt (Mongoose `pre('save')`)
- `helmet`, `express-rate-limit`, JSON body size limit
- Stream URLs are only returned from `GET /api/episodes/:id/stream` for authenticated users

## API overview

| Area | Routes |
|------|--------|
| Auth | `POST /api/auth/register`, `login`, `logout`, `GET /api/auth/me`, forgot/reset password |
| Home | `GET /api/home` — banners, dynamic sections, continue watching |
| Anime | `GET /api/anime`, `/trending`, `/search`, `/:id`, `/:id/recommendations`, `/external/anilist` |
| Episodes | `GET /api/episodes/anime/:animeId`, `GET /api/episodes/:id`, `GET …/stream`, `POST …/progress` |
| User | `GET/POST/DELETE /api/user/favorites`, `watch-history`, `continue-watching`, `PATCH /api/user/me` |
| Comments | `GET/POST /api/anime/:animeId/comments`, `DELETE /api/anime/:animeId/comments/:commentId` |
| Admin | `/api/admin/*` — import Jikan, CRUD anime/episodes, users, banners, homepage sections |

## Legal

This project is a **technical template**. You are responsible for licensing anime, artwork, and video streams. The seed uses a **public test stream** suitable for development only.
