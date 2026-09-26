// অভ্যন্তরীণ শেয়ার্ড মডিউল — Google Apps Script (Google Sheets কে ডাটাবেস বানানো
// API) কে কল করার কাজ করে। GAS_WEBAPP_URL আর SHEET_API_KEY — দুটোই Cloudflare
// Pages-এর Environment variables থেকে আসে (Settings > Environment variables)।
//
// === Netlify → Cloudflare রূপান্তরের নোট ===
// Netlify Functions-এ `process.env.X` দিয়ে এনভায়রনমেন্ট ভ্যারিয়েবল পড়া যেত।
// Cloudflare Workers-এ `process.env` নেই — এর বদলে প্রতিটা রিকোয়েস্টের সাথে
// আসা `env` অবজেক্ট থেকে পড়তে হয় (route ফাইলে `context.env`)। তাই এই ফাংশন
// দুটো এখন প্রথম প্যারামিটার হিসেবে `env` নেয়।
//
// Google Apps Script মাঝে মাঝে সাময়িকভাবে ব্যর্থ রেসপন্স দেয় — তাই স্বয়ংক্রিয়ভাবে
// ২ বার পর্যন্ত আবার চেষ্টা করা হয় (সামান্য বিরতি দিয়ে)।

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(doFetch, maxRetries) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await doFetch();
    } catch (err) {
      lastErr = err;
      // ভুল পাসওয়ার্ড/অবৈধ ইনপুট-জাতীয় GAS error আবার চেষ্টা করে লাভ নেই — শুধু
      // নেটওয়ার্ক/সাময়িক সমস্যার (gasError ফ্ল্যাগ ছাড়া) জন্যই retry করা হয়।
      if (err && err.gasError) throw err;
      if (attempt < maxRetries) await sleep(400 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function callGas(env, action, payload) {
  const url = env.GAS_WEBAPP_URL;
  if (!url) throw new Error('সার্ভার কনফিগারেশন সমস্যা: GAS_WEBAPP_URL সেট করা নেই');
  return fetchWithRetry(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({ action, key: env.SHEET_API_KEY, ...(payload || {}) }),
    });
    const data = await res.json();
    if (data && data.error) {
      const err = new Error(data.error);
      err.gasError = true;
      throw err;
    }
    return data;
  }, 2);
}

export async function callGasGet(env, action, params) {
  const url = env.GAS_WEBAPP_URL;
  if (!url) throw new Error('সার্ভার কনফিগারেশন সমস্যা: GAS_WEBAPP_URL সেট করা নেই');
  const qs = new URLSearchParams({
    action,
    key: env.SHEET_API_KEY || '',
    ...(params || {}),
  }).toString();
  return fetchWithRetry(async () => {
    const res = await fetch(url + '?' + qs, { redirect: 'follow' });
    const data = await res.json();
    if (data && data.error) {
      const err = new Error(data.error);
      err.gasError = true;
      throw err;
    }
    return data;
  }, 2);
}
