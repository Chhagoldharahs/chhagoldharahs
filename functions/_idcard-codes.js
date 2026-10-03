// আইডি কার্ড জেনারেটরের ক্যাটাগরি-লগইন কোড — এখন আর ব্রাউজারের কোডে নেই, শুধু সার্ভারে।
// Cloudflare Pages > Settings > Variables and secrets-এ এই তিনটা সেট করতে হবে:
//   IDCARD_CODE_STUDENT, IDCARD_CODE_TEACHER, IDCARD_CODE_STAFF
// সেট না থাকলে ওই ক্যাটাগরির লগইন বন্ধ থাকে (ইচ্ছাকৃত — ডিফল্ট কোড রাখা নিরাপদ নয়)।
import { safeEqual, isLockedOut, recordFail, clearFails } from './_auth.js';

const VAR = {
  student: 'IDCARD_CODE_STUDENT',
  teacher: 'IDCARD_CODE_TEACHER',
  staff: 'IDCARD_CODE_STAFF',
};

// রিটার্ন: 'ok' | 'bad' | 'locked' | 'unconfigured'
export async function checkIdcardCode(request, env, type, code) {
  const name = VAR[type];
  if (!name) return 'bad';
  if (await isLockedOut(request, env, 'idcard')) return 'locked';
  const expected = String(env[name] || '').trim().toUpperCase();
  if (!expected) return 'unconfigured';
  const entered = String(code || '').trim().toUpperCase();
  if (entered && safeEqual(entered, expected)) {
    await clearFails(request, env, 'idcard');
    return 'ok';
  }
  await recordFail(request, env, 'idcard');
  return 'bad';
}
