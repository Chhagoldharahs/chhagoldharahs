// আইডি কার্ড ভেরিফিকেশন ডেটা Cloudflare Workers KV-তে রাখা হয়
// (নোটিশ সিস্টেমে ব্যবহৃত একই SCHOOL_KV namespace ব্যবহার হচ্ছে,
// আলাদা কোনো নতুন বাইন্ডিং সেটআপ করার দরকার নেই)
//
// প্রতিটি ইস্যু-করা কার্ডের একটি ইউনিক id তৈরি হয় — QR কোডে শুধু
// idcard.html?verify=<id> লিংকটাই বসে, নাম/রোল/ক্লাস ইত্যাদি নয়।
// স্ক্যান করার পর সেই id দিয়ে এখান থেকে আসল তথ্য টেনে দেখানো হয়,
// ফলে QR-এর ভেতরের ডেটা বদলে ভুয়া কার্ড দেখানো সম্ভব নয়।

const KEY = 'idcards:all';
const MAX_CARDS = 5000;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function issueCard(env, input) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
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
    scanCount: 0,
  };
  list.unshift(card);
  if (list.length > MAX_CARDS) list.length = MAX_CARDS;
  await env.SCHOOL_KV.put(KEY, JSON.stringify(list));
  return card;
}

export async function getCard(env, id) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
  return list.find((c) => c.id === id) || null;
}

// প্রতিবার সফল ভেরিফিকেশনে স্ক্যান-কাউন্ট ১ বাড়ানো হয় — অস্বাভাবিক
// অতিরিক্ত স্ক্যান (সন্দেহজনক ব্যবহার) নজরে আনতে সাহায্য করবে
export async function incrementScan(env, id) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
  const card = list.find((c) => c.id === id);
  if (!card) return null;
  card.scanCount = (card.scanCount || 0) + 1;
  await env.SCHOOL_KV.put(KEY, JSON.stringify(list));
  return card;
}
