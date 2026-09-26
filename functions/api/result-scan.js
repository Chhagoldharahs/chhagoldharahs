// POST /api/result-scan
// মার্কশীটের QR (?verify=result&c=..&r=..) স্ক্যান হলে এখানে একটা কাউন্ট
// বাড়ানো হয় — সন্দেহজনক অতিরিক্ত স্ক্যান শনাক্ত করতে সাহায্য করে।
// একই SCHOOL_KV namespace ব্যবহার হচ্ছে, নতুন কোনো বাইন্ডিং লাগবে না।

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'ভুল ডেটা' }), { status: 400 });
  }
  const c = String(input.c || '').trim();
  const g = String(input.g || '').trim();
  const r = String(input.r || '').trim();
  if (!c || !r) {
    return new Response(JSON.stringify({ error: 'c ও r প্রয়োজন' }), { status: 400 });
  }
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
