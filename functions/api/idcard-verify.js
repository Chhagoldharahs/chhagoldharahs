// GET /api/idcard-verify?id=xxx
// পাবলিক এন্ডপয়েন্ট — QR স্ক্যান করা যে কেউ কার্ডটি আসল কিনা যাচাই করতে পারবে।
// গোপনীয়তার জন্য ফোন নম্বর এখান থেকে কখনো ফেরত যায় না।

import { getCard, incrementScan, isValidId } from '../_idcard-store.js';

const J = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id || !isValidId(id)) {
    return new Response(JSON.stringify({ found: false }), { status: 200, headers: J });
  }
  try {
    const card = await getCard(env, id);
    if (!card) {
      return new Response(JSON.stringify({ found: false }), { status: 200, headers: J });
    }
    let scanCount = 0;
    try { scanCount = await incrementScan(env, id); } catch (e) {}
    const { phone, ...safe } = card;
    return new Response(JSON.stringify({ found: true, card: { ...safe, scanCount } }), { status: 200, headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'যাচাই ব্যর্থ' }), { status: 500, headers: J });
  }
}
