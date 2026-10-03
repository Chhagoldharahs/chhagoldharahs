// POST /api/complaints-submit
// পাবলিক এন্ডপয়েন্ট — যে কেউ অভিযোগ/মতামত জমা দিতে পারে। ডেটা Google Sheet-এর
// Complaints ট্যাবে সেভ হয় (Apps Script API দিয়ে)।

import { callGas } from '../_gas-client.js';
import { overLimit, tooMany } from '../_ratelimit.js';

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'অবৈধ ডেটা' }), { status: 400 });
  }

  if (!input || !input.details || !String(input.details).trim()) {
    return new Response(JSON.stringify({ error: 'বিবরণ আবশ্যক' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (await overLimit(request, env, 'complaint', 10, 3600)) return tooMany();

  try {
    await callGas(env, 'complaintSubmit', {
      name: clip(input.name, 100),
      cls: clip(input.cls, 60),
      category: clip(input.category, 60),
      details: clip(input.details, 3000),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'জমা দিতে সমস্যা হয়েছে',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
