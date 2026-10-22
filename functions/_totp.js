// অভ্যন্তরীণ শেয়ার্ড মডিউল — Google Authenticator/Authy-জাতীয় অ্যাপের সাথে সামঞ্জস্যপূর্ণ
// TOTP (Time-based One-Time Password, RFC 6238) কোড যাচাই করে।
//
// === Netlify → Cloudflare রূপান্তরের নোট ===
// Netlify-তে Node.js-এর `crypto` মডিউল (crypto.createHmac) ব্যবহার হতো, যেটা
// সিঙ্ক্রোনাস (synchronous)। Cloudflare Workers-এ Node.js-এর সেই মডিউল নেই —
// এখানে ব্রাউজারের মতোই Web Crypto API (`crypto.subtle`) ব্যবহার করতে হয়, যেটা
// অ্যাসিঙ্ক্রোনাস (async/Promise)। তাই generateTotp ও verifyTotp দুটোই এখন
// async ফাংশন — যেখানে এগুলো কল হয় সেখানে অবশ্যই `await` দিতে হবে।
// এছাড়া Cloudflare Pages Functions ES module (import/export) সিনট্যাক্স
// ব্যবহার করে, তাই require()/module.exports-এর বদলে import/export।

function base32Decode(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const clean = String(base32).toUpperCase().replace(/[^A-Z2-7]/g, '');
  for (const char of clean) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

export async function generateTotp(secretBase32, timeStepSeconds, forTimestamp) {
  const keyBytes = base32Decode(secretBase32);
  const counter = Math.floor((forTimestamp || Date.now()) / 1000 / (timeStepSeconds || 30));

  const counterBuf = new ArrayBuffer(8);
  const counterView = new DataView(counterBuf);
  // 64-bit counter কে দুটো 32-bit অংশে ভাগ করে লেখা হচ্ছে (BigInt ছাড়াই)
  counterView.setUint32(0, Math.floor(counter / 0x100000000));
  counterView.setUint32(4, counter % 0x100000000);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuf);
  const hmac = new Uint8Array(signature);

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = binCode % 1000000;
  return String(code).padStart(6, '0');
}

// clock-drift সহনশীলতার জন্য বর্তমান + আগের/পরের ৩০ সেকেন্ড — মোট ৩টা windows চেক করা হয়
export async function verifyTotp(secretBase32, userCode) {
  if (!secretBase32 || !userCode) return false;
  const cleanCode = String(userCode).replace(/\D/g, '');
  if (cleanCode.length !== 6) return false;
  const now = Date.now();
  for (const offsetSteps of [0, -1, 1]) {
    const expected = await generateTotp(secretBase32, 30, now + offsetSteps * 30000);
    if (expected === cleanCode) return true;
  }
  return false;
}
