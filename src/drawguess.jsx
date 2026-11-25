import React, { useEffect, useRef } from 'react';
import { Play, SkipForward, Eye, EyeOff, Lightbulb, Undo2, Trash2, Pencil, Eraser, Minus, Square, Circle, ExternalLink, Lock, Trophy } from 'lucide-react';
import { Shell, Row, Person, Seg, T, HOST, rnd, shuffle, useForce } from './ui.jsx';
import { parseCommand, matchAnswer, isHost, clean } from './text.js';

/*
  تحدي الرسم والتخمين
  ------------------------------------------------------------------
  المشكلة: شاشة المضيف هي نفسها شاشة البث، فلو ظهرت الكلمة السرية عليها لرآها الجمهور.
  الحل:
   • الظاهر للجمهور (منطقة اللعب): لوحة الرسم + الكلمة مقنّعة (_ _ _) + المؤقت + تخمينات الشات.
   • الكلمة السرية لا تُعرض على الشاشة أبدًا افتراضيًا. تظهر فقط:
       1) أثناء الضغط المطوّل على زر العين (تختفي فور ترك الزر)، أو
       2) في «نافذة الكلمة السرية» المنفصلة — تُسحب إلى شاشة ثانية/غير مُلتقَطة في OBS.
   • التخمينات الصحيحة لا تُعرض نصًا في الشات العام (لا تسرّب الإجابة للآخرين).
*/

const WORDS = [
  ['قطة', 'cat'], ['كلب', 'dog'], ['سيارة', 'car'], ['طائرة', 'airplane'], ['منزل', 'house'], ['شجرة', 'tree'],
  ['نخلة', 'palm tree'], ['شمس', 'sun'], ['قمر', 'moon'], ['نجمة', 'star'], ['بحر', 'sea'], ['جبل', 'mountain'],
  ['سمكة', 'fish'], ['فراشة', 'butterfly'], ['ساعة', 'clock'], ['هاتف', 'phone'], ['كتاب', 'book'], ['قلم', 'pen'],
  ['كرسي', 'chair'], ['طاولة', 'table'], ['بيتزا', 'pizza'], ['موزة', 'banana'], ['تفاحة', 'apple'], ['مظلة', 'umbrella'],
  ['نظارة', 'glasses'], ['دراجة', 'bicycle'], ['قارب', 'boat'], ['قطار', 'train'], ['منطاد', 'balloon'], ['جمل', 'camel'],
  ['أسد', 'lion'], ['فيل', 'elephant'], ['زرافة', 'giraffe'], ['قلعة', 'castle'], ['جسر', 'bridge'], ['مفتاح', 'key'],
  ['تاج', 'crown'], ['صاروخ', 'rocket'], ['روبوت', 'robot'], ['كاميرا', 'camera'], ['ميكروفون', 'microphone'],
  ['قوس قزح', 'rainbow'], ['برج إيفل', 'eiffel tower'], ['كرة قدم', 'football'], ['وحش', 'monster'], ['خيمة', 'tent']
];

const COLORS = ['#1b1b1f', '#e5484d', '#f76b15', '#f5c518', '#30a46c', '#0d9bd8', '#5b5bd6', '#d6409f', '#8b5e34', '#ffffff'];
const W = 960, H = 540;
const CHANNEL = 'm92-secret-word';

/* ---------- رسم الضربات على canvas ---------- */
function paintStroke(ctx, s) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = s.size; ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
  const a = s.pts[0], b = s.pts[s.pts.length - 1];
  ctx.beginPath();
  if (s.tool === 'pen' || s.tool === 'eraser') {
    if (s.pts.length === 1) { ctx.arc(a[0], a[1], s.size / 2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.moveTo(a[0], a[1]); for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i][0], s.pts[i][1]); ctx.stroke(); }
  } else if (s.tool === 'line') { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  else if (s.tool === 'rect') { ctx.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); }
  else if (s.tool === 'ellipse') { ctx.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 || 1, Math.abs(b[1] - a[1]) / 2 || 1, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

function DrawBoard({ d, force }) {
  const ref = useRef(null);
  const cur = useRef(null);

  const redraw = (extra) => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    d.strokes.forEach(s => paintStroke(ctx, s));
    if (extra) paintStroke(ctx, extra);
  };
  d.redraw = redraw;
  useEffect(() => { redraw(); });

  const pos = e => {
    const r = ref.current.getBoundingClientRect();
    return [Math.max(0, Math.min(W, (e.clientX - r.left) * W / r.width)), Math.max(0, Math.min(H, (e.clientY - r.top) * H / r.height))];
  };
  const canDraw = d.phase === 'draw';
  const down = e => {
    if (!canDraw) return;
    e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId);
    cur.current = { tool: d.tool, color: d.color, size: d.tool === 'eraser' ? d.size * 2.2 : d.size, pts: [pos(e)] };
    redraw(cur.current);
  };
  const move = e => {
    const s = cur.current; if (!s) return;
    const p = pos(e);
    if (s.tool === 'pen' || s.tool === 'eraser') s.pts.push(p); else s.pts[1] = p;
    redraw(s);
  };
  const up = () => {
    const s = cur.current; if (!s) return;
    cur.current = null;
    if (s.pts.length === 1 && s.tool !== 'pen' && s.tool !== 'eraser') { redraw(); return; }
    d.strokes.push(s); redraw(); force();
  };

  return <div className="dg-board">
    <canvas ref={ref} width={W} height={H} className={canDraw ? 'live' : ''}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={e => { if (e.buttons === 0) up(); }}
      aria-label="لوحة الرسم" />
    {d.phase === 'idle' && <div className="dg-cover"><Lock size={22} /><b>اضغط «ابدأ جولة» لاختيار كلمة سرية</b></div>}
    {d.phase === 'pick' && <div className="dg-cover"><Lock size={22} /><b>المضيف يختار الكلمة…</b></div>}
    {d.phase === 'reveal' && <div className="dg-answer"><small>الكلمة كانت</small><strong dir="auto">{d.word.ar}</strong><span dir="ltr">{d.word.en}</span></div>}
  </div>;
}

/* ---------- الكلمة المقنّعة ---------- */
function Masked({ d }) {
  const w = d.shown;
  if (!w) return <div className="dg-mask idle">— — —</div>;
  const chars = [...w];
  const total = chars.filter(c => c !== ' ').length;
  return <div className="dg-mask-wrap">
    <div className="dg-mask" dir={d.lang === 'en' ? 'ltr' : 'rtl'}>
      {chars.map((c, i) => c === ' ' ? <span key={i} className="gap" /> :
        <span key={i} className={d.revealed.has(i) || d.phase === 'reveal' ? 'on' : ''}>{d.revealed.has(i) || d.phase === 'reveal' ? c : ''}</span>)}
    </div>
    <small>{total} حرف{d.lang === 'en' ? ' · English' : ''}</small>
  </div>;
}

export function DrawGuess({ reg }) {
  const force = useForce();
  let drawPrefs={}; try { drawPrefs=JSON.parse(localStorage.getItem('m92_game_options')||'{}').drawguess||{}; } catch {}
  const D = useRef({
    set: { lang: ['ar','en','mix'].includes(drawPrefs.language)?drawPrefs.language:'ar', secs: Number(drawPrefs.duration)||90, hints: drawPrefs.hints!==false, both: true, cap: [1,3,5,10].includes(Number(drawPrefs.maxWinners))?Number(drawPrefs.maxWinners):5 },
    phase: 'idle',                 // idle | pick | draw | reveal
    choices: [], word: null, lang: 'ar', shown: '', revealed: new Set(),
    left: 0, startAt: 0, iv: 0,
    solved: [], feed: [], scores: {}, round: 0, used: new Set(),
    strokes: [], tool: 'pen', color: COLORS[0], size: 6,
    peek: -1,                       // -1 مخفي، 0 الكلمة الحالية، 1..3 خيارات
    bc: null, redraw: null
  });
  const d = D.current;

  /* ---- قناة الكلمة السرية (نافذة منفصلة) ---- */
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    d.bc = new BroadcastChannel(CHANNEL);
    d.bc.onmessage = e => { if (e.data?.type === 'hello') pushSecret(); };
    return () => { d.bc?.close(); d.bc = null; clearInterval(d.iv); };
  }, []);
  const pushSecret = () => {
    d.bc?.postMessage({ type: 'state', phase: d.phase, word: d.word ? { ar: d.word.ar, en: d.word.en } : null, choices: d.choices.map(c => ({ ar: c[0], en: c[1] })), lang: d.lang, round: d.round });
  };
  useEffect(() => { pushSecret(); });

  const openSecretWindow = () => {
    window.open(`${location.pathname}#secret-word`, 'm92-secret-word', 'width=380,height=260,menubar=no,toolbar=no,location=no,status=no');
    setTimeout(pushSecret, 600);
  };

  /* ---- منطق الجولة ---- */
  const answersOf = w => (d.set.both ? [w.ar, w.en] : [d.lang === 'en' ? w.en : w.ar]);
  const hintOrder = useRef([]);

  const beginPick = () => {
    clearInterval(d.iv);
    const pool = WORDS.filter(w => !d.used.has(w[0]));
    const src = pool.length >= 3 ? pool : WORDS;
    d.choices = shuffle(src).slice(0, 3);
    d.phase = 'pick'; d.word = null; d.shown = ''; d.revealed = new Set(); d.solved = []; d.feed = []; d.strokes = []; d.peek = -1;
    d.round += 1; force();
    return 'المضيف يختار الكلمة…';
  };
  const choose = idx => {
    const c = d.choices[idx]; if (!c) return;
    d.used.add(c[0]);
    d.lang = d.set.lang === 'mix' ? (rnd(2) ? 'en' : 'ar') : d.set.lang;
    d.word = { ar: c[0], en: c[1] };
    d.shown = d.lang === 'en' ? c[1] : c[0];
    // ترتيب كشف الحروف للتلميحات
    const idxs = [...d.shown].map((ch, i) => (ch === ' ' ? -1 : i)).filter(i => i >= 0);
    hintOrder.current = shuffle(idxs);
    d.revealed = new Set(); d.peek = -1; d.phase = 'draw'; d.left = d.set.secs; d.startAt = performance.now();
    clearInterval(d.iv);
    d.iv = setInterval(() => {
      const el = (performance.now() - d.startAt) / 1000;
      d.left = Math.max(0, d.set.secs - el);
      if (d.set.hints) {
        const want = el > d.set.secs * 0.72 ? 2 : el > d.set.secs * 0.45 ? 1 : 0;
        const cap = Math.max(0, Math.floor(hintOrder.current.length / 2));
        while (d.revealed.size < Math.min(want, cap)) d.revealed.add(hintOrder.current[d.revealed.size]);
      }
      if (d.left <= 0) endRound(); else force();
    }, 250);
    force();
  };
  const endRound = () => { clearInterval(d.iv); d.phase = 'reveal'; d.peek = -1; force(); };
  const manualHint = () => {
    if (d.phase !== 'draw') return;
    const next = hintOrder.current.find(i => !d.revealed.has(i));
    if (next !== undefined && d.revealed.size < hintOrder.current.length - 1) { d.revealed.add(next); force(); }
  };

  const guess = (user, text) => {
    if (d.phase !== 'draw') return null;
    if (isHost(user, HOST)) return null;              // المضيف هو الرسّام
    if (d.solved.some(s => s.name === user)) return 'سبق وأجبت 👍';
    const res = matchAnswer(text, answersOf(d.word), { allowClose: true });
    if (res.ok) {
      const frac = d.left / d.set.secs;
      const pts = Math.round(40 + 60 * frac) + (d.solved.length === 0 ? 20 : 0);
      d.solved.push({ name: user, pts, at: Math.round(d.set.secs - d.left) });
      d.scores[user] = (d.scores[user] || 0) + pts;
      d.feed = [...d.feed, { name: user, ok: true }].slice(-8);
      if (d.solved.length >= d.set.cap) endRound(); else force();
      return `✅ ${user} عرف الكلمة! +${pts}`;
    }
    d.feed = [...d.feed, { name: user, text: clean(text), close: res.close }].slice(-8);
    force();
    return res.close ? 'قريب جدًا! 🔥' : null;
  };

  reg.current = {
    handle: (user, text) => {
      const c = parseCommand(text);
      if (c?.cmd === 'start') return isHost(user, HOST) ? beginPick() : 'هذا الأمر للمضيف فقط';
      if (c?.cmd === 'answer') return guess(user, c.args);
      if (c) return null;
      return guess(user, text);
    },
    samples: () => ({ right: d.phase === 'draw' ? (d.lang === 'en' ? d.word.en : d.word.ar) : null, wrong: d.lang === 'en' ? 'table' : 'طاولة' })
  };

  /* ---- واجهة ---- */
  const hold = idx => ({
    onPointerDown: () => { d.peek = idx; force(); },
    onPointerUp: () => { d.peek = -1; force(); },
    onPointerLeave: () => { if (d.peek === idx) { d.peek = -1; force(); } },
    onPointerCancel: () => { d.peek = -1; force(); },
    onBlur: () => { if (d.peek === idx) { d.peek = -1; force(); } }
  });
  const secretText = (ar, en) => (d.set.lang === 'en' ? en : d.set.lang === 'mix' ? `${ar} · ${en}` : ar);
  const ranking = Object.entries(d.scores).sort((a, b) => b[1] - a[1]);
  const mm = String(Math.floor(d.left / 60)).padStart(1, '0'), ss = String(Math.ceil(d.left % 60)).padStart(2, '0');
  const live = d.phase === 'draw';

  const side = <>
    <div className="dg-secret">
      <div className="dg-secret-head"><Lock size={15} /> الكلمة السرية <span>لا تظهر في البث</span></div>
      {d.phase === 'draw' && <>
        <div className="dg-secret-word" dir="auto">{d.peek === 0 ? secretText(d.word.ar, d.word.en) : '• • • • •'}</div>
        <button className="outline-btn full-btn dg-hold" {...hold(0)}>{d.peek === 0 ? <EyeOff size={15} /> : <Eye size={15} />} اضغط مطوّلًا لإظهارها</button>
      </>}
      {d.phase === 'pick' && <>
        <p className="gm-hint">اختر كلمة من 3 — لا تُعرض الكلمات على الشاشة. اضغط مطوّلًا على العين لتشاهد كل كلمة، ثم اختر.</p>
        {d.choices.map((c, i) => <div className="dg-choice" key={c[0]}>
          <button className="icon-btn" aria-label={`إظهار الخيار ${i + 1}`} {...hold(i + 1)}>{d.peek === i + 1 ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          <span dir="auto">{d.peek === i + 1 ? secretText(c[0], c[1]) : `كلمة ${i + 1} • • • •`}</span>
          <button className="primary-btn" onClick={() => choose(i)}>اختر</button>
        </div>)}
        <button className="text-btn" onClick={() => choose(rnd(3))}>اختيار عشوائي (دون أن تراها)</button>
      </>}
      {(d.phase === 'idle' || d.phase === 'reveal') && <p className="gm-hint">{d.phase === 'reveal' ? 'انتهت الجولة، والكلمة ظاهرة للجميع الآن.' : 'ستظهر الكلمة هنا عند بدء الجولة.'}</p>}
      <button className="outline-btn full-btn" onClick={openSecretWindow}><ExternalLink size={14} /> فتح نافذة الكلمة السرية</button>
      <p className="gm-hint">اسحب النافذة إلى شاشة ثانية أو غير مُلتقَطة في OBS. تعمل في نفس المتصفح؛ للهاتف نحتاج Backend لاحقًا.</p>
    </div>
    <div className="side-divider"></div>
    <Row k="الجولة" v={d.round || '—'} />
    <Row k="أجابوا" v={`${d.solved.length} / ${d.set.cap}`} />
    <div className="participants-title"><Trophy size={16} /> الترتيب <span>{ranking.length}</span></div>
    {!ranking.length && <p className="gm-hint">لا توجد نقاط بعد.</p>}
    {ranking.slice(0, 6).map(([n, p], i) => <Person key={n} name={n} i={i} end={<b>{p}</b>} />)}
  </>;

  return <Shell title="تحدي الرسم والتخمين" side={side} sideTitle="خاص بالمضيف" sideEyebrow="🔒 لا يظهر على البث">
    <div className="dg-hud">
      <Masked d={d} />
      <div className={`dg-time ${live && d.left < 10 ? 'low' : ''}`}>{live ? `${mm}:${ss}` : d.phase === 'reveal' ? 'انتهت' : '—'}</div>
    </div>

    <DrawBoard d={d} force={force} />

    <div className={`dg-tools ${live ? '' : 'off'}`} role="toolbar" aria-label="أدوات الرسم">
      {[['pen', Pencil, 'قلم'], ['eraser', Eraser, 'ممحاة'], ['line', Minus, 'خط'], ['rect', Square, 'مربع'], ['ellipse', Circle, 'دائرة']].map(([k, Ic, t]) =>
        <button key={k} className={`tool ${d.tool === k ? 'on' : ''}`} aria-label={t} title={t} onClick={() => { d.tool = k; force(); }}><Ic size={16} /></button>)}
      <span className="sep" />
      {COLORS.map(c => <button key={c} className={`swatch ${d.color === c && d.tool !== 'eraser' ? 'on' : ''}`} style={{ background: c }} aria-label={`لون ${c}`} onClick={() => { d.color = c; if (d.tool === 'eraser') d.tool = 'pen'; force(); }} />)}
      <span className="sep" />
      <input type="range" min="2" max="28" value={d.size} aria-label="حجم الفرشاة" onChange={e => { d.size = +e.target.value; force(); }} />
      <span className="sep" />
      <button className="tool" aria-label="تراجع" title="تراجع" onClick={() => { d.strokes.pop(); d.redraw?.(); force(); }}><Undo2 size={16} /></button>
      <button className="tool" aria-label="مسح اللوحة" title="مسح اللوحة" onClick={() => { d.strokes = []; d.redraw?.(); force(); }}><Trash2 size={16} /></button>
    </div>

    <div className="dg-feed" aria-live="polite">
      {!d.feed.length && <small className="gm-hint">تخمينات الجمهور تظهر هنا. الإجابات الصحيحة تظهر بدون نص كي لا تُكشف الكلمة.</small>}
      {d.feed.map((f, i) => f.ok
        ? <div key={i} className="ok">✅ <T>{f.name}</T> عرف الكلمة!</div>
        : <div key={i} className={f.close ? 'close' : ''}><b><T>{f.name}</T></b> <bdi dir="auto">{f.text}</bdi>{f.close ? ' 🔥' : ''}</div>)}
    </div>

    <div className="gm-row">
      {(d.phase === 'idle' || d.phase === 'reveal') && <button className="primary-btn" onClick={beginPick}><Play size={15} /> {d.phase === 'reveal' ? 'جولة جديدة' : 'ابدأ جولة'}</button>}
      {live && <>
        <button className="outline-btn" onClick={manualHint}><Lightbulb size={15} /> كشف حرف</button>
        <button className="outline-btn" onClick={endRound}><Eye size={15} /> إنهاء وكشف الكلمة</button>
        <button className="outline-btn" onClick={beginPick}><SkipForward size={15} /> تخطي الكلمة</button>
      </>}
    </div>

    <div className="tr-settings">
      <Seg label="لغة الكلمة" value={d.set.lang} onChange={v => { d.set.lang = v; force(); }} options={[['ar', 'عربي'], ['en', 'English'], ['mix', 'عشوائي']]} />
      <Seg label="مدة الرسم" value={d.set.secs} onChange={v => { if (!live) { d.set.secs = v; force(); } }} options={[[60, '60 ث'], [90, '90 ث'], [120, '120 ث']]} />
      <Seg label="تنتهي الجولة بعد" value={d.set.cap} onChange={v => { d.set.cap = v; force(); }} options={[[1, 'أول إجابة'], [5, '5 إجابات'], [20, 'انتهاء الوقت']]} />
      <Seg label="قبول الإجابة بلغتين" value={d.set.both ? 'y' : 'n'} onChange={v => { d.set.both = v === 'y'; force(); }} options={[['y', 'عربي وإنجليزي'], ['n', 'بلغة الكلمة فقط']]} />
      <Seg label="كشف الحروف تلقائيًا" value={d.set.hints ? 'y' : 'n'} onChange={v => { d.set.hints = v === 'y'; force(); }} options={[['y', 'مفعّل'], ['n', 'متوقف']]} />
    </div>
    <p className="gm-hint">المشاهد يكتب التخمين مباشرة (أو <code>!a تخمين</code>). تُقبل الهمزات والتشكيل.</p>
  </Shell>;
}

/* ---------- نافذة الكلمة السرية (تُفتح بـ #secret-word) ---------- */
export function SecretWindow() {
  const [s, setS] = React.useState(null);
  const [show, setShow] = React.useState(true);
  useEffect(() => {
    document.title = 'الكلمة السرية — M92 PLAY';
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = e => { if (e.data?.type === 'state') setS(e.data); };
    bc.postMessage({ type: 'hello' });
    const t = setInterval(() => bc.postMessage({ type: 'hello' }), 4000);
    return () => { clearInterval(t); bc.close(); };
  }, []);
  const label = w => (s?.lang === 'en' ? w.en : w.ar);
  return <div className="secret-win" dir="rtl">
    <div className="secret-head"><Lock size={16} /> الكلمة السرية — لا تلتقطها في OBS</div>
    {!s && <p className="secret-empty">بانتظار اللعبة… افتح «تحدي الرسم» في النافذة الرئيسية.</p>}
    {s?.phase === 'draw' && s.word && <>
      <div className={`secret-word ${show ? '' : 'hide'}`} dir="auto">{show ? label(s.word) : '• • • • •'}</div>
      {s.lang === 'ar' && show && <small dir="ltr">{s.word.en}</small>}
      <button className="outline-btn" onClick={() => setShow(!show)}>{show ? <EyeOff size={15} /> : <Eye size={15} />} {show ? 'إخفاء' : 'إظهار'}</button>
    </>}
    {s?.phase === 'pick' && <div className="secret-choices"><small>الخيارات (اختر من النافذة الرئيسية)</small>
      {s.choices.map((c, i) => <div key={i}><b>{i + 1}</b> <span dir="auto">{c.ar}</span> <em dir="ltr">{c.en}</em></div>)}</div>}
    {s && (s.phase === 'idle' || s.phase === 'reveal') && <p className="secret-empty">لا توجد جولة نشطة.</p>}
  </div>;
}
