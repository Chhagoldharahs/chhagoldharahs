// হালকা রেট-লিমিট (IP প্রতি, নির্দিষ্ট সময়ের জানালায়) — বট/স্প্যাম ঠেকাতে।
// সীমা ইচ্ছা করে উদারভাবে রাখা: স্কুলের একই Wi-Fi থেকে অনেক শিক্ষার্থী একই IP-তে দেখা যায়।
// সীমা পেরোলে আর KV-তে লেখা হয় না (শুধু পড়া), তাই আক্রমণে KV-এর দৈনিক write-সীমা ফুরায় না।

export function ipOf(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

// রিটার্ন: true = সীমা পেরিয়ে গেছে (রিকোয়েস্ট ফিরিয়ে দিন)
export async function overLimit(request, env, scope, max, windowSec) {
  try {
    const bucket = Math.floor(Date.now() / 1000 / windowSec);
    const key = 'rl:' + scope + ':' + ipOf(request) + ':' + bucket;
    const n = parseInt((await env.SCHOOL_KV.get(key)) || '0', 10) || 0;
    if (n >= max) return true;
    await env.SCHOOL_KV.put(key, String(n + 1), { expirationTtl: Math.max(60, windowSec * 2) });
    return false;
  } catch (e) {
    return false; // KV সমস্যা হলে ব্যবহারকারীকে আটকানো হয় না
  }
}

export function tooMany() {
  return new Response(JSON.stringify({ error: 'অনেক বেশি অনুরোধ, একটু পরে আবার চেষ্টা করুন' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });
}
