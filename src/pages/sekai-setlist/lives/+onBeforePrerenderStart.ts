export function onBeforePrerenderStart() {
  const base = (process.env.PUBLIC_ENV__BASE_URL ?? '').replace(/\/$/, '');
  return [`${base}/sekai-setlist/lives`];
}
