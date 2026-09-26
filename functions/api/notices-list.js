// GET /api/notices-list
// পাবলিক এন্ডপয়েন্ট — সবার জন্য উন্মুক্ত, ওয়েবসাইট ও অ্যাডমিন প্যানেল দুই জায়গাতেই
// এখান থেকে সব নোটিশের তালিকা (নতুন থেকে পুরনো ক্রমে) নিয়ে আসে।
// ডেটা Cloudflare Workers KV থেকে আসে — তাই লোড প্রায় সাথে সাথে (মিলিসেকেন্ডে) হয়।

import { listNotices } from '../_notices-store.js';

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const notices = await listNotices(env);
    return new Response(JSON.stringify(notices), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'নোটিশ লোড করতে সমস্যা হয়েছে',
      debug: String((err && err.message) || err),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
