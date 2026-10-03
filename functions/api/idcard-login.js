// POST /api/idcard-login  { type, code }
// idcard.html-এর লগইন এখন এখান থেকে যাচাই হয় (কোড আর ব্রাউজারে থাকে না)।
import { checkIdcardCode } from '../_idcard-codes.js';

const J = { 'Content-Type': 'application/json' };

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try { input = await request.json(); } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: J });
  }
  const r = await checkIdcardCode(request, env, input && input.type, input && input.code);
  if (r === 'ok') return new Response(JSON.stringify({ ok: true }), { status: 200, headers: J });
  if (r === 'locked') return new Response(JSON.stringify({ ok: false, reason: 'locked' }), { status: 429, headers: J });
  if (r === 'unconfigured') return new Response(JSON.stringify({ ok: false, reason: 'unconfigured' }), { status: 503, headers: J });
  return new Response(JSON.stringify({ ok: false, reason: 'bad' }), { status: 401, headers: J });
}
