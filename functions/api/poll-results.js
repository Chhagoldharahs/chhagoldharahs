// GET /api/poll-results?question=...
// পাবলিক এন্ডপয়েন্ট — নির্দিষ্ট প্রশ্নের পোলের বর্তমান ফলাফল (প্রতিটা অপশনে কতগুলো
// ভোট) ফেরত দেয়। Cloudflare Workers KV থেকে সরাসরি পড়া হয়, তাই সবসময় লাইভ।

import { pollIdFromQuestion, getResults } from '../_poll-store.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const question = url.searchParams.get('question');
  if (!question) {
    return new Response(JSON.stringify({ error: 'question আবশ্যক' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const pollId = pollIdFromQuestion(question);
    const counts = await getResults(env, pollId);
    return new Response(JSON.stringify({ counts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'ফলাফল লোড করতে সমস্যা হয়েছে' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
