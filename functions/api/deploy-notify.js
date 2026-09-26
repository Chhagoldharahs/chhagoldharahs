// GET/POST /api/deploy-notify?key=YOUR_SECRET
//
// এই ফাংশনটা সবার ফোনে "সাইট আপডেট হয়েছে" পুশ নোটিফিকেশন পাঠায়।
//
// ⚠️ Cloudflare-এ ট্রিগার করার পদ্ধতি Netlify থেকে আলাদা: Netlify-তে ড্যাশবোর্ড
// থেকে সরাসরি "deploy succeeded হলে এই URL কল করো" সেট করা যেত। Cloudflare
// Pages-এ ডিপ্লয়-সফল-হওয়ার-পর-স্বয়ংক্রিয়ভাবে-URL-কল-করা এই নির্দিষ্ট ফিচারটা
// ড্যাশবোর্ডে নেই। বিকল্প হিসেবে —
//   ক) GitHub দিয়ে ডিপ্লয় করলে, .github/workflows-এ একটা ধাপ যোগ করে ডিপ্লয়ের
//      পরে এই URL-এ কল করানো যায় (চাইলে সেই workflow ফাইলটাও বানিয়ে দিতে পারি), অথবা
//   খ) admin.html-এ ম্যানুয়ালি "সাইট আপডেট জানান" বাটন বসিয়ে হাতে চাপলেই
//      নোটিফিকেশন যাবে (এটাই সহজ, প্রতি ছোট পরিবর্তনে বিরক্তিকর নোটিফিকেশনও এড়ানো যায়)।
//
// এনভায়রনমেন্ট ভ্যারিয়েবল (Cloudflare Pages > Settings > Environment variables):
//   DEPLOY_NOTIFY_SECRET = একটা কঠিন র‍্যান্ডম গোপন স্ট্রিং

import { sendPushToAll } from '../_push-helper.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';
  if (!env.DEPLOY_NOTIFY_SECRET || key !== env.DEPLOY_NOTIFY_SECRET) {
    return new Response(JSON.stringify({ error: 'অননুমোদিত' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const result = await sendPushToAll(env, 'ছাগলধরা উচ্চ বিদ্যালয়', 'ওয়েবসাইট নতুন করে হালনাগাদ হয়েছে। দেখে নিন।', './school.html');
    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'পুশ পাঠাতে সমস্যা হয়েছে: ' + (err && err.message ? err.message : 'অজানা') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
