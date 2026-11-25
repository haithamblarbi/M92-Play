import React, { useEffect, useRef } from 'react';
import { Play, Square, SkipForward, Trophy, RotateCcw, Keyboard } from 'lucide-react';
import { Shell, Row, Person, Seg, T, HOST, rnd, pick, shuffle, useForce } from './ui.jsx';
import { parseCommand, matchAnswer, isHost } from './text.js';

/*
  سرعة الكتابة — تظهر كلمة أو رقم أو رمز على الشاشة، وأسرع مشاهد يكتبها في الشات يأخذ النقاط.
  - لا يحتاج المشاهد إلى أي أمر: أي رسالة تُقارن مباشرة بالهدف (ويقبل !a و !answer أيضًا).
  - المقارنة تتسامح مع التشكيل والهمزات والأرقام الهندية (٤٨٢١ = 4821) وحالة الأحرف.
*/

const POOL = {
  ar: [
    ['باب', 'قلم', 'بحر', 'شمس', 'نجم', 'تمر', 'ورد', 'قمر', 'خبز', 'ماء', 'جبل', 'ليل'],
    ['مدرسة', 'سيارة', 'شجرة', 'مكتبة', 'حديقة', 'طائرة', 'برتقال', 'مطبخ', 'صحراء', 'مفتاح', 'قهوة', 'أرنب'],
    ['مستشفى', 'استوديو', 'مهندسة', 'كمبيوتر', 'تلفزيون', 'مغامرة', 'مشاهدين', 'مسابقة', 'بطولة المجتمع', 'لحظة الفوز']
  ],
  en: [
    ['cat', 'sun', 'map', 'fish', 'moon', 'game', 'play', 'win', 'live', 'chat', 'gold', 'fast'],
    ['stream', 'rocket', 'gaming', 'winner', 'thunder', 'viewer', 'camera', 'button', 'player', 'finish'],
    ['championship', 'subscriber', 'leaderboard', 'notification', 'adventure', 'competition', 'community', 'broadcast']
  ]
};

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '0123456789';
const CODE_LEN = [4, 6, 8];
const NUM_LEN = [3, 5, 7];

function makeTarget(kind, level) {
  const lv = level - 1;
  if (kind === 'ar') return { text: pick(POOL.ar[lv]), kind: 'ar' };
  if (kind === 'en') return { text: pick(POOL.en[lv]), kind: 'en' };
  if (kind === 'num') {
    let s = String(1 + rnd(9)); for (let i = 1; i < NUM_LEN[lv]; i++) s += DIGITS[rnd(10)];
    return { text: s, kind: 'num' };
  }
  // code: حروف كبيرة وأرقام (بدون الأحرف المتشابهة O/I/0/1)
  const pool = LETTERS + '23456789';
  let s = ''; for (let i = 0; i < CODE_LEN[lv]; i++) s += pool[rnd(pool.length)];
  return { text: s, kind: 'code' };
}

const KIND_LABEL = { ar: 'كلمة عربية', en: 'English word', num: 'رقم', code: 'رمز' };
const POINTS = [5, 3, 2];  // المركز الأول والثاني والثالث، والبقية نقطة واحدة

export function TypeRace({ reg }) {
  const force = useForce();
  const D = useRef(null);
  if (!D.current) {
    let cfg = {}; try { cfg = JSON.parse(localStorage.getItem('m92_game_options') || '{}').typing || {}; } catch {}
    D.current = {
    set: { kind: cfg.language === 'ar' ? 'ar' : cfg.language === 'en' ? 'en' : 'mix', level: Math.max(1,Math.min(3,Number(cfg.level)||2)), rounds: [3,5,10].includes(Number(cfg.rounds))?Number(cfg.rounds):5, secs: Number(cfg.duration) || 30, cap: 3, strict: false },
    phase: 'idle',           // idle | count | live | between | done
    round: 0, target: null, hits: [], wrong: 0, count: 3,
    scores: {}, wins: {}, best: {}, history: [], used: new Set(),
    startAt: 0, elapsed: 0, iv: 0, tm: 0
    };
  }
  const d = D.current;
  useEffect(() => () => { clearInterval(d.iv); clearTimeout(d.tm); }, []);

  const pickKind = () => {
    const k = d.set.kind;
    if (k !== 'mix') return k;
    return pick(['ar', 'en', 'num', 'code']);
  };
  const nextTarget = () => {
    for (let i = 0; i < 20; i++) {
      const t = makeTarget(pickKind(), d.set.level);
      if (!d.used.has(t.text)) { d.used.add(t.text); return t; }
    }
    return makeTarget(pickKind(), d.set.level);
  };

  const finishRound = () => {
    clearInterval(d.iv); clearTimeout(d.tm);
    d.hits.forEach((h, i) => {
      const p = POINTS[i] ?? 1;
      h.pts = p; d.scores[h.name] = (d.scores[h.name] || 0) + p;
      if (!d.best[h.name] || h.ms < d.best[h.name]) d.best[h.name] = h.ms;
    });
    if (d.hits[0]) d.wins[d.hits[0].name] = (d.wins[d.hits[0].name] || 0) + 1;
    d.history = [{ n: d.round, text: d.target.text, kind: d.target.kind, winner: d.hits[0]?.name || '', ms: d.hits[0]?.ms || 0, count: d.hits.length }, ...d.history].slice(0, 8);
    d.phase = d.round >= d.set.rounds ? 'done' : 'between';
    force();
  };

  const goLive = () => {
    d.phase = 'live'; d.startAt = performance.now(); d.elapsed = 0;
    clearInterval(d.iv);
    d.iv = setInterval(() => {
      d.elapsed = performance.now() - d.startAt;
      if (d.elapsed >= d.set.secs * 1000) finishRound(); else force();
    }, 100);
    force();
  };

  const beginRound = () => {
    clearInterval(d.iv); clearTimeout(d.tm);
    d.round += 1; d.target = nextTarget(); d.hits = []; d.wrong = 0; d.count = 3; d.phase = 'count'; d.elapsed = 0;
    const tick = () => {
      d.count -= 1;
      if (d.count <= 0) goLive(); else { force(); d.tm = setTimeout(tick, 800); }
    };
    d.tm = setTimeout(tick, 800);
    force();
  };
  const startSeries = () => {
    d.round = 0; d.scores = {}; d.wins = {}; d.best = {}; d.history = []; d.used = new Set();
    beginRound();
    return 'بدأت المسابقة ⌨️';
  };
  const stopAll = () => { clearInterval(d.iv); clearTimeout(d.tm); d.phase = 'idle'; d.round = 0; d.target = null; d.hits = []; force(); };
  const skip = () => { if (d.phase === 'live') finishRound(); else if (d.phase === 'between') beginRound(); };

  const submit = (user, text) => {
    if (d.phase !== 'live') return null;
    const res = matchAnswer(text, [d.target.text], { strict: d.set.strict, allowClose: d.target.kind === 'ar' || d.target.kind === 'en' });
    if (!res.ok) {
      d.wrong += 1;
      return res.close ? `${user}: قريب جدًا! ✍️` : null;
    }
    if (d.hits.some(h => h.name === user)) return `${user} سجّلت مسبقًا`;
    const ms = Math.round(performance.now() - d.startAt);
    d.hits.push({ name: user, ms });
    const rank = d.hits.length;
    if (rank >= d.set.cap) finishRound(); else force();
    return `${user}: المركز ${rank} ⚡ ${ms}ms`;
  };

  reg.current = {
    handle: (user, text) => {
      const c = parseCommand(text);
      if (c?.cmd === 'start') return isHost(user, HOST) ? (d.phase === 'between' ? (beginRound(), 'الجولة التالية') : startSeries()) : 'هذا الأمر للمضيف فقط';
      if (c?.cmd === 'join') return 'لا حاجة للتسجيل — اكتب الكلمة فقط ✍️';
      if (c?.cmd === 'answer') return submit(user, c.args);
      if (c) return null;
      return submit(user, text);
    },
    // يستخدمها محاكي الشات لإنتاج رسالة صحيحة/خاطئة
    samples: () => ({ right: d.phase === 'live' ? d.target.text : null, wrong: d.target?.kind === 'num' ? '123' : d.target?.kind === 'ar' ? 'كلمة' : 'wrong' })
  };

  const set = (k, v) => { d.set[k] = v; force(); };
  const left = Math.max(0, d.set.secs - d.elapsed / 1000);
  const pct = d.phase === 'live' ? Math.max(0, 100 - (d.elapsed / (d.set.secs * 1000)) * 100) : d.phase === 'between' || d.phase === 'done' ? 0 : 100;
  const ranking = Object.entries(d.scores).sort((a, b) => b[1] - a[1]);
  const settingsLocked = d.phase === 'count' || d.phase === 'live';

  const side = <>
    <Row k="الجولة" v={d.round ? `${d.round} / ${d.set.rounds}` : '—'} />
    <Row k="الحالة" v={{ idle: 'جاهزة', count: 'تحضير', live: 'اكتبوا الآن', between: 'بين الجولات', done: 'انتهت' }[d.phase]} />
    <div className="side-divider"></div>
    <div className="participants-title"><Trophy size={16} /> الترتيب <span>{ranking.length}</span></div>
    {!ranking.length && <p className="gm-hint">لا توجد نقاط بعد.</p>}
    {ranking.slice(0, 8).map(([n, p], i) => <Person key={n} name={n} i={i} end={<strong>{p} نقطة{d.best[n] ? ` · ⚡${d.best[n]}ms` : ''}</strong>} />)}
    <div className="side-divider"></div>
    <p className="gm-hint">النقاط: الأول {POINTS[0]} · الثاني {POINTS[1]} · الثالث {POINTS[2]} · بعدهم 1.</p>
    <button className="outline-btn full-btn" onClick={stopAll} disabled={d.phase === 'idle'}><RotateCcw size={14} /> إعادة ضبط</button>
  </>;

  return <Shell title="سرعة الكتابة" side={side}>
    <div className={`tr-stage tr-${d.phase}`}>
      <div className="tr-top">
        <span className="tr-badge"><Keyboard size={14} /> {d.target && d.phase !== 'idle' ? KIND_LABEL[d.target.kind] : 'اكتب في الشات'}</span>
        <span className="tr-round">{d.round ? `الجولة ${d.round} من ${d.set.rounds}` : 'جاهز'}</span>
      </div>

      {d.phase === 'idle' && <div className="tr-center"><h3>أول من يكتب ما يظهر يفوز</h3><p>تظهر كلمة أو رقم أو رمز، والمشاهد يكتبه كما هو في الشات — بدون أي أمر.</p></div>}
      {d.phase === 'count' && <div className="tr-center"><div className="tr-count" key={d.count}>{d.count}</div><p>استعدوا للكتابة…</p></div>}
      {(d.phase === 'live' || d.phase === 'between' || d.phase === 'done') && d.target && <div className="tr-center">
        <div className={`tr-target kind-${d.target.kind}`} dir={d.target.kind === 'ar' ? 'rtl' : 'ltr'}>{d.target.text}</div>
        <div className="tr-timer"><i style={{ width: pct + '%' }} /></div>
        <small className="tr-left">{d.phase === 'live' ? `${left.toFixed(1)} ث` : d.hits.length ? 'انتهت الجولة' : 'انتهى الوقت دون إجابة'}</small>
      </div>}

      {d.hits.length > 0 && <div className="tr-hits">
        {d.hits.map((h, i) => <div key={h.name} className={`tr-hit r${i}`}>
          <b>{i + 1}</b><T>{h.name}</T><span>{h.ms}ms</span>{h.pts ? <em>+{h.pts}</em> : null}
        </div>)}
      </div>}
      {d.phase === 'live' && !d.hits.length && d.wrong > 0 && <small className="tr-wrong">{d.wrong} محاولة غير صحيحة حتى الآن</small>}

      {d.phase === 'done' && ranking[0] && <div className="draw-result"><span className="eyebrow">الفائز بالمسابقة</span><strong>🏆 <T>{ranking[0][0]}</T> — {ranking[0][1]} نقطة</strong></div>}
    </div>

    <div className="gm-row">
      {(d.phase === 'idle' || d.phase === 'done') && <button className="primary-btn" onClick={startSeries}><Play size={15} /> {d.phase === 'done' ? 'مسابقة جديدة' : 'ابدأ المسابقة'}</button>}
      {d.phase === 'between' && <button className="primary-btn" onClick={beginRound}><Play size={15} /> الجولة التالية</button>}
      {d.phase === 'live' && <button className="outline-btn" onClick={skip}><SkipForward size={15} /> إنهاء الجولة الآن</button>}
      {(d.phase === 'count' || d.phase === 'live' || d.phase === 'between') && <button className="outline-btn" onClick={stopAll}><Square size={14} /> إيقاف</button>}
    </div>

    <div className="tr-settings" aria-disabled={settingsLocked}>
      <Seg label="نوع الهدف" value={d.set.kind} onChange={v => !settingsLocked && set('kind', v)} options={[['mix', 'الكل'], ['ar', 'كلمات عربية'], ['en', 'English'], ['num', 'أرقام'], ['code', 'رموز']]} />
      <Seg label="الصعوبة" value={d.set.level} onChange={v => !settingsLocked && set('level', v)} options={[[1, 'سهل'], [2, 'متوسط'], [3, 'صعب']]} />
      <Seg label="عدد الجولات" value={d.set.rounds} onChange={v => !settingsLocked && set('rounds', v)} options={[[3, '3'], [5, '5'], [10, '10']]} />
      <Seg label="مدة الجولة" value={d.set.secs} onChange={v => !settingsLocked && set('secs', v)} options={[[15, '15 ث'], [30, '30 ث'], [60, '60 ث']]} />
      <Seg label="تنتهي الجولة عند" value={d.set.cap} onChange={v => !settingsLocked && set('cap', v)} options={[[1, 'أول فائز'], [3, '3 فائزين'], [10, 'انتهاء الوقت']]} />
      <Seg label="دقّة الإملاء" value={d.set.strict ? 'strict' : 'easy'} onChange={v => !settingsLocked && set('strict', v === 'strict')} options={[['easy', 'متسامحة (همزات وتشكيل)'], ['strict', 'حرفية']]} />
    </div>

    {d.history.length > 0 && <div className="qlist">{d.history.map(h => <div className="q" key={h.n}>
      <span>#{h.n} <bdi dir="auto">{h.text}</bdi><small>{h.winner ? <>الأسرع: <T>{h.winner}</T> · {h.ms}ms · {h.count} أجابوا</> : 'لا أحد'}</small></span>
    </div>)}</div>}
    <p className="gm-hint">الكتابة بالأرقام الهندية (٤٨٢١) أو بدون تشكيل تُقبل تلقائيًا. الأمر <code>!start</code> للمضيف يبدأ المسابقة.</p>
  </Shell>;
}
