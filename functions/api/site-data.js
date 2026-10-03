// GET /api/site-data?sheet=Routine  (অথবা Teachers, Gallery ইত্যাদি)
// পাবলিক এন্ডপয়েন্ট — Routine, Results, BoardResults, BoardResultLink,
// StudentCount, Holidays, Teachers, Talents, Gallery, Downloads, About,
// Contact, Events, Alumni, Banner, Messages, FeePayment, PollConfig — এই
// শিটগুলোর যেকোনো একটা থেকে সব সারি JSON আকারে ফেরত দেয়। এই ফাংশনটা একাই
// সব শিট সার্ভ করে।
//
// === Netlify → Cloudflare রূপান্তর ===
// আগে path ছিল /.netlify/functions/site-data — Cloudflare Pages Functions-এ
// এই ফাইলটা functions/api/site-data.js-এ থাকায় path এখন /api/site-data।

import { callGasGet } from '../_gas-client.js';

const ALLOWED_SHEETS = [
  'Routine', 'Results', 'BoardResults', 'BoardResultLink', 'StudentCount', 'Holidays',
  'Teachers', 'Talents', 'Gallery', 'Downloads', 'About', 'Contact',
  'Events', 'Alumni', 'Banner', 'Messages', 'FeePayment', 'PollConfig',
];

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sheet = url.searchParams.get('sheet');

  if (!sheet || !ALLOWED_SHEETS.includes(sheet)) {
    return new Response(JSON.stringify({ error: 'অবৈধ বা অনুমোদনহীন শিটের নাম' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cloudflare-এর এজ ক্যাশে ৬০ সেকেন্ড রাখা হয় — হাজার ভিজিটর/ফোনের সিঙ্কে প্রতিবার
  // Google Apps Script-এ না গিয়ে একই উত্তর পুনর্ব্যবহার হয় (GAS-এর দৈনিক সীমা বাঁচে)।
  // ক্যাশ কাজ না করলে (যেমন pages.dev-এ) আগের মতোই সরাসরি শিট থেকে আসে।
  const cache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
  const cacheKey = new Request(url.origin + '/api/site-data?sheet=' + encodeURIComponent(sheet));
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    } catch (e) {}
  }

  try {
    const rows = await callGasGet(env, 'sheetData', { sheet });
    const resp = new Response(JSON.stringify(Array.isArray(rows) ? rows : []), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
    if (cache) {
      try { context.waitUntil(cache.put(cacheKey, resp.clone())); } catch (e) {}
    }
    return resp;
  } catch (err) {
    // ত্রুটির বার্তা (Alumni-র মতো লোড-সমস্যা খুঁজতে কাজে লাগে) — তবে URL/দীর্ঘ লেখা বাদ দিয়ে
    const dbg = String((err && err.message) || err).replace(/https?:\/\/\S+/g, '[url]').slice(0, 160);
    return new Response(JSON.stringify({
      error: 'ডেটা লোড করতে সমস্যা হয়েছে',
      debug: dbg,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
