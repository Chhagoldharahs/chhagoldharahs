// ছাগলধরা উচ্চ বিদ্যালয় — সার্ভিস ওয়ার্কার
// লক্ষ্য: ব্যবহারকারী সাইটে যা যা দেখেন (পেজ, ছবি — নিজের সার্ভার ও গুগল ড্রাইভ
// থেকে আসা গ্যালারি ছবিসহ, গান) — সবকিছু নিজে নিজেই স্টোরেজে জমা হতে থাকে, যাতে
// পরের বার ইন্টারনেট ছাড়াও পুরো অ্যাপ সাথে সাথে (কোনো ল্যাগ/লোডিং ছাড়া) চলে।
// শুধু লাইভ ডেটা (নোটিশ, রেজাল্ট, ইত্যাদি /api/... থেকে আসা) সবসময় সরাসরি
// নেটওয়ার্ক থেকেই আসবে, যাতে অনলাইনে থাকলে কখনো পুরনো তথ্য না দেখায়।

const STATIC_CACHE = 'chs-cache-v40'; // v40: ল্যাগ কমানো — ফোকাস মোড, মোমবাতি লুপ নিয়ন্ত্রণ, জোনাকি ১০টি, অব্যবহৃত স্প্ল্যাশ স্টাইল মুছে ফেলা, স্প্ল্যাশ লোগো আলাদা ফাইল। v39: ইনস্টল করা অ্যান্ড্রয়েড অ্যাপে ইন্ট্রোর পর নেটিভ-স্টাইল নোটিফিকেশন অনুমতি পপআপ (টগল ব্যানার শুধু ব্রাউজার/iOS-এ)। v38: ব্যাক বাটন এখন সব পপআপ/মেনু/ইন্ট্রো আগে বন্ধ করে (ব্রাউজার ও অ্যাপ দুই জায়গায়), আইডি কার্ডের লগইন পপআপেও; স্ক্রল ল্যাগ কমানো (ডিজাইন অপরিবর্তিত)। v37: ১৭/২০ নং ফর্মে চিঠি ডানা ঝাপটে উড়ে যায় (JS অ্যানিমেশন), ১২/২১ নং সেকশনে ছবিতে ক্লিক করলে বড় করে দেখায়। v36: সব লোগো/আইকন ৩০০০px মাস্টার থেকে নতুন করে ধারালো (192–1024, ম্যানিফেস্ট আপডেট)। v35: ইন্ট্রো গান স্মুথ ফেড-ইন (song0-intro.mp3), স্প্ল্যাশ থেকে সাইটে স্মুথ প্রবেশ। v34: ভুল পাসওয়ার্ড/কোডের শব্দ বন্ধ। v33: ইন্ট্রো স্প্ল্যাশ বদলে ৪৪ নং (গভীর সমুদ্র, কম্বিনেশন ১৪)। v32: নতুন ৩০টি ইন্ট্রো স্প্ল্যাশ। v31: ইন্ট্রো স্প্ল্যাশ প্যাক (৩০ স্টাইল)। v30: অ্যাপ আইকন স্বচ্ছ ব্যাকগ্রাউন্ডে ৭০% লোগো। v29: দিবস-থিম ব্যানার (daytheme7 থেকে)। v28: লাইভের আগের ফিক্স (ডেমো নোটিশ সরানো, নিরাপত্তা, পুশ সিঙ্কে র‍্যান্ডম বিরতি)। v27: viewport 580 (৫৫০px-এ গ্রিড ১ কলামে ভাঙত)। v26: অ্যাপ-মোড আচরণ (ব্যাক বাটন, সিলেকশন বন্ধ)। v25: সব ডিভাইসে একই লে-আউট (viewport width=550)। v24: অফলাইন ফুল-সিঙ্ক। v23: হিরো স্ট্যাট ফিক্স। v22: redirect-হওয়া রেসপন্স আর ক্যাশ হয় না (এতে chhagoldharahs.pages.dev-এ ERR_FAILED আসত)
const AUDIO_CACHE = 'chs-audio-cache-v1'; // গান আলাদা ক্যাশে রাখা হয় যাতে স্ট্যাটিক ভার্সন বদলালেও বড় গানগুলো আবার ডাউনলোড করা না লাগে
const API_CACHE = 'chs-api-cache-v1'; // নোটিশ/রেজাল্ট/গ্যালারি-তালিকার মতো লাইভ ডেটার সর্বশেষ সফল কপি — শুধু অফলাইনে ফলব্যাক হিসেবে ব্যবহার হয়

const CORE_ASSETS = [
  './',
  './index.html',
  './school.html',
  './school',
  './idcard.html',
  './404.html',
  './manifest.json',
  './logo-crisp.png',
  './logo-crisp.webp',
  './logo-marksheet.webp',
  './logo-marksheet.png',
  './logo-watermark-page.png',
  './logo-watermark-card.png',
  './logo-192.png',
  './logo-splash.webp',
  './logo-512.png',
  './logo-256.png',
  './logo-384.png',
  './logo-1024.png',
  './logo-maskable-192.png',
  './logo-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './favicon-48.png',
  './favicon-64.png'
];

// শুধু ভিজিটর কাউন্টার হিট — এটা কখনোই ক্যাশ/স্টোর করা হবে না (হিট করাটাই আসল কাজ,
// ক্যাশ করলে পুরনো সংখ্যা রিপ্লে হয়ে যেতে পারে)
function isNeverCache(url) {
  return url.hostname.includes('mileshilliard.com');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.all(
        CORE_ASSETS.map((url) =>
          fetch(url)
            .then((res) => {
              // redirect-হওয়া রেসপন্স ক্যাশে রাখলে পরে পেজ খোলার সময় ERR_FAILED আসে
              if (res && res.ok && !res.redirected) return cache.put(url, res);
            })
            .catch(() => {
              // এই নির্দিষ্ট ফাইলটি না পাওয়া গেলেও বাকি ইনস্টলেশন চলতে থাকবে
            })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, AUDIO_CACHE, API_CACHE, MEDIA_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ===== স্ট্যাটিক পেজ/ছবি/CSS/JS: Stale-While-Revalidate =====
// আগে ক্যাশ করা থাকলে সেটা সাথে সাথেই দেখানো হয় (ইন্টারনেট লাগে না, ল্যাগও হয়
// না), আর একই সময়ে ব্যাকগ্রাউন্ডে নেটওয়ার্ক থেকে সবশেষ ভার্সনটা এনে ক্যাশ
// আপডেট করে রাখা হয় — যাতে পরের বার সবচেয়ে নতুনটাই সাথে সাথে দেখা যায়।
// গ্যালারির গুগল ড্রাইভ থেকে আসা ছবিগুলোও (ক্রস-অরিজিন, opaque রেসপন্স) একইভাবে
// ক্যাশ হয়, তাই ১৬নং স্মৃতি গ্যালারীও একবার দেখা হলে অফলাইনে দেখা যাবে।
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });

  const networkUpdate = fetch(request)
    .then((response) => {
      if (response && !response.redirected && (response.status === 200 || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached && !cached.redirected) {
    // ব্যাকগ্রাউন্ডে আপডেট চলুক, কিন্তু ব্যবহারকারীকে অপেক্ষা করানো হবে না
    networkUpdate;
    return cached;
  }

  const fresh = await networkUpdate;
  if (!fresh && request.mode === 'navigate') {
    // অফলাইনে অচেনা লিংক/প্যারামিটারসহ পেজ চাইলেও মূল অ্যাপটাই খুলবে
    const shell = await cache.match(siteUrl('./school.html'));
    if (shell) return shell;
  }
  return fresh || new Response('অফলাইন — এই কনটেন্ট এখনো ডিভাইসে সংরক্ষিত হয়নি।', { status: 503 });
}

// ===== লাইভ ডেটা (/api/... GET, যেমন নোটিশ/রেজাল্ট/গ্যালারি-তালিকা):
// Network-First with Cache Fallback =====
// ইন্টারনেট থাকলে সবসময় সরাসরি নেটওয়ার্ক থেকেই সবশেষ তথ্য আনা হয় (তাই অনলাইনে
// থাকলে কখনো পুরনো তথ্য দেখাবে না) এবং সফল হলে সেই কপিটা আলাদা ক্যাশে রেখে দেওয়া
// হয়। ইন্টারনেট না থাকলে (fetch ব্যর্থ হলে) তখনই শুধু ওই শেষ সংরক্ষিত কপিটা
// ফলব্যাক হিসেবে দেখানো হয়, যাতে সম্পূর্ণ ফাঁকা/এরর না দেখিয়ে অন্তত সর্বশেষ পাওয়া
// তথ্যটুকু দেখা যায় — আর ইন্টারনেট আবার চালু হলে পেজের 'online' ইভেন্ট শুনে
// (school.html-এ) এই একই এন্ডপয়েন্টগুলো আবার লোড হয়ে নতুন তথ্যে আপডেট হয়ে যায়।
async function networkFirstWithCacheFallback(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ offline: true, error: 'ইন্টারনেট সংযোগ নেই এবং এই তথ্যের আগের কোনো কপিও সংরক্ষিত নেই।' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ===== গান/অডিও: সম্পূর্ণ ফাইলটা একবার ক্যাশে রাখা হয়, তারপর প্রতিটা
// Range রিকোয়েস্টের জন্য সেই সংরক্ষিত ফাইল থেকে ঠিক ততটুকু অংশ কেটে (206
// Partial Content হিসেবে) ফেরত দেওয়া হয় — এভাবে গান একবার শোনা হয়ে গেলে
// ইন্টারনেট ছাড়াও নির্বিঘ্নে (গ্লিচ ছাড়া) বাজবে =====
async function handleAudioRequest(request) {
  const cleanUrl = request.url.split('#')[0];
  const cache = await caches.open(AUDIO_CACHE);
  let fullResponse = await cache.match(cleanUrl);

  if (!fullResponse) {
    try {
      const fresh = await fetch(cleanUrl); // Range ছাড়া — পুরো ফাইলটাই আনা হয়
      if (fresh && fresh.ok) {
        await cache.put(cleanUrl, fresh.clone());
        fullResponse = fresh;
      } else {
        return fetch(request);
      }
    } catch (e) {
      return new Response('', { status: 504 });
    }
  }

  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return fullResponse.clone();

  const buffer = await fullResponse.clone().arrayBuffer();
  const size = buffer.byteLength;
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  const start = match ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? Math.min(parseInt(match[2], 10), size - 1) : size - 1;
  const chunk = buffer.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': fullResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(chunk.byteLength)
    }
  });
}

// ===== ক্রস-অরিজিন ছবি (গুগল ড্রাইভের গ্যালারি/ব্যানার/শিক্ষকের ছবি): Cache-First =====
// ব্যাকগ্রাউন্ড সিঙ্ক আগেই এগুলো MEDIA_CACHE-এ রেখে দেয়; না থাকলে নেটওয়ার্ক থেকে এনে রাখে।
async function mediaCacheFirst(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res && (res.status === 200 || res.type === 'opaque')) cache.put(request.url, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // ভিজিটর কাউন্টার হিট — সবসময় সরাসরি নেটওয়ার্ক, কখনো ক্যাশ না
  if (isNeverCache(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // লাইভ ডেটা (/api/... GET) — network-first, অফলাইনে শেষ সংরক্ষিত কপি ফলব্যাক
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCacheFallback(event.request));
    return;
  }

  // গুগল শিটের gviz (ব্লাড ডোনার তালিকা ও রেজাল্ট সার্চ) — network-first, অফলাইনে শেষ কপি
  if (url.hostname === 'docs.google.com' && url.pathname.includes('/gviz/')) {
    event.respondWith(networkFirstWithCacheFallback(event.request));
    return;
  }

  // ক্রস-অরিজিন ছবি — সেভ করা থাকলে সাথে সাথে, না থাকলে নেটওয়ার্ক থেকে এনে সেভ
  if (event.request.destination === 'image' && url.origin !== self.location.origin) {
    event.respondWith(mediaCacheFirst(event.request));
    return;
  }

  // গান/অডিও/ভিডিও — Range-সচেতন পূর্ণ-ফাইল ক্যাশ থেকে পরিবেশন
  if (event.request.headers.has('range') || /\.(mp3|m4a|ogg|wav|mp4|webm)$/i.test(url.pathname)) {
    event.respondWith(handleAudioRequest(event.request));
    return;
  }

  // বাকি সবকিছু — পেজ, CSS/JS, নিজের ছবি ও গ্যালারির ক্রস-অরিজিন ছবি
  event.respondWith(staleWhileRevalidate(event.request));
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

  // নোটিফিকেশন দেখানোর পাশাপাশি ব্যাকগ্রাউন্ডে সব ডেটা নতুন করে সেভ (অ্যাপ বন্ধ থাকলেও)
  // সব ফোন একই মুহূর্তে সার্ভারে ঝাঁপিয়ে না পড়তে ব্যাকগ্রাউন্ড সিঙ্ক শুরু হয় ০–৪৫ সেকেন্ডের
  // র‍্যান্ডম বিরতিতে (নোটিফিকেশন কিন্তু সাথে সাথেই দেখায়)।
  const jitter = new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 45000)))
    .then(() => syncAll('push', { force: true }));
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    jitter
  ]));
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

// =====================================================================
// ===== অফলাইন ফুল-সিঙ্ক (A to Z ব্যাকগ্রাউন্ড সেভ) =====
// লক্ষ্য: ইনস্টলের পর অ্যাপ না খুললেও, ইন্টারনেট থাকলেই সব ডেটা (সব শিট, নোটিশ,
// রেজাল্ট, ব্লাড ডোনার, গ্যালারি/ব্যানার/শিক্ষকের ছবি, ডাউনলোড ফাইল, ফন্ট, পেজ, গান)
// নিজে নিজেই ডিভাইসে সেভ হবে; নতুন ডেটা এলে আবার সব নতুন করে সেভ হবে।
// ট্রিগার: (১) Background Sync — ইন্টারনেট ফিরলেই, অ্যাপ বন্ধ থাকলেও; (২) Periodic
// Background Sync — নির্দিষ্ট বিরতিতে (সাপোর্ট থাকলে); (৩) নতুন নোটিশের পুশ; (৪) অ্যাপ
// খুললে/ইন্টারনেট ফিরলে পেজ থেকে বার্তা। একই সময়ে একটাই সিঙ্ক চলে, আর আগে সেভ হওয়া
// ছবি/গান আবার ডাউনলোড হয় না — তাই বারবার চললেও ডেটা খরচ খুব কম।
// =====================================================================
const MEDIA_CACHE = 'chs-media-cache-v1';      // গুগল ড্রাইভের ছবি ও ডাউনলোড-ফাইল
const SYNC_TAG = 'chs-full-sync';
const SYNC_TAG_CONT = 'chs-full-sync-continue';
const PERIODIC_TAG = 'chs-periodic-sync';
const SYNC_MIN_GAP_MS = 10 * 60 * 1000;         // অ্যাপ খোলার সময় বারবার সিঙ্ক ঠেকাতে
const SYNC_BUDGET_MS = 4 * 60 * 1000;           // এক দফায় সর্বোচ্চ সময়; বাকিটা পরের দফায় চলবে
const MAX_FILE_BYTES = 40 * 1024 * 1024;
const AUDIO_ON_CELLULAR = false;                // true করলে মোবাইল ডেটাতেও গান অটো সেভ হবে

const SYNC_SHEETS = [
  'Routine', 'Results', 'BoardResults', 'BoardResultLink', 'StudentCount', 'Holidays',
  'Teachers', 'Talents', 'Gallery', 'Downloads', 'About', 'Contact',
  'Events', 'Alumni', 'Banner', 'Messages', 'FeePayment', 'PollConfig'
];
const GVIZ_SHEET_ID = '1EtLGoXIu6UbG_ELcbpXOILHObG3uySy9dzLtVCMmJoM';
const GVIZ_TABS = ['Form responses 1', 'Results']; // ব্লাড ডোনার তালিকা ও রেজাল্ট সার্চ
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Tiro+Bangla:ital@0;1&family=Hind+Siliguri:wght@400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Atma:wght@400;500;600;700&display=swap';
// পেজের ভেতরের ছবি (ফাইলের নাম বদলালে এখানেও বদলাবেন; একবার সেভ হলে আর নামানো হয় না)
const EXTRA_ASSETS = [
  './CHS.webp', './CHS1.webp', './CHS2.webp', './CHS3.webp', './CHS4.webp', './CHS5.webp', './CHS6.webp', './CHS7.webp',
  './CHS.jpg', './CHS1.jpg', './CHS2.jpg', './CHS3.jpg', './CHS4.jpg', './CHS5.jpg', './CHS6.jpg', './CHS7.jpg',
  './logo.webp', './logo-3000.webp', './logo-3000.jpg', './zihad.webp', './zihad.jpg'
];
const SYNC_SONGS = ['./song0-intro.mp3', './song1.mp3', './song2.mp3', './song3.mp3', './song4.mp3', './song5.mp3', './zar.mp3'];

function siteUrl(p) { return new URL(p, self.location.href).href; }
function statusUrl() { return siteUrl('/__chs_sync_status__'); }

async function readSyncStatus() {
  try {
    const c = await caches.open(API_CACHE);
    const r = await c.match(statusUrl());
    return r ? await r.json() : null;
  } catch (e) { return null; }
}
async function writeSyncStatus(obj) {
  try {
    const c = await caches.open(API_CACHE);
    await c.put(statusUrl(), new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } }));
  } catch (e) {}
}
async function broadcastSync(msg) {
  try {
    const list = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    list.forEach((c) => c.postMessage(msg));
  } catch (e) {}
}

function isMeteredConnection() {
  try {
    const c = self.navigator && self.navigator.connection;
    return !!(c && (c.saveData || c.type === 'cellular'));
  } catch (e) { return false; }
}

function driveFileId(v) {
  const m = String(v).match(/\/d\/([a-zA-Z0-9_-]+)/) || String(v).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m && m[1];
}
function cleanHttpUrl(v) {
  try {
    const u = new URL(String(v).trim(), self.location.origin + '/');
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch (e) { return ''; }
}
// শিটের PhotoURL/FileURL কলামগুলো থেকে ঠিক সেই URL-ই বানানো হয় যা পেজ নিজে ব্যবহার করে
// (school.html-এর toDriveImgUrl / driveDownloadUrl-এর হুবহু নিয়ম)
function collectMediaUrls(rows, imgSet, fileSet) {
  rows.forEach((r) => {
    if (!r || typeof r !== 'object') return;
    Object.keys(r).forEach((k) => {
      const v = r[k];
      if (!v || typeof v !== 'string') return;
      const key = k.trim();
      if (key === 'PhotoURL') {
        const id = driveFileId(v);
        const u = id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : cleanHttpUrl(v);
        if (u) imgSet.add(u);
      } else if (key === 'FileURL') {
        const id = driveFileId(v);
        const u = id ? `https://drive.google.com/uc?export=download&id=${id}` : cleanHttpUrl(v);
        if (u) fileSet.add(u);
      }
    });
  });
}
function trimmedKeys(r) {
  const o = {};
  Object.keys(r || {}).forEach((k) => { o[k.trim()] = r[k]; });
  return o;
}

async function pool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const item = items[i++]; await fn(item); }
  });
  await Promise.all(workers);
}

// ক্রস-অরিজিন ছবি/ফাইল সেভ: আগে CORS দিয়ে (আসল, ছোট সাইজের রেসপন্স); CORS না দিলে
// ছবির জন্য opaque কপি। ফাইলের জন্য HTML (ড্রাইভের সতর্কতা-পেজ) বা অতি বড় হলে বাদ।
async function fetchAndStore(cache, url, isFile) {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error('http ' + res.status);
    if (isFile) {
      if (/text\/html/i.test(res.headers.get('content-type') || '')) throw new Error('html');
      if ((parseInt(res.headers.get('content-length'), 10) || 0) > MAX_FILE_BYTES) throw new Error('big');
    }
    await cache.put(url, res);
  } catch (e) {
    if (isFile || !(e instanceof TypeError)) throw e;
    const res = await fetch(url, { mode: 'no-cors' });
    await cache.put(url, res);
  }
}

async function runSync(reason, opts) {
  const prev = await readSyncStatus();
  if (!opts.force && prev && prev.state === 'done' && prev.finishedAt &&
      Date.now() - prev.finishedAt < SYNC_MIN_GAP_MS && (!opts.audio || prev.audioDone)) {
    return { complete: true, skipped: true };
  }

  const started = Date.now();
  const deadline = started + SYNC_BUDGET_MS;
  const st = {
    state: 'running', reason, startedAt: started, done: 0, total: 0, failed: 0, skipped: 0,
    finishedAt: (prev && prev.finishedAt) || 0, audioDone: !!(prev && prev.audioDone)
  };
  await writeSyncStatus(st);
  broadcastSync(Object.assign({ type: 'CHS_SYNC' }, st));

  let timedOut = false;
  let dataFailed = 0;
  const addTotal = (n) => { st.total += n; };
  const tick = () => { st.done++; broadcastSync(Object.assign({ type: 'CHS_SYNC' }, st)); };
  // hard=true: ব্যর্থ হলে সিঙ্ক "অসম্পূর্ণ" ধরা হবে; hard=false (ছবি/ফাইল): শুধু বাদ পড়বে
  const run = async (fn, hard) => {
    if (Date.now() > deadline) { timedOut = true; return; }
    try { await fn(); }
    catch (e) { if (hard) st.failed++; else st.skipped++; }
    finally { tick(); }
  };

  const api = await caches.open(API_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);
  const media = await caches.open(MEDIA_CACHE);
  const imgs = new Set();
  const files = new Set();
  let pollQuestion = '';

  // ১) ডেটা — সবসময় নতুন করে (HTTP ক্যাশ বাইপাস করে, যাতে ৫ মিনিটের পুরনো কপি না আসে)
  const dataJobs = SYNC_SHEETS.map((name) => async () => {
    const url = siteUrl('/api/site-data?sheet=' + encodeURIComponent(name));
    const res = await fetch(url, { cache: 'reload' });
    if (!res.ok) throw new Error('http ' + res.status);
    const copy = res.clone();
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('shape');
    await api.put(url, copy);
    collectMediaUrls(rows, imgs, files);
    if (name === 'PollConfig') {
      const hit = rows.map(trimmedKeys).find((r) => String(r.Question || '').trim());
      if (hit) pollQuestion = String(hit.Question).trim();
    }
  });
  dataJobs.push(async () => {
    const url = siteUrl('/api/notices-list');
    const res = await fetch(url, { cache: 'reload' });
    if (!res.ok) throw new Error('http ' + res.status);
    await api.put(url, res);
  });
  GVIZ_TABS.forEach((tab) => dataJobs.push(async () => {
    const url = `https://docs.google.com/spreadsheets/d/${GVIZ_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
    const res = await fetch(url, { cache: 'reload' });
    if (!res.ok) throw new Error('http ' + res.status);
    await api.put(url, res);
  }));
  addTotal(dataJobs.length);
  await pool(dataJobs, 4, async (job) => {
    const before = st.failed;
    await run(job, true);
    if (st.failed > before) dataFailed++;
  });
  if (pollQuestion) {
    addTotal(1);
    await run(async () => {
      const url = siteUrl('/api/poll-results?question=' + encodeURIComponent(pollQuestion));
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) throw new Error('http ' + res.status);
      await api.put(url, res);
    }, false);
  }

  // ২) অ্যাপের পেজ/আইকন (নতুন ভার্সন থাকলে নামায়, নইলে শুধু যাচাই) ও ফন্ট
  addTotal(CORE_ASSETS.length + 1);
  await pool(CORE_ASSETS, 4, (rel) => run(async () => {
    const url = siteUrl(rel);
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('http ' + res.status);
    if (!res.redirected) await staticCache.put(url, res);
  }, true));
  await run(async () => {
    const res = await fetch(FONT_CSS);
    if (!res.ok) throw new Error('http ' + res.status);
    const copy = res.clone();
    const css = await res.text();
    await staticCache.put(FONT_CSS, copy);
    const fontUrls = Array.from(css.matchAll(/url\((https:\/\/[^)]+)\)/g)).map((m) => m[1]);
    await pool(fontUrls, 4, async (fu) => {
      if (await staticCache.match(fu)) return;
      const fr = await fetch(fu);
      if (fr.ok) await staticCache.put(fu, fr);
    });
  }, true);
  addTotal(EXTRA_ASSETS.length);
  await pool(EXTRA_ASSETS, 4, (rel) => run(async () => {
    const url = siteUrl(rel);
    if (await staticCache.match(url)) return;
    const res = await fetch(url);
    if (!res.ok) throw new Error('http ' + res.status);
    await staticCache.put(url, res);
  }, false));

  // ৩) শিটে থাকা ছবি (ব্যানার/গ্যালারি/শিক্ষক...) ও ডাউনলোড-ফাইল — আগে সেভ থাকলে বাদ
  const imgList = Array.from(imgs);
  const fileList = Array.from(files);
  addTotal(imgList.length + fileList.length);
  const targetCache = (url) => (new URL(url).origin === self.location.origin ? staticCache : media);
  await pool(imgList, 4, (url) => run(async () => {
    const c = targetCache(url);
    if (await c.match(url)) return;
    await fetchAndStore(c, url, false);
  }, false));
  await pool(fileList, 2, (url) => run(async () => {
    const c = targetCache(url);
    if (await c.match(url)) return;
    await fetchAndStore(c, url, true);
  }, false));

  // শিট থেকে সরিয়ে ফেলা ছবি/ফাইল ডিভাইস থেকেও মুছে ফেলা (স্টোরেজ ফাঁকা রাখতে)
  if (dataFailed === 0 && !timedOut) {
    try {
      const keep = new Set([...imgList, ...fileList]);
      const keys = await media.keys();
      for (const req of keys) {
        if (!keep.has(req.url)) await media.delete(req);
      }
    } catch (e) {}
  }

  // ৪) গান — ডিফল্টে শুধু Wi-Fi/ব্রডব্যান্ডে (মোবাইল ডেটা বাঁচাতে); বাটনে চাপলে সবসময়
  const audioCache = await caches.open(AUDIO_CACHE);
  if (opts.audio || AUDIO_ON_CELLULAR || !isMeteredConnection()) {
    addTotal(SYNC_SONGS.length);
    for (const rel of SYNC_SONGS) {
      await run(async () => {
        const url = siteUrl(rel);
        if (await audioCache.match(url)) return;
        const res = await fetch(url);
        if (!res.ok) throw new Error('http ' + res.status);
        await audioCache.put(url, res);
      }, true);
    }
  }
  let audioAll = true;
  for (const rel of SYNC_SONGS) {
    if (!(await audioCache.match(siteUrl(rel)))) { audioAll = false; break; }
  }
  st.audioDone = audioAll;

  const complete = !timedOut && st.failed === 0;
  st.state = complete ? 'done' : 'partial';
  if (complete) st.finishedAt = Date.now();
  await writeSyncStatus(st);
  await broadcastSync(Object.assign({ type: 'CHS_SYNC' }, st));
  return { complete };
}

let runningSync = null;
function syncAll(reason, opts) {
  if (runningSync) return runningSync;
  runningSync = runSync(reason, opts || {})
    .catch((e) => ({ complete: false, error: String((e && e.message) || e) }))
    .finally(() => { runningSync = null; });
  return runningSync;
}
async function scheduleRetry() {
  try { await self.registration.sync.register(SYNC_TAG_CONT); } catch (e) {}
}

// ইন্টারনেট ফিরলেই (অ্যাপ বন্ধ থাকলেও) ব্রাউজার এই ইভেন্ট চালায়; অসম্পূর্ণ থাকলে
// এরর ছুড়ে দিই, যাতে ব্রাউজার নিজেই পরে আবার চেষ্টা করে।
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG || event.tag === SYNC_TAG_CONT) {
    event.waitUntil(syncAll('sync', { force: true }).then((r) => {
      if (!r.complete) throw new Error('incomplete');
    }));
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === PERIODIC_TAG) {
    event.waitUntil(syncAll('periodic', { force: true }).then((r) => { if (!r.complete) return scheduleRetry(); }));
  }
});

self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'CHS_SYNC_NOW') {
    event.waitUntil(
      syncAll(d.reason || 'page', { force: !!d.force, audio: !!d.audio }).then((r) => {
        if (!r.complete) return scheduleRetry();
      })
    );
  }
});
