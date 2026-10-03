# দিবসের স্বয়ংক্রিয় শুভেচ্ছা — সেটআপ (একবারই)

## ধাপ ১: ফাইল বসান
এই দুটো ফাইল আপনার সাইটের প্রজেক্টে একই জায়গায় বসিয়ে ডিপ্লয় করুন:
- `functions/_special-days.js`
- `functions/api/day-greeting.js`

## ধাপ ২: গোপন কী বসান
Cloudflare Pages → Settings → Environment variables → নতুন ভ্যারিয়েবল:
- নাম: `GREETING_SECRET`
- মান: একটা কঠিন র‍্যান্ডম লেখা (যেমন `chs-greet-7Xk29pQ...`)
ভ্যারিয়েবল বসানোর পর আবার ডিপ্লয় করুন।

## ধাপ ৩: পরীক্ষা (কিছু না পাঠিয়ে)
ব্রাউজারে খুলুন:
`https://আপনার-সাইট/api/day-greeting?key=গোপন-কী&date=2026-12-16&dry=1`
"মহান বিজয় দিবস" দেখালে ঠিক আছে।

## ধাপ ৪: প্রতিদিন সকালে ডাকার ব্যবস্থা (cron-job.org)
1. cron-job.org-এ ফ্রি অ্যাকাউন্ট খুলুন
2. Create cronjob → URL: `https://আপনার-সাইট/api/day-greeting?key=গোপন-কী`
3. Schedule: প্রতিদিন সকাল ৮:০০, Timezone: Asia/Dhaka
4. Save

এরপর আর কিছু করতে হবে না।

## জানা দরকার
- ঈদ, আশুরা ইত্যাদির তারিখ কোড নিজে হিসাব করে। চাঁদ দেখার কারণে কোনো বছর ১ দিন এদিক-ওদিক হলে `HIJRI_OFFSET_DAYS` ভ্যারিয়েবলে `0` বা `2` দিয়ে ঠিক করা যায়।
- নতুন দিবস (যেমন স্কুল প্রতিষ্ঠা দিবস) যোগ করতে `_special-days.js`-এর `FIXED_DAYS`-এ একটা লাইন বসান।
- `SCHOOL_KV` বাইন্ডিং আগে থেকেই আছে, নতুন কিছু বাইন্ড করতে হবে না।

## ব্যানারের থিম (school.html)
- নোটিফিকেশনের প্রতিটি দিবসে (সব ১৬টি) ব্যানারে নিজস্ব থিম আসে। তালিকা `_special-days.js`-এর সাথে মেলানো।
- ঈদ/রমজান/আশুরা ইত্যাদির তারিখ সার্ভারের মতো একই হিসাবে বের হয়, তাই নোটিফিকেশন আর থিম একই দিনে আসে।
- চাঁদ দেখার কারণে ১ দিন এদিক-ওদিক হলে দুটো মান একসাথে বদলান: সার্ভারে `HIJRI_OFFSET_DAYS` এবং school.html-এর `DT_HIJRI_OFFSET`।
- আগে দেখতে: `school.html?daytheme=` + একটি নাম — ekushey, independence, boishakh, nazrul, intellectuals, victory, hijri-new, ashura, miladunnabi, meraj, barat, ramadan, qadr, arafah, eid-fitr, eid-adha
- নতুন দিবস `_special-days.js`-এ যোগ করলে school.html-এর `DT_FIXED` বা `DT_LUNAR`-এও একটা লাইন যোগ করুন।
