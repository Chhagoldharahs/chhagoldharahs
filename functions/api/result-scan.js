// POST /api/result-scan
// মার্কশীটের QR (?verify=result&c=..&r=..) স্ক্যান হলে এখানে একটা কাউন্ট
// বাড়ানো হয় — সন্দেহজনক অতিরিক্ত স্ক্যান শনাক্ত করতে সাহায্য করে।
// একই SCHOOL_KV namespace ব্যবহার হচ্ছে, নতুন কোনো বাইন্ডিং লাগবে না।

import { overLimit, tooMany } from '../_ratelimit.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'ভুল ডেটা' }), { status: 400 });
  }
  const clean = (v) => String(v || '').trim().replace(/[^0-9A-Za-z\u0980-\u09FF_.-]/g, '').slice(0, 24);
  const c = clean(input.c);
  const g = clean(input.g);
  const r = clean(input.r);
  if (!c || !r) {
    return new Response(JSON.stringify({ error: 'c ও r প্রয়োজন' }), { status: 400 });
  }
  if (await overLimit(request, env, 'scan', 60, 3600)) return tooMany();
  const key = `result-scan:${c}-${g}-${r}`;
  try {
    const current = parseInt((await env.SCHOOL_KV.get(key)) || '0', 10) || 0;
    const next = current + 1;
    await env.SCHOOL_KV.put(key, String(next));
    return new Response(JSON.stringify({ ok: true, count: next }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'গণনা ব্যর্থ' }), { status: 500 });
  }
}
