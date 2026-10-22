// GET /api/results-data            → রেজাল্ট ডেটা (প্রকাশের সময় হলে)
// GET /api/results-data?meta=1     → শুধু অবস্থা: { locked, publishAt, serverNow } (ডেটা ছাড়া)
// "Results" ট্যাবের PublishDate কলামের সময় না আসা পর্যন্ত সার্ভার (Apps Script) কোনো রেজাল্ট ডেটাই পাঠায়
// না — শুধু প্রকাশের সময় জানায়। তাই ব্রাউজারে ডেটা আগে থেকে পাওয়ার কোনো উপায় থাকে না।

import { callGasGet } from '../_gas-client.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const meta = url.searchParams.get('meta') === '1';

  // ১৫ সেকেন্ডের এজ ক্যাশ — রেজাল্টের দিনে হাজার ভিজিটরের চাপ Apps Script-এ সরাসরি যায় না
  const cache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
  const cacheKey = new Request(url.origin + '/api/results-data?meta=' + (meta ? '1' : '0'));
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch (e) {}
  }

  try {
    const data = await callGasGet(env, 'resultsData', meta ? { meta: '1' } : {});
    if (!data || typeof data !== 'object' || data.error) throw new Error((data && data.error) || 'bad response');
    const resp = new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=15' },
    });
    if (cache) {
      try { context.waitUntil(cache.put(cacheKey, resp.clone())); } catch (e) {}
    }
    return resp;
  } catch (err) {
    return new Response(JSON.stringify({ error: 'ডেটা লোড করতে সমস্যা হয়েছে' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
