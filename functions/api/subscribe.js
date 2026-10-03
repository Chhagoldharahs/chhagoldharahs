// POST /api/subscribe
// ব্যবহারকারী যখন "নোটিফিকেশন চালু করুন" চাপে, ব্রাউজার একটা push subscription তৈরি করে —
// সেটা এখানে সেভ হয় (Google Sheet-এর PushSubscription ট্যাবে), যাতে পরে নতুন নোটিশ
// প্রকাশ হলে তার ফোনে নোটিফিকেশন পাঠানো যায়।

import { callGas } from '../_gas-client.js';
import { overLimit, tooMany } from '../_ratelimit.js';

// সত্যিকারের ব্রাউজার পুশ সাবস্ক্রিপশনের আকার: https endpoint + p256dh/auth কী
function validSub(sub) {
  return typeof sub.endpoint === 'string' && /^https:\/\/[^\s]{10,600}$/.test(sub.endpoint) &&
    sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string' &&
    sub.keys.p256dh.length < 200 && sub.keys.auth.length < 100;
}

const ALL_TOPICS = ['general', 'urgent', 'result', 'blood'];

export async function onRequestPost(context) {
  const { request, env } = context;
  let sub;
  try {
    sub = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'অবৈধ ডেটা' }), { status: 400 });
  }

  if (!sub || !sub.endpoint) {
    return new Response(JSON.stringify({ error: 'অবৈধ সাবস্ক্রিপশন' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!validSub(sub)) {
    return new Response(JSON.stringify({ error: 'অবৈধ সাবস্ক্রিপশন' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (await overLimit(request, env, 'subscribe', 60, 3600)) return tooMany();

  const topics = Array.isArray(sub.topics) && sub.topics.length
    ? sub.topics.filter((t) => ALL_TOPICS.includes(t))
    : ALL_TOPICS.slice();

  try {
    const result = await callGas(env, 'subscribe', { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, topics });
    return new Response(JSON.stringify({ ok: true, topics: result.topics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'সেভ করতে সমস্যা হয়েছে' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
