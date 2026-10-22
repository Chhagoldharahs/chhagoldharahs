// অভ্যন্তরীণ শেয়ার্ড মডিউল — পাসওয়ার্ড/কী মেলানো (constant-time), লগইন-চেষ্টা সীমা ও
// অ্যাডমিন সেশন-টোকেন (2FA পাস করার পর যে টোকেন মেলে, সেটাই সব অ্যাডমিন এন্ডপয়েন্টে চলে)।

// দুটো স্ট্রিং সমান কিনা — সময় নির্ভর না করে (timing attack এড়াতে) তুলনা করে
export function safeEqual(a, b) {
  a = String(a == null ? '' : a);
  b = String(b == null ? '' : b);
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

const MAX_FAILS = 10;      // এতবার ভুল হলে সাময়িক আটকে যাবে
const WINDOW_SEC = 900;    // ১৫ মিনিট
const SESSION_SEC = 8 * 3600; // অ্যাডমিন সেশন ৮ ঘণ্টা

function ipOf(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

export async function isLockedOut(request, env, scope) {
  try {
    const v = await env.SCHOOL_KV.get((scope || 'admin') + '-fail:' + ipOf(request));
    return (parseInt(v || '0', 10) || 0) >= MAX_FAILS;
  } catch (e) {
    return false;
  }
}

export async function recordFail(request, env, scope) {
  try {
    const k = (scope || 'admin') + '-fail:' + ipOf(request);
    const n = (parseInt((await env.SCHOOL_KV.get(k)) || '0', 10) || 0) + 1;
    await env.SCHOOL_KV.put(k, String(n), { expirationTtl: WINDOW_SEC });
  } catch (e) {}
}

export async function clearFails(request, env, scope) {
  try { await env.SCHOOL_KV.delete((scope || 'admin') + '-fail:' + ipOf(request)); } catch (e) {}
}

// ===== সেশন টোকেন (KV ছাড়াই — HMAC সই করা, তাই সব লোকেশনে সাথে সাথে কাজ করে) =====
function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

function sessionSecret(env) {
  // পাসওয়ার্ড বা TOTP_SECRET বদলালে আগের সব সেশন নিজে থেকেই বাতিল হয়ে যায়
  return 'chs-admin-session|' + (env.ADMIN_PASSWORD || '') + '|' + (env.TOTP_SECRET || '');
}

export async function createAdminSession(env) {
  if (!env.ADMIN_PASSWORD) return '';
  const exp = Date.now() + SESSION_SEC * 1000;
  return exp + '.' + (await hmacHex(sessionSecret(env), 'v1.' + exp));
}

async function verifySession(token, env) {
  const m = /^(\d{10,16})\.([a-f0-9]{64})$/.exec(String(token || ''));
  if (!m || !env.ADMIN_PASSWORD) return false;
  if (Number(m[1]) < Date.now()) return false;
  const expected = await hmacHex(sessionSecret(env), 'v1.' + m[1]);
  return safeEqual(expected, m[2]);
}

// সব অ্যাডমিন এন্ডপয়েন্ট এটা ব্যবহার করে (await দিতে হবে)।
// - 2FA (TOTP_SECRET) চালু থাকলে শুধু verify-admin থেকে পাওয়া সেশন-টোকেনই চলবে;
//   শুধু পাসওয়ার্ড দিয়ে সরাসরি API কল করা যাবে না।
// - TOTP_SECRET না থাকলে পাসওয়ার্ডও চলবে (আগের মতো)।
// - ভুল চেষ্টা ১৫ মিনিটে ১০ বারের বেশি হলে সাময়িক আটকে যায়।
export async function isAdminRequest(request, env) {
  const key = request.headers.get('x-admin-key');
  if (!key) return false;
  if (await isLockedOut(request, env, 'admin')) return false;
  if (await verifySession(key, env)) return true;
  if (!env.TOTP_SECRET && env.ADMIN_PASSWORD && safeEqual(key, env.ADMIN_PASSWORD)) return true;
  await recordFail(request, env, 'admin');
  return false;
}

// অভ্যন্তরীণ (সার্ভার থেকে সার্ভারে) কল যাচাইয়ের কী — পুশ-ব্যাচ এন্ডপয়েন্টের জন্য
export async function internalKey(env) {
  return hmacHex('chs-internal|' + (env.SHEET_API_KEY || '') + '|' + (env.ADMIN_PASSWORD || ''), 'push-batch');
}
