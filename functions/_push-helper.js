// অভ্যন্তরীণ শেয়ার্ড মডিউল — notices-admin.js, blood-alert.js এবং deploy-notify.js
// সবাই এখান থেকে sendPushToAll() ব্যবহার করে।
//
// === Netlify → Cloudflare রূপান্তরের গুরুত্বপূর্ণ নোট ===
// Netlify-তে `web-push` npm প্যাকেজ ব্যবহার হতো, যেটা Node.js-এর `crypto` ও
// `https` মডিউলের ওপর নির্ভরশীল — এই দুটোই Cloudflare Workers-এ নেই। তাই এখানে
// `@pushforge/builder` ব্যবহার করা হয়েছে, যেটা Web Crypto API + fetch দিয়ে
// বানানো এবং Cloudflare Workers-এ কাজ করার জন্যই ডিজাইন করা।
//
// ⚠️ গুরুত্বপূর্ণ সতর্কতা: আগের VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY (যা `web-push`
// লাইব্রেরি দিয়ে বানানো হয়েছিল) সরাসরি এখানে কাজ নাও করতে পারে যদি ফরম্যাট না
// মেলে। মাইগ্রেশনের পর পুশ নোটিফিকেশন ফিচারটা সবার আগে টেস্ট করে দেখুন —
// কাজ না করলে নতুন করে VAPID কী জেনারেট করে বসাতে হবে (নিচের কমেন্টে বিস্তারিত)।
// নতুন কী বসালে আগে থেকে সাবস্ক্রাইব করা সবাইকে একবার আবার "নোটিফিকেশন চালু
// করুন" চাপতে হবে (এটা একবারই লাগবে, বড় কোনো সমস্যা না)।
//
// নতুন VAPID কী বানাতে: https://vapidkeys.com (অথবা npx @pushforge/builder
// generate-vapid-keys) ব্যবহার করে বানিয়ে Cloudflare Pages > Settings >
// Environment variables এ VAPID_PUBLIC_KEY ও VAPID_PRIVATE_KEY বসান।

import { buildPushHTTPRequest } from '@pushforge/builder';
import { callGas } from './_gas-client.js';

export async function sendPushToAll(env, title, body, url, topic) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    // VAPID কী সেট না থাকলে পুশ পাঠানো বাদ দিয়ে চুপচাপ এগিয়ে যাওয়া হয়
    return { sent: 0, skipped: true };
  }

  // VAPID_PRIVATE_KEY এনভায়রনমেন্ট ভ্যারিয়েবলে JWK অবজেক্টটা JSON স্ট্রিং হিসেবে
  // সেভ থাকার কথা (generate-vapid-keys থেকে যা পাওয়া যায়)। এখানে সেটা পার্স
  // করে আসল JWK অবজেক্টে রূপান্তর করা হচ্ছে, কারণ buildPushHTTPRequest এটাই
  // আশা করে (স্ট্রিং না)।
  let privateJWK;
  try {
    privateJWK =
      typeof env.VAPID_PRIVATE_KEY === 'string'
        ? JSON.parse(env.VAPID_PRIVATE_KEY)
        : env.VAPID_PRIVATE_KEY;
  } catch (e) {
    // পুরনো ফরম্যাটে (web-push লাইব্রেরির raw base64 key) সেভ করা থাকলে এখানে
    // পার্স ফেইল করবে — তখন নতুন করে VAPID কী জেনারেট করে বসাতে হবে।
    return { sent: 0, skipped: true };
  }

  const adminContact = env.VAPID_SUBJECT || 'mailto:admin@example.com';
  const payloadObj = { title, body, url: url || './school.html' };

  let subs;
  try {
    subs = await callGas(env, 'subscribersList', { topic: topic || '' });
  } catch (e) {
    return { sent: 0, skipped: true };
  }
  if (!Array.isArray(subs)) subs = [];

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        const { endpoint, headers, body: requestBody } = await buildPushHTTPRequest({
          privateJWK,
          message: {
            payload: payloadObj,
            options: topic ? { topic } : undefined,
            adminContact,
          },
          subscription: { endpoint: sub.endpoint, keys: sub.keys },
        });
        const res = await fetch(endpoint, { method: 'POST', headers, body: requestBody });
        if (res.ok) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          // সাবস্ক্রিপশন মেয়াদোত্তীর্ণ/বাতিল হলে সেটা শিট থেকে মুছে ফেলা হয়
          await callGas(env, 'unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
        }
      } catch (err) {
        // একজনের পাঠাতে সমস্যা হলেও বাকিদের পাঠানো চলতে থাকবে
      }
    })
  );
  return { sent, skipped: false };
}
