// POST /api/complaints-submit
// পাবলিক এন্ডপয়েন্ট — যে কেউ অভিযোগ/মতামত জমা দিতে পারে। ডেটা Google Sheet-এর
// Complaints ট্যাবে সেভ হয় (Apps Script API দিয়ে)।

import { callGas } from '../_gas-client.js';

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

  try {
    await callGas(env, 'complaintSubmit', {
      name: input.name,
      cls: input.cls,
      category: input.category,
      details: input.details,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({
      error: 'জমা দিতে সমস্যা হয়েছে',
      debug: String((err && err.message) || err),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
