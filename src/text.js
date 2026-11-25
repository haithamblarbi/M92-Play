/*
  نظام النصوص العربي/الإنجليزي لمنصة M92 PLAY
  ------------------------------------------------
  كل ما يخص مقارنة ما يكتبه المشاهد في الشات مع الإجابة الصحيحة يمر من هنا،
  حتى تتصرف جميع الألعاب بنفس الطريقة، ويمكن نقل هذا الملف كما هو إلى السيرفر لاحقًا.

  1) normalize: توحيد الأحرف والأرقام والمسافات (تشكيل، تطويل، همزات، ى/ي، ة/ه، أرقام هندية، حالة الأحرف).
  2) matchAnswer: يقارن الرسالة بإجابة (أو عدة إجابات بديلة) ويعيد نوع المطابقة.
  3) parseCommand: أوامر الشات "!join" و"!شارك".
*/

const TASHKEEL = /[ً-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g;

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXT_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** تحويل الأرقام الهندية/الفارسية إلى 0-9 */
export function westernDigits(s) {
  return String(s).replace(/[٠-٩۰-۹]/g, ch => {
    const a = ARABIC_INDIC.indexOf(ch);
    return String(a >= 0 ? a : EXT_INDIC.indexOf(ch));
  });
}

/** تنظيف خفيف يحافظ على الشكل (للعرض والمقارنة الصارمة) */
export function clean(s) {
  return String(s ?? '').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
}

/**
 * تطبيع للمقارنة المتسامحة.
 * options.strict=true يُبقي الهمزات والتاء المربوطة ويقارن حرفيًا (مع تجاهل الحالة والتشكيل فقط).
 */
export function normalize(s, { strict = false } = {}) {
  let t = westernDigits(clean(s)).normalize('NFKC').toLowerCase().replace(TASHKEEL, '').replace(TATWEEL, '');
  if (!strict) {
    t = t.replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ؤ]/g, 'و').replace(/[ئ]/g, 'ي').replace(/ة/g, 'ه');
  }
  // إزالة الترقيم والرموز (تُبقي الحروف والأرقام من كل اللغات)
  return t.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** صيغ الرسالة للمقارنة (الرسالة كما كُتبت فقط) */
export function variants(text) {
  return [{ text: clean(text), fixed: false }];
}

/** مسافة التحرير (لاكتشاف التخمين القريب) */
export function distance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** فصل الإجابات البديلة: "7|سبعة|seven" */
export const splitAnswers = a => String(a).split(/[|،,]/).map(x => x.trim()).filter(Boolean);

/**
 * مطابقة رسالة مع إجابة/إجابات.
 * يعيد: { ok, close, answer }
 *   ok          مطابقة تامة (بعد التطبيع)
 *   close       تخمين قريب (فرق حرف واحد) دون أن يكون صحيحًا
 */
export function matchAnswer(text, answers, { strict = false, allowClose = true } = {}) {
  const list = (Array.isArray(answers) ? answers : splitAnswers(answers)).filter(Boolean);
  const targets = list.map(a => ({ a, n: normalize(a, { strict }) }));
  let close = false;
  for (const v of variants(text)) {
    const n = normalize(v.text, { strict });
    if (!n) continue;
    for (const t of targets) {
      if (n === t.n) return { ok: true, close: false, answer: t.a };
      // بعض الإجابات بلا مسافات ("نيو يورك" / "نيويورك")
      if (n.replace(/ /g, '') === t.n.replace(/ /g, '')) return { ok: true, close: false, answer: t.a };
      if (allowClose && t.n.length >= 4 && distance(n, t.n) === 1) close = true;
    }
  }
  return { ok: false, close, answer: null };
}

/* ---------------- الأوامر ---------------- */
/*
  الاسم الأول هو الأمر القياسي، والباقي مرادفات (عربية وإنجليزية).
  تُقارن بعد التطبيع، فلا يهم التشكيل أو شكل الهمزة.
*/
export const COMMANDS = {
  join: ['join', 'شارك', 'انضم', 'دخول', 'دخل'],
  start: ['start', 'ابدا', 'بدء', 'ابدأ'],
  spin: ['spin', 'دور', 'ادر', 'لف'],
  next: ['next', 'التالي', 'السؤال التالي'],
  reset: ['reset', 'restart', 'اعادة', 'إعادة', 'إعادة ضبط'],
  sit: ['sit', 'اجلس', 'جلوس'],
  answer: ['answer', 'a', 'ans', 'جواب', 'اجابه', 'إجابة', 'ج'],
  word: ['word', 'w', 'كلمه', 'كلمة', 'ك']
};

const ALIAS_INDEX = (() => {
  const m = new Map();
  Object.entries(COMMANDS).forEach(([canon, list]) => list.forEach(a => m.set(normalize(a), canon)));
  return m;
})();

/** يحوّل كلمة أمر (بعد "!") إلى الاسم القياسي أو null */
function canonical(word) {
  for (const v of variants(word)) {
    const hit = ALIAS_INDEX.get(normalize(v.text));
    if (hit) return hit;
  }
  return null;
}

/**
 * parseCommand("!شارك")        → { cmd:'join', args:'', raw:'!شارك' }
 * parseCommand("!ANSWER الرياض")→ { cmd:'answer', args:'الرياض' }
 * رسالة عادية بلا "!"          → null
 * يقبل "!" الإنجليزية والعربية الكاملة "！" ويقبل "/" أيضًا.
 */
export function parseCommand(text) {
  const t = clean(text).replace(/^[！]/, '!');
  const m = t.match(/^[!\/]\s*(\S+)(?:\s+([\s\S]*))?$/);
  if (!m) return null;
  const cmd = canonical(m[1]);
  return cmd ? { cmd, args: (m[2] || '').trim(), raw: t } : { cmd: null, args: (m[2] || '').trim(), raw: t, unknown: m[1] };
}

/** مضيف المنصة: مقارنة مرنة لاسم المستخدم (M92 / m92) */
export const isHost = (user, host = 'M92') => normalize(user) === normalize(host);

/**
 * اسم قابل للعرض بأمان في واجهة تمزج RTL وLTR:
 * يُغلّف بعزل ثنائي الاتجاه كي لا تنقلب علامات الترقيم والأرقام بجوار الاسم.
 */
export const safeName = s => `⁨${clean(s)}⁩`;

/** هل الاتجاه الغالب للنص عربي؟ (لضبط dir) */
export const dirOf = s => (/[؀-ۿ]/.test(String(s)) ? 'rtl' : /[a-z]/i.test(String(s)) ? 'ltr' : 'auto');
