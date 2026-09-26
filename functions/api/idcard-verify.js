// GET /api/idcard-verify?id=xxx
// এটি পাবলিক এন্ডপয়েন্ট (কোনো অথেন্টিকেশন লাগে না) — QR স্ক্যান করা
// যে কেউ কার্ডটি আসল কিনা যাচাই করতে পারবে। শুধু পড়ার অনুমতি আছে,
// কোনো ডেটা এখান দিয়ে পরিবর্তন করা যায় না।

import { getCard, incrementScan } from '../_idcard-store.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'id প্রয়োজন' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const card = await getCard(env, id);
    if (!card) {
      return new Response(JSON.stringify({ found: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    const updated = await incrementScan(env, id);
    return new Response(JSON.stringify({ found: true, card: updated || card }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'যাচাই ব্যর্থ' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
