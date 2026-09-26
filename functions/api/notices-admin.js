// POST/PUT/DELETE /api/notices-admin
// শুধু admin.html থেকে ব্যবহার হয়। প্রতিটি রিকোয়েস্টে হেডারে x-admin-key পাঠাতে হবে,
// যেটা Cloudflare Pages-এ সেট করা ADMIN_PASSWORD এনভায়রনমেন্ট ভ্যারিয়েবলের
// সাথে মিলতে হবে। ডেটা Cloudflare Workers KV-তে সেভ হয় (_notices-store.js দিয়ে)।
// নতুন নোটিশ প্রকাশ (POST) হলে সাথে সাথে সব সাবস্ক্রাইবারকে পুশ নোটিফিকেশন পাঠানো হয়।

import { addNotice, updateNotice, deleteNotice } from '../_notices-store.js';
import { sendPushToAll } from '../_push-helper.js';

function isAuthorized(request, env) {
  const key = request.headers.get('x-admin-key');
  return !!key && !!env.ADMIN_PASSWORD && key === env.ADMIN_PASSWORD;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'ভুল পাসওয়ার্ড' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'অবৈধ ডেটা' }), { status: 400 });
  }
  if (!input.titleBn || !input.descBn) {
    return new Response(JSON.stringify({ error: 'শিরোনাম ও বিবরণ আবশ্যক' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const notice = await addNotice(env, {
      dateISO: input.dateISO,
      titleBn: input.titleBn,
      titleEn: input.titleEn,
      descBn: input.descBn,
      descEn: input.descEn,
      isEmergency: input.isEmergency,
    });

    let pushSent = true;
    try {
      await sendPushToAll(env, notice.titleBn, notice.descBn, './school.html#cat8');
    } catch (e) {
      pushSent = false;
    }

    return new Response(JSON.stringify({ ok: true, notice, pushSent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'সার্ভার সমস্যা: ' + (err && err.message ? err.message : 'অজানা') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'ভুল পাসওয়ার্ড' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'অবৈধ ডেটা' }), { status: 400 });
  }
  if (!input.id) {
    return new Response(JSON.stringify({ error: 'id আবশ্যক' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    await updateNotice(env, input.id, input);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'সার্ভার সমস্যা: ' + (err && err.message ? err.message : 'অজানা') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'ভুল পাসওয়ার্ড' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ error: 'id আবশ্যক' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    await deleteNotice(env, id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'সার্ভার সমস্যা: ' + (err && err.message ? err.message : 'অজানা') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
