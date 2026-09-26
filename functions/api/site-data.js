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

  try {
    const rows = await callGasGet(env, 'sheetData', { sheet });
    return new Response(JSON.stringify(Array.isArray(rows) ? rows : []), {
      status: 200,
      // ৫ মিনিট পর্যন্ত ক্যাশ রাখা হয় — এই তথ্য প্রায়ই বদলায় না (রুটিন/শিক্ষক
      // তালিকা ইত্যাদি), তাই বারবার Google Sheet-এ না গিয়ে দ্রুত লোড হবে।
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'ডেটা লোড করতে সমস্যা হয়েছে',
      debug: String((err && err.message) || err),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
