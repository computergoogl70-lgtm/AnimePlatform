export function buildSlug(title, suffix = '') {
  const base = (title || 'anime')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}${suffix}`.slice(0, 120);
}
