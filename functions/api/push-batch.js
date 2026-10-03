// POST /api/push-batch — শুধু সার্ভার থেকে সার্ভারে (_push-helper.js কল করে), পাবলিক নয়।
// হেডারে x-internal-key না মিললে ৪০১। এক ব্যাচে সর্বোচ্চ ৪০ সাবস্ক্রাইবারকে পুশ পাঠায়।
import { internalKey, safeEqual } from '../_auth.js';
import { parseVapid, sendChunk } from '../_push-helper.js';

const J = { 'Content-Type': 'application/json' };

export async function onRequestPost(context) {
  const { request, env } = context;
  const given = request.headers.get('x-internal-key') || '';
  if (!given || !safeEqual(given, await internalKey(env))) {
    return new Response(JSON.stringify({ error: 'অননুমোদিত' }), { status: 401, headers: J });
  }
  let input;
  try { input = await request.json(); } catch (e) {
    return new Response(JSON.stringify({ error: 'অবৈধ ডেটা' }), { status: 400, headers: J });
  }
  const privateJWK = parseVapid(env);
  if (!privateJWK || !Array.isArray(input.subs) || !input.payload) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: J });
  }
  const r = await sendChunk(env, privateJWK, input.payload, input.topic || '', input.subs.slice(0, 40));
  return new Response(JSON.stringify({ sent: r.sent }), { status: 200, headers: J });
}
