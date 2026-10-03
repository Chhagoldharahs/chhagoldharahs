// অভ্যন্তরীণ শেয়ার্ড মডিউল — notices-admin.js, blood-alert.js এবং deploy-notify.js
// সবাই এখান থেকে sendPushToAll() ব্যবহার করে।
//
// Cloudflare Workers-এ `web-push` চলে না, তাই `@pushforge/builder` (Web Crypto + fetch)।
// VAPID_PRIVATE_KEY অবশ্যই JWK JSON স্ট্রিং হতে হবে (নতুন কী বানানোর নিয়ম CLOUDFLARE_SETUP.md-এ)।
//
// === সাবস্ক্রাইবার বেশি হলে ===
// Cloudflare-এর এক রিকোয়েস্টে বাইরের কলের সীমা আছে (ফ্রি প্ল্যানে ~৫০)। তাই ৩৫ জনের বেশি
// হলে সাবস্ক্রাইবারদের ৩৫ জনের ব্যাচে ভাগ করে প্রতিটা ব্যাচ আলাদা রিকোয়েস্টে
// (/api/push-batch) পাঠানো হয় — প্রতিটার নিজস্ব সীমা থাকে। এতে ~১৫০০ জন পর্যন্ত কাজ করে।

import { buildPushHTTPRequest } from '@pushforge/builder';
import { callGas } from './_gas-client.js';
import { internalKey } from './_auth.js';

const CHUNK = 35;          // এক ব্যাচে সর্বোচ্চ পুশ
const MAX_CHUNKS = 44;     // এক নোটিশে সর্বোচ্চ ব্যাচ (৪৪ × ৩৫ ≈ ১৫৪০ জন)
const MAX_CLEANUP = 5;     // এক ব্যাচে মেয়াদোত্তীর্ণ সাবস্ক্রিপশন মোছার সর্বোচ্চ চেষ্টা

// পুশ পেলোড ৪KB-এর বেশি হলে সবার পুশ ব্যর্থ হয় — তাই ছোট রাখা হয় (পুরো লেখা নোটিশ বোর্ডে আছে)
function clip(str, n) {
  str = String(str == null ? '' : str);
  return str.length > n ? str.slice(0, n - 1).trimEnd() + '…' : str;
}

export function parseVapid(env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  try {
    return typeof env.VAPID_PRIVATE_KEY === 'string' ? JSON.parse(env.VAPID_PRIVATE_KEY) : env.VAPID_PRIVATE_KEY;
  } catch (e) {
    return null; // পুরনো raw-base64 ফরম্যাট — নতুন JWK কী লাগবে
  }
}

// একটা ব্যাচের সবাইকে পাঠায়; মেয়াদোত্তীর্ণ (404/410) সাবস্ক্রিপশন শিট থেকে সরায়
export async function sendChunk(env, privateJWK, payloadObj, topic, subs) {
  const adminContact = env.VAPID_SUBJECT || 'mailto:admin@example.com';
  let sent = 0;
  const expired = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        const { endpoint, headers, body } = await buildPushHTTPRequest({
          privateJWK,
          message: { payload: payloadObj, options: topic ? { topic } : undefined, adminContact },
          subscription: { endpoint: sub.endpoint, keys: sub.keys },
        });
        const res = await fetch(endpoint, { method: 'POST', headers, body });
        if (res.ok) sent++;
        else if (res.status === 404 || res.status === 410) expired.push(sub.endpoint);
      } catch (err) {
        // একজনের সমস্যায় বাকিদের পাঠানো থামে না
      }
    })
  );
  for (const ep of expired.slice(0, MAX_CLEANUP)) {
    await callGas(env, 'unsubscribe', { endpoint: ep }).catch(() => {});
  }
  return { sent, expired: expired.length };
}

export async function sendPushToAll(env, title, body, url, topic, origin) {
  const privateJWK = parseVapid(env);
  if (!privateJWK) return { sent: 0, skipped: true };

  const payloadObj = { title: clip(title, 80), body: clip(body, 180), url: url || './school.html' };

  let subs;
  try {
    subs = await callGas(env, 'subscribersList', { topic: topic || '' });
  } catch (e) {
    return { sent: 0, skipped: true };
  }
  if (!Array.isArray(subs)) subs = [];
  subs = subs.filter((s) => s && typeof s.endpoint === 'string' && s.keys);

  if (subs.length <= CHUNK || !origin) {
    // কম সাবস্ক্রাইবার (বা অরিজিন অজানা): সরাসরি এখানেই
    const r = await sendChunk(env, privateJWK, payloadObj, topic, subs.slice(0, CHUNK));
    return { sent: r.sent, skipped: false, total: subs.length };
  }

  const chunks = [];
  for (let i = 0; i < subs.length && chunks.length < MAX_CHUNKS; i += CHUNK) chunks.push(subs.slice(i, i + CHUNK));
  const key = await internalKey(env);
  let sent = 0;
  let failedChunks = 0;
  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetch(origin + '/api/push-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': key },
          body: JSON.stringify({ subs: chunk, payload: payloadObj, topic: topic || '' }),
        });
        if (!res.ok) throw new Error('batch ' + res.status);
        const d = await res.json();
        sent += d.sent || 0;
      } catch (e) {
        failedChunks++;
      }
    })
  );
  return { sent, skipped: false, total: subs.length, failedChunks };
}
