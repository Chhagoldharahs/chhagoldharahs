// অভ্যন্তরীণ শেয়ার্ড মডিউল — পোলের ভোট Cloudflare Workers KV-তে সেভ হয় (আগে
// Netlify Blobs-এ হতো, একই "SCHOOL_KV" namespace শেয়ার করে, আলাদা key দিয়ে
// আলাদা করা হয়েছে)। এতে সব ভিজিটরের জন্য ফলাফল একসাথে (লাইভ) দেখা যায়।

// pollId = প্রশ্নের টেক্সট থেকে বানানো একটা স্থিতিশীল কী (slug)। প্রশ্ন বদলালে
// pollId-ও বদলে যায়, ফলে নতুন প্রশ্নের ভোট শূন্য থেকে শুরু হয় — পুরনো প্রশ্নে ফিরে
// গেলে তার পুরনো ফলাফলও ফিরে আসে (আলাদাভাবে জমা থাকে)।
export function pollIdFromQuestion(question) {
  const str = String(question || '').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return 'poll_' + Math.abs(hash).toString(36);
}

export async function getResults(env, pollId) {
  const data = await env.SCHOOL_KV.get('poll:votes:' + pollId, { type: 'json' });
  return (data && Array.isArray(data.counts)) ? data.counts : [];
}

export async function castVote(env, pollId, optionIndex, numOptions) {
  const key = 'poll:votes:' + pollId;
  const data = await env.SCHOOL_KV.get(key, { type: 'json' });
  const counts = (data && Array.isArray(data.counts)) ? data.counts.slice() : [];
  while (counts.length < numOptions) counts.push(0);
  if (optionIndex >= 0 && optionIndex < counts.length) {
    counts[optionIndex] = (counts[optionIndex] || 0) + 1;
  }
  await env.SCHOOL_KV.put(key, JSON.stringify({ counts }));
  return counts;
}
