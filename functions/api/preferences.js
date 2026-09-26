// POST /api/preferences
// ব্যবহারকারী নোটিফিকেশন সেটিংসে গিয়ে কোন ক্যাটাগরির নোটিফিকেশন পেতে চান তা বদলালে
// এখানে আপডেট হয়। body: { endpoint, topics: ['general','result',...] }

import { callGas } from '../_gas-client.js';

const ALL_TOPICS = ['general', 'urgent', 'result', 'blood'];

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'অবৈধ ডেটা' }), { status: 400 });
  }

  if (!input || !input.endpoint) {
    return new Response(JSON.stringify({ error: 'অবৈধ সাবস্ক্রিপশন' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const topics = Array.isArray(input.topics)
    ? input.topics.filter((t) => ALL_TOPICS.includes(t))
    : ALL_TOPICS.slice();

  try {
    const result = await callGas(env, 'preferences', { endpoint: input.endpoint, topics });
    return new Response(JSON.stringify({ ok: true, topics: result.topics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const notFound = err && err.gasError && /পাওয়া যায়নি/.test(err.message || '');
    return new Response(JSON.stringify({ error: (err && err.message) || 'সেভ করতে সমস্যা হয়েছে' }), {
      status: notFound ? 404 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
