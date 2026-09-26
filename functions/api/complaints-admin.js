// GET/PUT/DELETE /api/complaints-admin
// শুধু admin.html থেকে ব্যবহার হয়। x-admin-key হেডার দিয়ে যাচাই করা হয়।
// GET দিয়ে সব অভিযোগ দেখা যায়, PUT দিয়ে স্ট্যাটাস (new/seen/resolved) বদলানো
// যায়, DELETE দিয়ে মুছে ফেলা যায়। ডেটা Google Sheet-এর Complaints ট্যাবে থাকে।

import { callGas, callGasGet } from '../_gas-client.js';

const VALID_STATUS = ['new', 'seen', 'resolved'];

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
    const complaints = await callGasGet(env, 'complaintsList');
    return new Response(JSON.stringify(Array.isArray(complaints) ? complaints : []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'সার্ভার সমস্যা: ' + (err && err.message ? err.message : 'অজানা'),
      debug: String((err && err.message) || err),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
  if (!input.id || !VALID_STATUS.includes(input.status)) {
    return new Response(JSON.stringify({ error: 'id ও বৈধ status আবশ্যক' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    await callGas(env, 'complaintUpdate', { id: input.id, status: input.status });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'সার্ভার সমস্যা: ' + (err && err.message ? err.message : 'অজানা'),
      debug: String((err && err.message) || err),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
    await callGas(env, 'complaintDelete', { id });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'সার্ভার সমস্যা: ' + (err && err.message ? err.message : 'অজানা'),
      debug: String((err && err.message) || err),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
