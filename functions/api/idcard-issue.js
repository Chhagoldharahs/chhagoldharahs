// POST /api/idcard-issue
// idcard.html থেকে "প্রিন্ট / ডাউনলোড" করার সময় কল হয়।
// ক্যাটাগরি-লগইন কোড (student/teacher/staff) সার্ভার সাইডে মিলিয়ে দেখা হয় —
// কোডগুলো Cloudflare-এর এনভায়রনমেন্ট ভ্যারিয়েবলে থাকে (_idcard-codes.js দেখুন)।

import { issueCard } from '../_idcard-store.js';
import { checkIdcardCode } from '../_idcard-codes.js';

const J = { 'Content-Type': 'application/json' };
const clip = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, n);

export async function onRequestPost(context) {
  const { request, env } = context;
  let input;
  try {
    input = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'ভুল ডেটা' }), { status: 400, headers: J });
  }

  const r = await checkIdcardCode(request, env, input.type, input.code);
  if (r !== 'ok') {
    return new Response(JSON.stringify({ error: r === 'locked' ? 'অনেকবার ভুল হয়েছে, কিছুক্ষণ পর চেষ্টা করুন' : 'অনুমোদিত নয়' }), {
      status: r === 'locked' ? 429 : 401,
      headers: J,
    });
  }
  if (!input.name || !String(input.name).trim()) {
    return new Response(JSON.stringify({ error: 'নাম আবশ্যক' }), { status: 400, headers: J });
  }

  try {
    const card = await issueCard(env, {
      type: input.type,
      name: clip(input.name, 100),
      classLabel: clip(input.classLabel, 60),
      section: clip(input.section, 30),
      roll: clip(input.roll, 20),
      session: clip(input.session, 20),
      idNo: clip(input.idNo, 30),
      blood: clip(input.blood, 6),
      phone: clip(input.phone, 20),
    });
    return new Response(JSON.stringify({ ok: true, id: card.id }), { status: 200, headers: J });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'সংরক্ষণ ব্যর্থ' }), { status: 500, headers: J });
  }
}
