// ছাগলধরা উচ্চ বিদ্যালয় — সার্ভিস ওয়ার্কার
// লক্ষ্য: প্রধান পেজ ও মূল ছবিগুলো ক্যাশ করে রাখা, যাতে দুর্বল/অনুপস্থিত ইন্টারনেটেও
// আগে একবার ভিজিট করা থাকলে সাইটটি খোলা যায়। কোনো ছবি/ফাইল অনুপস্থিত থাকলে সেটা
// এড়িয়ে বাকি ক্যাশিং চালিয়ে যাওয়া হয়, যাতে পুরো ইনস্টলেশন ব্যর্থ না হয়।

const CACHE_NAME = 'chs-cache-v18'; // v18: সব ডাউনলোড পেজ ও আইডি কার্ডের জলছাপ ৯০% আকারে ছোট; v17: মার্কশীটের গোল জলছাপ লোগো ৯০% আকারে ছোট করা হয়েছে; v16: নতুন ইন্ট্রো স্প্ল্যাশ (স্টাইল #98 — গাঢ় সবুজ/লাল সূর্যোদয়/সোনালি ফ্রেম) ওয়েবসাইট ও অ্যাপ দুটোতেই চালু; v15: অডিও/Range রিকোয়েস্ট সার্ভিস ওয়ার্কারের বাইরে (ইন্ট্রো গান গ্লিচ ঠিক করতে); v14: সব ডাউনলোড পেজ ও আইডি কার্ডে আনুপাতিক জলছাপ; v13: মার্কশীটে বড় গোল জলছাপ লোগো
// (আগের নোট) v10: বড় logo.jpg (৩৬০০×৩৬০০, ১.৬ MB) আর প্রি-ক্যাশ হবে না —
                                     // এখন সাইটের সব জায়গায় ছোট logo-crisp.png/webp ব্যবহার হয়,
                                     // তাই অ্যাপ প্রথমবার ইনস্টল হওয়ার সময় অহেতুক ১.৬ MB ডাউনলোড
                                     // করার দরকার নেই — ইনস্টল দ্রুত ও হালকা হবে।
const CORE_ASSETS = [
  './',
  './school.html',
  './manifest.json',
  './logo-crisp.png',
  './logo-crisp.webp',
  './logo-marksheet.webp',
  './logo-marksheet.png',
  './logo-watermark-page.png',
  './logo-watermark-card.png',
  './logo-192.png',
  './logo-512.png',
  './logo-1024.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './favicon-48.png',
  './favicon-64.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            // এই নির্দিষ্ট ফাইলটি না পাওয়া গেলেও বাকি ইনস্টলেশন চলতে থাকবে
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// কৌশল: নেটওয়ার্ক আগে ট্রাই করা হয় (যাতে সবসময় সবচেয়ে নতুন কনটেন্ট আসে),
// ব্যর্থ হলে (অফলাইন) ক্যাশ থেকে দেখানো হয়।
//
// গুরুত্বপূর্ণ: নোটিশ, বোর্ড রেজাল্ট, রক্তদাতা তালিকা ইত্যাদি ডাইনামিক ডেটা আসে
// /api/... এন্ডপয়েন্ট থেকে। আগে এই ফাংশনগুলোর রেসপন্সও এখানে
// ক্যাশ হয়ে যেত, ফলে নেটওয়ার্ক একটু ধীর হলে বা সাময়িকভাবে ব্যর্থ হলে (Google Apps
// Script/সার্ভারলেস কোল্ড-স্টার্ট দেরির কারণে এটা প্রায়ই ঘটে) পুরনো/স্ট্যাটিক ক্যাশ করা
// ডেটা দেখানো হতো — এই কারণেই রিফ্রেশ করলে মাঝেমধ্যে নতুন নোটিশের বদলে পুরনো
// নোটিশ দেখা যেত। এখন এই এন্ডপয়েন্টগুলোকে ক্যাশের বাইরে রাখা হয়েছে — এগুলো
// সবসময় সরাসরি নেটওয়ার্ক থেকেই আসবে, কখনো ক্যাশ করা পুরনো তথ্য দেখাবে না।
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    // ডাইনামিক API কল — শুধু নেটওয়ার্ক, কখনো ক্যাশ থেকে না এবং কখনো ক্যাশে সেভও হবে না
    event.respondWith(fetch(event.request));
    return;
  }

  // অডিও/ভিডিও ও Range রিকোয়েস্ট (song0..5.mp3) সার্ভিস ওয়ার্কারের মধ্য দিয়ে যাবে না —
  // আগে এগুলোও fetch → clone() → cache.put() হতো: ১০ MB পর্যন্ত mp3-র পুরো বডি মেমোরিতে
  // দু'ভাগ হয়ে যেত (মোবাইলে ইন্ট্রো গানে গ্লিচ/হোঁচট), আর Range-এর আংশিক (206)
  // রেসপন্স cache.put() করতে গিয়ে এরর হতো। ব্রাউজার নিজেই সরাসরি স্ট্রিম করলে মসৃণ বাজে।
  if (event.request.headers.has('range') || /\.(mp3|m4a|ogg|wav|mp4|webm)$/i.test(url.pathname)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // শুধু সফল, একই-ডোমেইনের পূর্ণ (200) রেসপন্স ক্যাশ হবে
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ===== পুশ নোটিফিকেশন =====
// সার্ভার (Netlify Function) থেকে নতুন নোটিশ প্রকাশ হলে একটা push message আসে,
// সেটাকে ফোনের স্ট্যাটাস বার/নোটিফিকেশন প্যানেলে দেখানো হয় — ঠিক অন্য সব অ্যাপের মতো।
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'ছাগলধরা উচ্চ বিদ্যালয়',
      body: event.data ? event.data.text() : 'নতুন একটি আপডেট এসেছে।',
    };
  }

  const title = data.title || 'ছাগলধরা উচ্চ বিদ্যালয়';
  const options = {
    body: data.body || 'নতুন একটি নোটিশ প্রকাশিত হয়েছে।',
    icon: 'logo-192.png',
    badge: 'logo-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './school.html#cat8' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// নোটিফিকেশনে ট্যাপ করলে অ্যাপ/সাইট খুলে সরাসরি নোটিশ বোর্ডে নিয়ে যাওয়া হয়
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './school.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
