// অভ্যন্তরীণ শেয়ার্ড মডিউল — নোটিশ Cloudflare Workers KV-তে সেভ হয় (আগে Netlify
// Blobs-এ হতো)। KV হলো Cloudflare-এর নিজস্ব দ্রুতগতির key-value স্টোরেজ, ব্যবহার
// করতে হলে Cloudflare Pages ড্যাশবোর্ডে একটা KV namespace বানিয়ে "SCHOOL_KV"
// নামে বাইন্ড করে দিতে হবে (Settings > Functions > KV namespace bindings)।
//
// সবগুলো নোটিশ একটামাত্র JSON এন্ট্রিতে (key: "notices:all") রাখা হয় — নোটিশ
// বোর্ডে সাধারণত কয়েকশোর বেশি এন্ট্রি থাকে না, তাই পুরো লিস্ট একসাথে পড়া/লেখা
// সহজ ও নির্ভরযোগ্য (Netlify Blobs সংস্করণের একই নকশা)।

const KEY = 'notices:all';
const MAX_NOTICES = 300;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function listNotices(env) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const notices = Array.isArray(data) ? data : [];
  // সর্বশেষ প্রকাশিত নোটিশ সবার আগে
  return [...notices].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

async function saveNotices(env, notices) {
  await env.SCHOOL_KV.put(KEY, JSON.stringify(notices));
}

export async function addNotice(env, input) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
  const notice = {
    id: genId(),
    createdAt: Date.now(),
    dateISO: input.dateISO || new Date().toISOString().slice(0, 10),
    titleBn: input.titleBn,
    titleEn: input.titleEn || input.titleBn,
    descBn: input.descBn,
    descEn: input.descEn || input.descBn,
    isEmergency: !!input.isEmergency,
  };
  list.unshift(notice);
  if (list.length > MAX_NOTICES) list.length = MAX_NOTICES;
  await saveNotices(env, list);
  return notice;
}

export async function updateNotice(env, id, input) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) {
    throw new Error('নোটিশ পাওয়া যায়নি');
  }
  list[idx] = {
    ...list[idx],
    dateISO: input.dateISO !== undefined ? input.dateISO : list[idx].dateISO,
    titleBn: input.titleBn !== undefined ? input.titleBn : list[idx].titleBn,
    titleEn: input.titleEn !== undefined ? input.titleEn : list[idx].titleEn,
    descBn: input.descBn !== undefined ? input.descBn : list[idx].descBn,
    descEn: input.descEn !== undefined ? input.descEn : list[idx].descEn,
    isEmergency: input.isEmergency !== undefined ? !!input.isEmergency : list[idx].isEmergency,
  };
  await saveNotices(env, list);
  return list[idx];
}

export async function deleteNotice(env, id) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
  await saveNotices(env, list.filter((n) => n.id !== id));
}
