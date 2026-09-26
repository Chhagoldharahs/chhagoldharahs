// GET (ইতিহাস) / POST (নতুন অ্যালার্ট) / DELETE (মুছে ফেলা) — /api/blood-alert
// GET ও DELETE শুধু admin.html থেকে (x-admin-key দরকার)। POST admin.html-এর
// "এখনই অ্যালার্ট পাঠান" ফর্ম থেকে আসে। ডেটা Cloudflare Workers KV-তে সেভ হয়।

import { addAlert, listAlerts, deleteAlert } from '../_blood-alert-store.js';
import { addNotice } from '../_notices-store.js';
import { sendPushToAll } from '../_push-helper.js';

function isAuthorized(request, env) {
  const key = request.headers.get('x-admin-key');
  return !!key && !!env.ADMIN_PASSWORD && key === env.ADMIN_PASSWORD;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) {
    return new Response(JSON.stringify({ error: 'ভুল পাসওয়ার্ড' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const alerts = await listAlerts(env);
    return new Response(JSON.stringify(alerts), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'ইতিহাস লোড করতে সমস্যা হয়েছে' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
    await deleteAlert(env, id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'মুছতে সমস্যা হয়েছে' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
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
  if (!input.bloodGroup || !input.contact) {
    return new Response(JSON.stringify({ error: 'রক্তের গ্রুপ ও যোগাযোগ নম্বর আবশ্যক' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const bloodGroup = String(input.bloodGroup).trim();
  const location = (input.location && String(input.location).trim()) || '';
  const contact = String(input.contact).trim();
  const note = (input.note && String(input.note).trim()) || '';

  const title = '🩸 জরুরি রক্তের প্রয়োজন — ' + bloodGroup;
  const bodyParts = [];
  if (location) bodyParts.push(location);
  bodyParts.push('যোগাযোগঃ ' + contact);
  if (note) bodyParts.push(note);
  const body = bodyParts.join(' — ');

  try {
    // এটা জরুরি বিবেচনা করে সবার কাছে পাঠানো হয় (topic ফিল্টার ছাড়াই), যাতে
    // সত্যিই "সবার ওয়েবসাইট ও অ্যাপে" নোটিফিকেশন পৌঁছায়।
    const result = await sendPushToAll(env, title, body, './school.html#cat24');

    try {
      await addAlert(env, { bloodGroup, location, contact, note, sent: result.sent });
    } catch (e) {
      // লগ সেভ ব্যর্থ হলেও অ্যালার্ট ঠিকই পাঠানো হয়ে গেছে, তাই সেটাকে ব্যর্থ ধরা হয় না
    }

    // পুশ নোটিফিকেশনের পাশাপাশি এই অ্যালার্টটা "জরুরি ঘোষণা ব্যানার" হিসেবেও সাইটের
    // একদম উপরে দেখানো হচ্ছে (নোটিশ পাইপলাইন দিয়েই)।
    try {
      await addNotice(env, {
        dateISO: new Date().toISOString().slice(0, 10),
        titleBn: title,
        titleEn: '🩸 Urgent blood needed — ' + bloodGroup,
        descBn: body,
        descEn: body,
        isEmergency: true,
      });
    } catch (e) {
      // ব্যানার নোটিশ তৈরি ব্যর্থ হলেও পুশ নোটিফিকেশন ঠিকই পাঠানো হয়ে গেছে
    }

    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'পাঠাতে সমস্যা হয়েছে: ' + (err && err.message ? err.message : 'অজানা') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
