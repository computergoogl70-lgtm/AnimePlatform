import jwt from 'jsonwebtoken';

export const PROVIDER_REFERERS = {
  Witanime: 'https://workupload.com/',
  AnimeSaturn: 'https://www.animesaturn.cx/',
  AnimeUnity: 'https://www.animeunity.to/',
};

export function refererForProvider(providerId) {
  return PROVIDER_REFERERS[providerId] || '';
}

export function signStreamAccess(episodeId, referer = '') {
  return jwt.sign(
    { ep: episodeId, scope: 'stream', referer },
    process.env.JWT_SECRET,
    { expiresIn: '3h' }
  );
}

export function verifyStreamAccess(token) {
  if (!token) throw new Error('Stream token required');
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.scope !== 'stream') throw new Error('Invalid stream token');
  return payload;
}
