// POST /api/verify-admin
// ওয়েবসাইটের নিচের "Admin" বাটনে দুই-ধাপ যাচাইয়ের (2FA) জন্য — পাসওয়ার্ড ও
// Authenticator app থেকে পাওয়া ৬-ডিজিট কোড, দুটোই মিলতে হবে। ADMIN_PASSWORD ও
// TOTP_SECRET-এর আসল মান কখনো ব্রাউজারে পাঠানো হয় না, শুধু server-side এ
// তুলনা করা হয় — শুধু true/false রিটার্ন করে।

import { verifyTotp } from '../_totp.js';

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

  const passwordOk = !!password && !!env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD;
  if (!passwordOk) {
    return new Response(JSON.stringify({ ok: false, reason: 'password' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // TOTP_SECRET সেট না থাকলে (এখনো 2FA সেটআপ করা না হলে) শুধু পাসওয়ার্ডেই মেনে নেওয়া হয়,
  // যাতে সেটআপের আগে অ্যাডমিন প্যানেল থেকে লক-আউট হয়ে না যান।
  if (!env.TOTP_SECRET) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const codeOk = await verifyTotp(env.TOTP_SECRET, code);
  return new Response(JSON.stringify({ ok: codeOk, reason: codeOk ? undefined : 'code' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
