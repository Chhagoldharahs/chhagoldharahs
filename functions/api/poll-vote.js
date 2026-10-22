// POST /api/poll-vote
// পাবলিক এন্ডপয়েন্ট — ওয়েবসাইটের পোলে একটা ভোট জমা দেয়। প্রশ্ন ও অপশন Google
// Sheet-এর "PollConfig" ট্যাব থেকে ডাইনামিক আসে, ভোটের সংখ্যা Cloudflare
// Workers KV-তে সেভ হয়।

import { pollIdFromQuestion, castVote } from '../_poll-store.js';
import { overLimit, tooMany } from '../_ratelimit.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'অবৈধ ডেটা' }), { status: 400 });
  }

  const question = input && input.question;
  const optionIndex = input && Number(input.optionIndex);
  const numOptions = input && Number(input.numOptions);

  if (!question || String(question).length > 300 || !Number.isInteger(optionIndex) || optionIndex < 0 ||
      !Number.isInteger(numOptions) || numOptions < 2 || numOptions > 10 || optionIndex >= numOptions) {
    return new Response(JSON.stringify({ error: 'অবৈধ অপশন' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (await overLimit(request, env, 'poll', 30, 3600)) return tooMany();

  try {
    const pollId = pollIdFromQuestion(question);
    const counts = await castVote(env, pollId, optionIndex, numOptions);
    return new Response(JSON.stringify({ ok: true, counts }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'ভোট দিতে সমস্যা হয়েছে' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
