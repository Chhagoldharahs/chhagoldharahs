// GET /api/day-greeting?key=GREETING_SECRET
// প্রতিদিন সকালে (cron-job.org থেকে) কল হবে। আজ কোনো দিবস হলে —
//   ১) নোটিশ বোর্ডে শুভেচ্ছা নোটিশ যোগ করে, ২) সব সাবস্ক্রাইবারকে পুশ পাঠায়।
// আজ দিবস না থাকলে কিছুই করে না। একই দিনে দুবার কল হলেও বার্তা একবারই যায়।
//
// পরীক্ষার জন্য: ...&date=2026-12-16&dry=1  → আসলে কিছু না পাঠিয়ে শুধু দেখায় কী যেত।
//
// এনভায়রনমেন্ট ভ্যারিয়েবল:
//   GREETING_SECRET   (আবশ্যক) গোপন কী
//   HIJRI_OFFSET_DAYS (ঐচ্ছিক) বাংলাদেশ সাধারণত সৌদির ১ দিন পরে চাঁদ দেখে, তাই ডিফল্ট ১।
//                      ঈদের দিন ১ দিন এদিক-ওদিক হলে এটা ০ বা ২ করে দেখুন।

import { addNotice } from '../_notices-store.js';
import { sendPushToAll } from '../_push-helper.js';
import { safeEqual } from '../_auth.js';
import { FIXED_DAYS, LUNAR_DAYS } from '../_special-days.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

// ঢাকার আজকের তারিখ (UTC+6) — YYYY-MM-DD
function dhakaToday() {
  return new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}

function hijriOf(isoDate, offsetDays) {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - offsetDays);
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).formatToParts(d);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { hm: get('month'), hd: get('day') };
}

export function daysFor(isoDate, offsetDays) {
  const md = isoDate.slice(5);
  const out = FIXED_DAYS.filter((x) => x.md === md);
  const h = hijriOf(isoDate, offsetDays);
  out.push(...LUNAR_DAYS.filter((x) => x.hm === h.hm && x.hd === h.hd));
  return out;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.GREETING_SECRET || !safeEqual(url.searchParams.get('key'), env.GREETING_SECRET)) {
    return json({ error: 'অননুমোদিত' }, 401);
  }

  const dateParam = url.searchParams.get('date');
  const today = /^\d{4}-\d{2}-\d{2}$/.test(dateParam || '') ? dateParam : dhakaToday();
  const dry = url.searchParams.get('dry') === '1';
  const offset = Number.isFinite(Number(env.HIJRI_OFFSET_DAYS)) && env.HIJRI_OFFSET_DAYS !== undefined && env.HIJRI_OFFSET_DAYS !== ''
    ? Number(env.HIJRI_OFFSET_DAYS) : 1;

  const days = daysFor(today, offset);
  if (days.length === 0) return json({ ok: true, date: today, message: 'আজ কোনো দিবস নেই' });
  if (dry) return json({ ok: true, dry: true, date: today, days: days.map((d) => d.title) });

  const results = [];
  for (const day of days) {
    const flag = `greeting:${today}:${day.title}`;
    if (await env.SCHOOL_KV.get(flag)) {
      results.push({ day: day.title, skipped: 'আজ ইতিমধ্যে পাঠানো হয়েছে' });
      continue;
    }
    // আগে চিহ্ন বসানো হয়, যাতে একসাথে দুটো কল এলেও দুবার না যায়
    await env.SCHOOL_KV.put(flag, '1', { expirationTtl: 3 * 24 * 3600 });
    try {
      await addNotice(env, {
        dateISO: today,
        titleBn: day.title + ' — শুভেচ্ছা',
        titleEn: day.en + ' — Greetings',
        descBn: day.msg,
        descEn: `On behalf of Chhagoldhara High School, warm greetings on ${day.en}.`,
        isEmergency: false,
      });
      const push = await sendPushToAll(env, 'ছাগলধরা উচ্চ বিদ্যালয়', day.msg, './school.html', '', url.origin);
      results.push({ day: day.title, notice: true, push });
    } catch (err) {
      await env.SCHOOL_KV.delete(flag).catch(() => {});
      results.push({ day: day.title, error: err && err.message ? err.message : 'অজানা' });
    }
  }
  return json({ ok: true, date: today, results });
}
