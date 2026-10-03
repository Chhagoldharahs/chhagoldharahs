// আইডি কার্ড ভেরিফিকেশন ডেটা Cloudflare Workers KV-তে রাখা হয় (একই SCHOOL_KV)।
//
// প্রতিটি কার্ড আলাদা key-তে ("idcard:<id>") — আগে সব কার্ড একটা বিশাল তালিকায় ছিল
// (৫০০০-এর সীমা ভরে গেলে পুরনো আসল কার্ড হারিয়ে যেত, আর একসাথে লিখলে ডেটা মিশে যেত)।
// আগের তালিকায় ("idcards:all") থাকা পুরনো কার্ডগুলোও যাচাইয়ের সময় খুঁজে পাওয়া যায়।
// QR কোডে শুধু idcard.html?verify=<id> থাকে — আসল তথ্য এখান থেকে টেনে দেখানো হয়।

const LEGACY_KEY = 'idcards:all';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function isValidId(id) {
  return /^[a-z0-9]{6,30}$/.test(String(id || ''));
}

export async function issueCard(env, input) {
  const card = {
    id: genId(),
    createdAt: Date.now(),
    type: input.type || '',
    name: input.name || '',
    classLabel: input.classLabel || '',
    section: input.section || '',
    roll: input.roll || '',
    session: input.session || '',
    idNo: input.idNo || '',
    blood: input.blood || '',
    phone: input.phone || '',
  };
  await env.SCHOOL_KV.put('idcard:' + card.id, JSON.stringify(card));
  return card;
}

export async function getCard(env, id) {
  if (!isValidId(id)) return null;
  const one = await env.SCHOOL_KV.get('idcard:' + id, { type: 'json' });
  if (one) return one;
  const data = await env.SCHOOL_KV.get(LEGACY_KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
  return list.find((c) => c.id === id) || null;
}

// সফল ভেরিফিকেশনে স্ক্যান-কাউন্ট ১ বাড়ে (আলাদা ছোট key-তে) — অস্বাভাবিক স্ক্যান নজরে আনতে
export async function incrementScan(env, id) {
  const k = 'idscan:' + id;
  const n = (parseInt((await env.SCHOOL_KV.get(k)) || '0', 10) || 0) + 1;
  await env.SCHOOL_KV.put(k, String(n));
  return n;
}
