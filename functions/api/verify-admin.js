// POST /api/verify-admin
// ওয়েবসাইটের নিচের "Admin" বাটনে দুই-ধাপ যাচাইয়ের (2FA) জন্য — পাসওয়ার্ড ও
// Authenticator app থেকে পাওয়া ৬-ডিজিট কোড, দুটোই মিলতে হবে। ADMIN_PASSWORD ও
// TOTP_SECRET-এর আসল মান কখনো ব্রাউজারে পাঠানো হয় না, শুধু server-side এ
// তুলনা করা হয় — শুধু true/false রিটার্ন করে।

import { verifyTotp } from '../_totp.js';
import { safeEqual, isLockedOut, recordFail, clearFails, createAdminSession } from '../_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }
  const password = input && input.password;
  const code = input && input.code;

  if (await isLockedOut(request, env)) {
    return new Response(JSON.stringify({ ok: false, reason: 'locked' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const passwordOk = !!password && !!env.ADMIN_PASSWORD && safeEqual(password, env.ADMIN_PASSWORD);
  if (!passwordOk) {
    await recordFail(request, env);
    return new Response(JSON.stringify({ ok: false, reason: 'password' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TOTP_SECRET সেট না থাকলে (এখনো 2FA সেটআপ করা না হলে) শুধু পাসওয়ার্ডেই মেনে নেওয়া হয়,
  // যাতে সেটআপের আগে অ্যাডমিন প্যানেল থেকে লক-আউট হয়ে না যান।
  if (!env.TOTP_SECRET) {
    await clearFails(request, env);
    return new Response(JSON.stringify({ ok: true, token: await createAdminSession(env) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const codeOk = await verifyTotp(env.TOTP_SECRET, code);
  if (codeOk) await clearFails(request, env); else await recordFail(request, env);
  return new Response(JSON.stringify({ ok: codeOk, reason: codeOk ? undefined : 'code', token: codeOk ? await createAdminSession(env) : undefined }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
