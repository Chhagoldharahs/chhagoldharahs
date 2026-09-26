// POST /api/unsubscribe
// ব্যবহারকারী নোটিফিকেশন বন্ধ করলে তার সাবস্ক্রিপশন Google Sheet থেকে মুছে ফেলা হয়।

import { callGas } from '../_gas-client.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'অবৈধ ডেটা' }), { status: 400 });
  }

  if (!body || !body.endpoint) {
    return new Response(JSON.stringify({ error: 'অবৈধ সাবস্ক্রিপশন' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    await callGas(env, 'unsubscribe', { endpoint: body.endpoint });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'সমস্যা হয়েছে' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
