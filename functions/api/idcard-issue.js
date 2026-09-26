// POST /api/idcard-issue
// idcard.html থেকে "প্রিন্ট / ডাউনলোড" করার সময় কল হয়।
// ক্যাটাগরি-লগইন কোড (student/teacher/staff) সার্ভার সাইডেও মিলিয়ে
// দেখা হয়, যাতে idcard.html-এর লগইন বাইপাস করে সরাসরি এই এন্ডপয়েন্ট
// কল করে ভুয়া "যাচাইকৃত" কার্ড বানানো না যায়।

import { issueCard } from '../_idcard-store.js';

// idcard.html-এর LOGIN_CODES-এর সাথে হুবহু মিলিয়ে রাখা আবশ্যক
const LOGIN_CODES = {
  student: 'CHSST2483',
  teacher: 'CHSTC4283',
  staff: 'CHSSTF8243',
};

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'ভুল ডেটা' }), { status: 400 });
  }

  const type = input.type;
  const code = String(input.code || '').trim().toUpperCase();
  if (!LOGIN_CODES[type] || code !== LOGIN_CODES[type]) {
    return new Response(JSON.stringify({ error: 'অনুমোদিত নয়' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!input.name || !String(input.name).trim()) {
    return new Response(JSON.stringify({ error: 'নাম আবশ্যক' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const card = await issueCard(env, {
      type,
      name: input.name,
      classLabel: input.classLabel,
      section: input.section,
      roll: input.roll,
      session: input.session,
      idNo: input.idNo,
      blood: input.blood,
      phone: input.phone,
    });
    return new Response(JSON.stringify({ ok: true, id: card.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'সংরক্ষণ ব্যর্থ: ' + (err && err.message ? err.message : '') }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
