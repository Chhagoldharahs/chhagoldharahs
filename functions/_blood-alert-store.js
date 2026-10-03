// অভ্যন্তরীণ শেয়ার্ড মডিউল — জরুরি রক্তদান অ্যালার্টের ইতিহাস Cloudflare Workers
// KV-তে সেভ হয় (আগে Netlify Blobs-এ হতো, একই "SCHOOL_KV" namespace শেয়ার করে,
// শুধু আলাদা key দিয়ে আলাদা করা হয়েছে)।

const KEY = 'blood:alerts:all';
const MAX_ALERTS = 50;

function genId() {
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function listAlerts(env) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  return Array.isArray(data) ? data : [];
}

export async function addAlert(env, entry) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
  const item = { id: genId(), createdAt: Date.now(), ...entry };
  list.unshift(item);
  if (list.length > MAX_ALERTS) list.length = MAX_ALERTS;
  await env.SCHOOL_KV.put(KEY, JSON.stringify(list));
  return item;
}

export async function deleteAlert(env, id) {
  const data = await env.SCHOOL_KV.get(KEY, { type: 'json' });
  const list = Array.isArray(data) ? data : [];
  const filtered = list.filter((a) => a.id !== id);
  await env.SCHOOL_KV.put(KEY, JSON.stringify(filtered));
  return filtered;
}
