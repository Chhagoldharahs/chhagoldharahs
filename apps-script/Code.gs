/**
 * ছাগলধরা উচ্চ বিদ্যালয় — Google Sheets ডাটাবেস API (Apps Script)
 *
 * এই স্ক্রিপ্টটা শিটের সাথে বাউন্ড রাখুন: শিট খুলে Extensions > Apps Script
 * থেকে এই কোডটা পেস্ট করুন (SS বাউন্ড থাকলে সরাসরি এই শিটটাই পাবে)।
 *
 * ============ সেটআপ ============
 * ১) Project Settings (⚙️ আইকন) > Script Properties > "Add script property"
 *    নাম: SHEET_API_KEY, মান: একটা লম্বা র‍্যান্ডম স্ট্রিং (Cloudflare-এর SHEET_API_KEY-র সাথে হুবহু এক)।
 * ২) Deploy > New deployment > "Web app" — Execute as: Me, Who has access: Anyone।
 *    URL-টা Cloudflare-এর GAS_WEBAPP_URL-এ বসবে। ব্রাউজার/ফ্রন্টএন্ড কোডে কখনো দেবেন না।
 * ৩) কোড বদলালে প্রতিবার "Deploy > Manage deployments > Edit > নতুন ভার্সন" করতে হবে।
 *
 * ============ নিরাপত্তা (এই ভার্সনের নতুন অংশ) ============
 * ক) এখন doGet ও doPost — সব action-এই SHEET_API_KEY লাগে। শুধু আপনার Cloudflare
 *    সার্ভারই এই API ব্যবহার করতে পারবে; URL জেনে গেলেও বাইরের কেউ কিছু পড়তে/লিখতে পারবে না।
 * খ) সংবেদনশীল ট্যাব (Complaints, PushSubscription, BloodAlertLog, PollVotes) আলাদা
 *    প্রাইভেট স্প্রেডশিটে থাকবে (Script Property: PRIVATE_SHEET_ID)। মূল শিট "লিংকধারী সবাই
 *    দেখতে পারবে" থাকলেও এই ট্যাবগুলো কেউ পড়তে পারবে না।
 *    → একবার migratePrivateTabs() চালান, যাচাই করে removeOldPrivateTabsFromMain() চালান
 *      (নিচে ফাংশন দুটো আছে; ধাপগুলো ফাইলের শেষে আছে)।
 * গ) শিটে ফর্মুলা-ইনজেকশন বন্ধ: কেউ অভিযোগে "=IMPORTXML(...)" লিখলে সেটা আর ফর্মুলা হিসেবে
 *    চলবে না (লেখার সময় সামনে ' বসে যায়)।
 * ঘ) সব ইনপুটের দৈর্ঘ্য সীমা, সব লেখার কাজ একটা লকের ভেতরে (একসাথে দুটো ডিলিট/আপডেটে
 *    ভুল সারি মুছে যাওয়ার ঝুঁকি নেই)।
 * ঙ) ট্যাবের নাম মেলানোয় বাড়তি স্পেস/ছোট-বড় হাতের অক্ষরের ভুল (যেমন "Alumni " বা "alumni")
 *    এখন সামলে নেওয়া হয় — এটা Alumni লোড না হওয়ার সম্ভাব্য কারণ ছিল।
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();
const ALL_TOPICS = ['general', 'urgent', 'result', 'blood'];

// যে ট্যাবগুলো কোনোভাবেই পাবলিকলি পড়া যাওয়া উচিত নয় — এগুলো প্রাইভেট স্প্রেডশিটে যায়
const PRIVATE_TABS_ = ['Complaints', 'PushSubscription', 'BloodAlertLog', 'PollVotes'];

// ওয়েবসাইট যে ট্যাবগুলো পড়তে পারে (sheetData)
const PUBLIC_SHEETS_ = [
  'Routine', 'Results', 'ResultDocs', 'BoardResults', 'BoardResultLink', 'StudentCount', 'Holidays',
  'Teachers', 'Talents', 'Gallery', 'Downloads', 'About', 'Contact',
  'Events', 'Alumni', 'Banner', 'Messages', 'FeePayment', 'PollConfig',
];

const COMPLAINT_STATUSES_ = ['new', 'seen', 'resolved'];

// ---------- কী যাচাই ----------
function apiKey_() {
  return PropertiesService.getScriptProperties().getProperty('SHEET_API_KEY');
}
function safeEq_(a, b) {
  a = String(a == null ? '' : a);
  b = String(b == null ? '' : b);
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function checkKey_(input) {
  const key = apiKey_();
  return !!key && !!input && safeEq_(input.key, key);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- শিট খোঁজা ----------
let PRIV_SS_ = null;
function privateSS_() {
  if (PRIV_SS_) return PRIV_SS_;
  const id = PropertiesService.getScriptProperties().getProperty('PRIVATE_SHEET_ID');
  PRIV_SS_ = id ? SpreadsheetApp.openById(id) : SS; // PRIVATE_SHEET_ID সেট না থাকলে আগের মতোই মূল শিট
  return PRIV_SS_;
}
function findSheet_(ss, name) {
  const exact = ss.getSheetByName(name);
  if (exact) return exact;
  const want = String(name).trim().toLowerCase();
  const all = ss.getSheets();
  for (let i = 0; i < all.length; i++) {
    if (all[i].getName().trim().toLowerCase() === want) return all[i];
  }
  return null;
}
function sheet_(name) {
  const ss = PRIVATE_TABS_.indexOf(name) !== -1 ? privateSS_() : SS;
  const sh = findSheet_(ss, name);
  if (!sh) throw new Error('শিট পাওয়া যায়নি: ' + name);
  return sh;
}
function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}
function rowsAsObjects_(sh) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const hdrs = headers_(sh);
  const values = sh.getRange(2, 1, lastRow - 1, hdrs.length).getValues();
  return values.map((row, i) => {
    const obj = {};
    hdrs.forEach((h, j) => (obj[h] = row[j]));
    obj._row = i + 2; // শিটে আসল সারি নম্বর — আপডেট/ডিলিটের জন্য
    return obj;
  });
}

// ---------- লেখা (ফর্মুলা-ইনজেকশন বন্ধ করে) ----------
// = + - @ বা ট্যাব/CR দিয়ে শুরু হওয়া লেখা শিট ফর্মুলা ভেবে চালিয়ে দেয়
// (যেমন =IMPORTXML(...) দিয়ে ডেটা বাইরে পাঠানো যায়)। সামনে ' বসালে সাধারণ লেখাই থাকে।
function safeCell_(v) {
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(v)) return "'" + v;
  return v;
}
function clip_(v, n) {
  return String(v == null ? '' : v).trim().slice(0, n);
}
// লক doPost-এর একদম বাইরে একবারই নেওয়া হয় (নিচে), তাই এখানে আলাদা লক নেই
function appendObject_(sh, obj) {
  const hdrs = headers_(sh);
  const row = hdrs.map((h) => {
    const k = String(h).trim();
    if (h in obj) return safeCell_(obj[h]);
    return k in obj ? safeCell_(obj[k]) : '';
  });
  sh.appendRow(row);
}
function writeRow_(sh, rowNumber, hdrs, obj) {
  sh.getRange(rowNumber, 1, 1, hdrs.length).setValues([hdrs.map((h) => safeCell_(obj[h]))]);
}
function hashEndpoint_(endpoint) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, endpoint));
}
function validEndpoint_(ep) {
  return typeof ep === 'string' && /^https:\/\/[^\s]{10,600}$/.test(ep);
}

// ================= doGet: পড়ার (read) কাজ =================
function doGet(e) {
  try {
    if (!checkKey_(e && e.parameter)) return json_({ error: 'ভুল পাসওয়ার্ড' });
    const action = e.parameter.action;

    if (action === 'noticesList') {
      const list = rowsAsObjects_(sheet_('Notices')).sort((a, b) => b.createdAt - a.createdAt);
      return json_(list);
    }

    if (action === 'pollResults') {
      const votes = rowsAsObjects_(sheet_('PollVotes'));
      const counts = {};
      votes.forEach((v) => (counts[v.choice] = (counts[v.choice] || 0) + 1));
      return json_({ counts });
    }

    if (action === 'complaintsList') {
      return json_(rowsAsObjects_(sheet_('Complaints')).sort((a, b) => b.createdAt - a.createdAt));
    }

    if (action === 'bloodAlertsList') {
      const list = rowsAsObjects_(sheet_('BloodAlertLog')).sort((a, b) => b.createdAt - a.createdAt);
      return json_(list.slice(0, 50));
    }

    if (action === 'sheetData') {
      const sheetName = e.parameter.sheet;
      if (!sheetName || PUBLIC_SHEETS_.indexOf(sheetName) === -1) {
        return json_({ error: 'অবৈধ শিটের নাম' });
      }
      return json_(rowsAsObjects_(sheet_(sheetName)));
    }

    return json_({ error: 'অজানা action' });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

// ================= doPost: লেখার (write) কাজ =================
// সব লেখা একটা লকের ভেতরে — একসাথে দুটো রিকোয়েস্ট এলে একটা অপরটার শেষ হওয়া পর্যন্ত অপেক্ষা করে।
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ error: 'সার্ভার ব্যস্ত, একটু পরে আবার চেষ্টা করুন' });
  }
  try {
    return handlePost_(e);
  } catch (err) {
    return json_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function handlePost_(e) {
  const input = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (!checkKey_(input)) return json_({ error: 'ভুল পাসওয়ার্ড' });
  const action = input.action;

  if (action === 'noticeAdd') {
    if (!input.titleBn || !input.descBn) return json_({ error: 'শিরোনাম ও বিবরণ আবশ্যক' });
    const titleBn = clip_(input.titleBn, 300);
    const descBn = clip_(input.descBn, 5000);
    const notice = {
      id: 'n_' + Date.now(),
      dateISO: clip_(input.dateISO, 10) || Utilities.formatDate(new Date(), 'GMT+6', 'yyyy-MM-dd'),
      titleBn,
      titleEn: clip_(input.titleEn, 300) || titleBn,
      descBn,
      descEn: clip_(input.descEn, 5000) || descBn,
      createdAt: Date.now(),
    };
    appendObject_(sheet_('Notices'), notice);
    return json_({ ok: true, notice });
  }

  if (action === 'noticeUpdate') {
    if (!input.id) return json_({ error: 'id আবশ্যক' });
    const sh = sheet_('Notices');
    const found = rowsAsObjects_(sh).find((n) => n.id === input.id);
    if (!found) return json_({ error: 'নোটিশ পাওয়া যায়নি' });
    const hdrs = headers_(sh);
    const updated = {
      ...found,
      dateISO: clip_(input.dateISO, 10) || found.dateISO,
      titleBn: input.titleBn ? clip_(input.titleBn, 300) : found.titleBn,
      titleEn: input.titleEn ? clip_(input.titleEn, 300) : found.titleEn,
      descBn: input.descBn ? clip_(input.descBn, 5000) : found.descBn,
      descEn: input.descEn ? clip_(input.descEn, 5000) : found.descEn,
    };
    writeRow_(sh, found._row, hdrs, updated);
    return json_({ ok: true });
  }

  if (action === 'noticeDelete') {
    if (!input.id) return json_({ error: 'id আবশ্যক' });
    const sh = sheet_('Notices');
    const found = rowsAsObjects_(sh).find((n) => n.id === input.id);
    if (!found) return json_({ error: 'নোটিশ পাওয়া যায়নি' });
    sh.deleteRow(found._row);
    return json_({ ok: true });
  }

  if (action === 'complaintSubmit') {
    if (!input.details || !String(input.details).trim()) return json_({ error: 'বিবরণ আবশ্যক' });
    const complaint = {
      id: 'c_' + Date.now(),
      name: clip_(input.name, 100) || 'উল্লেখ করা হয়নি',
      cls: clip_(input.cls, 60) || 'উল্লেখ করা হয়নি',
      category: clip_(input.category, 60) || 'অন্যান্য',
      details: clip_(input.details, 3000),
      status: 'new',
      createdAt: Date.now(),
    };
    appendObject_(sheet_('Complaints'), complaint);
    return json_({ ok: true });
  }

  if (action === 'complaintUpdate') {
    if (!input.id) return json_({ error: 'id আবশ্যক' });
    if (COMPLAINT_STATUSES_.indexOf(input.status) === -1) return json_({ error: 'অবৈধ স্ট্যাটাস' });
    const sh = sheet_('Complaints');
    const found = rowsAsObjects_(sh).find((c) => c.id === input.id);
    if (!found) return json_({ error: 'অভিযোগ পাওয়া যায়নি' });
    const hdrs = headers_(sh);
    writeRow_(sh, found._row, hdrs, { ...found, status: input.status });
    return json_({ ok: true });
  }

  if (action === 'complaintDelete') {
    if (!input.id) return json_({ error: 'id আবশ্যক' });
    const sh = sheet_('Complaints');
    const found = rowsAsObjects_(sh).find((c) => c.id === input.id);
    if (!found) return json_({ error: 'অভিযোগ পাওয়া যায়নি' });
    sh.deleteRow(found._row);
    return json_({ ok: true });
  }

  if (action === 'pollVote') {
    const VALID = ['sports', 'debate', 'cultural', 'science'];
    if (VALID.indexOf(input.choice) === -1) return json_({ error: 'অবৈধ অপশন' });
    appendObject_(sheet_('PollVotes'), { id: 'v_' + Date.now(), choice: input.choice, createdAt: Date.now() });
    const votes = rowsAsObjects_(sheet_('PollVotes'));
    const counts = {};
    votes.forEach((v) => (counts[v.choice] = (counts[v.choice] || 0) + 1));
    return json_({ ok: true, counts });
  }

  if (action === 'bloodAlertAdd') {
    if (!input.bloodGroup || !input.contact) return json_({ error: 'রক্তের গ্রুপ ও যোগাযোগ নম্বর আবশ্যক' });
    const alert = {
      id: 'b_' + Date.now(),
      bloodGroup: clip_(input.bloodGroup, 6),
      location: clip_(input.location, 200),
      contact: clip_(input.contact, 30),
      note: clip_(input.note, 500),
      sent: Number(input.sent) || 0,
      createdAt: Date.now(),
    };
    appendObject_(sheet_('BloodAlertLog'), alert);
    return json_({ ok: true, alert });
  }

  if (action === 'subscribe') {
    if (!validEndpoint_(input.endpoint)) return json_({ error: 'অবৈধ সাবস্ক্রিপশন' });
    const p256dh = clip_(input.keys && input.keys.p256dh, 200);
    const auth = clip_(input.keys && input.keys.auth, 100);
    if (!p256dh || !auth) return json_({ error: 'অবৈধ সাবস্ক্রিপশন' });
    const topics = Array.isArray(input.topics) && input.topics.length
      ? input.topics.filter((t) => ALL_TOPICS.indexOf(t) !== -1)
      : ALL_TOPICS.slice();
    const key = hashEndpoint_(input.endpoint);
    const sh = sheet_('PushSubscription');
    const existing = rowsAsObjects_(sh).find((s) => s.key === key);
    const record = {
      key,
      endpoint: input.endpoint,
      p256dh,
      auth,
      topics: topics.join(','),
      createdAt: existing ? existing.createdAt : Date.now(),
    };
    if (existing) {
      writeRow_(sh, existing._row, headers_(sh), record);
    } else {
      appendObject_(sh, record);
    }
    return json_({ ok: true, topics });
  }

  if (action === 'preferences') {
    if (!validEndpoint_(input.endpoint)) return json_({ error: 'অবৈধ সাবস্ক্রিপশন' });
    const topics = Array.isArray(input.topics) ? input.topics.filter((t) => ALL_TOPICS.indexOf(t) !== -1) : ALL_TOPICS.slice();
    const key = hashEndpoint_(input.endpoint);
    const sh = sheet_('PushSubscription');
    const existing = rowsAsObjects_(sh).find((s) => s.key === key);
    if (!existing) return json_({ error: 'সাবস্ক্রিপশন পাওয়া যায়নি, প্রথমে নোটিফিকেশন চালু করুন' });
    writeRow_(sh, existing._row, headers_(sh), { ...existing, topics: topics.join(',') });
    return json_({ ok: true, topics });
  }

  if (action === 'unsubscribe') {
    if (typeof input.endpoint !== 'string' || !input.endpoint || input.endpoint.length > 700) {
      return json_({ error: 'অবৈধ সাবস্ক্রিপশন' });
    }
    const key = hashEndpoint_(input.endpoint);
    const sh = sheet_('PushSubscription');
    const existing = rowsAsObjects_(sh).find((s) => s.key === key);
    if (existing) sh.deleteRow(existing._row);
    return json_({ ok: true });
  }

  if (action === 'subscribersList') {
    // শুধু Cloudflare সার্ভার (sendPushToAll) কল করে
    const topic = input.topic;
    const list = rowsAsObjects_(sheet_('PushSubscription')).filter((s) => {
      if (!topic) return true;
      const topics = String(s.topics || '').split(',').filter(Boolean);
      if (!topics.length) return true; // পুরনো রেকর্ড — সব ক্যাটাগরি পাবে
      return topics.indexOf(topic) !== -1;
    });
    return json_(list.map((s) => ({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })));
  }

  return json_({ error: 'অজানা action' });
}

// =====================================================================
//  এককালীন কাজ: সংবেদনশীল ট্যাব প্রাইভেট স্প্রেডশিটে সরানো
//  (Apps Script এডিটরে ফাংশন বেছে ▶ Run চাপুন — এগুলো ওয়েব থেকে চালানো যায় না)
//
//  ধাপ ১) migratePrivateTabs ▶ Run  (প্রথমবার অনুমতি চাইবে — Allow করুন)
//         → "CHS প্রাইভেট ডেটা" নামে নতুন স্প্রেডশিট বানিয়ে ৪টা ট্যাব কপি করে,
//           আর PRIVATE_SHEET_ID সেট করে। (Execution log-এ লিংক দেখাবে।)
//  ধাপ ২) Deploy > Manage deployments > Edit > নতুন ভার্সন > Deploy
//  ধাপ ৩) ওয়েবসাইট থেকে একটা টেস্ট অভিযোগ জমা দিন ও admin.html-এ দেখুন — আসছে কিনা যাচাই।
//  ধাপ ৪) removeOldPrivateTabsFromMain ▶ Run — মূল শিট থেকে পুরনো ৪টা ট্যাব মুছে ফেলে
//         (শুধু যদি প্রাইভেট শিটে পুরো ডেটা থাকে; নইলে মোছে না)।
//  নতুন প্রাইভেট স্প্রেডশিট কারো সাথে শেয়ার করবেন না।
// =====================================================================
function migratePrivateTabs() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('PRIVATE_SHEET_ID');
  let priv;
  if (id) {
    priv = SpreadsheetApp.openById(id);
  } else {
    priv = SpreadsheetApp.create('CHS প্রাইভেট ডেটা (শেয়ার করবেন না)');
    id = priv.getId();
  }
  const done = [];
  const missing = [];
  PRIVATE_TABS_.forEach((name) => {
    if (priv.getSheetByName(name)) { done.push(name + ' (আগেই আছে)'); return; }
    const src = findSheet_(SS, name);
    if (!src) { missing.push(name); return; }
    const copy = src.copyTo(priv);
    copy.setName(name);
    done.push(name);
  });
  // নতুন স্প্রেডশিটের ডিফল্ট ফাঁকা ট্যাব মুছে ফেলা
  priv.getSheets().forEach((s) => {
    const n = s.getName();
    if ((n === 'Sheet1' || n === 'শীট১' || n === 'শিট১') && priv.getSheets().length > 1) priv.deleteSheet(s);
  });
  props.setProperty('PRIVATE_SHEET_ID', id);
  Logger.log('প্রাইভেট স্প্রেডশিট: ' + priv.getUrl());
  Logger.log('কপি হয়েছে: ' + done.join(', '));
  if (missing.length) Logger.log('মূল শিটে এই ট্যাব ছিল না (সমস্যা নেই, পরে লাগলে তৈরি করবেন): ' + missing.join(', '));
  Logger.log('এখন নতুন ভার্সন Deploy করুন, টেস্ট করুন, তারপর removeOldPrivateTabsFromMain চালান।');
}

function removeOldPrivateTabsFromMain() {
  const id = PropertiesService.getScriptProperties().getProperty('PRIVATE_SHEET_ID');
  if (!id) { Logger.log('আগে migratePrivateTabs চালান।'); return; }
  const priv = SpreadsheetApp.openById(id);
  if (priv.getId() === SS.getId()) { Logger.log('PRIVATE_SHEET_ID মূল শিটের আইডিই — মোছা হয়নি।'); return; }
  PRIVATE_TABS_.forEach((name) => {
    const main = findSheet_(SS, name);
    const copy = priv.getSheetByName(name);
    if (!main) return;
    if (!copy) { Logger.log(name + ': প্রাইভেট শিটে কপি নেই — মোছা হয়নি।'); return; }
    if (copy.getLastRow() < main.getLastRow()) { Logger.log(name + ': প্রাইভেট শিটে সারি কম — মোছা হয়নি।'); return; }
    SS.deleteSheet(main);
    Logger.log(name + ': মূল শিট থেকে মোছা হয়েছে।');
  });
}
