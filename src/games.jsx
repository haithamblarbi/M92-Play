import React, { useEffect, useRef } from 'react';
import { Plus, Play, Sparkles, X, Trophy, Check, Eye, SkipForward, Lightbulb, Trash2, Pencil, Volume2, VolumeX, Users, RotateCcw } from 'lucide-react';
import { Shell, Row, Person, T, HOST, rnd, shuffle, useForce } from './ui.jsx';
import { parseCommand, matchAnswer, splitAnswers, isHost, normalize, clean, variants } from './text.js';
import { TypeRace } from './typerace.jsx';
import { DrawGuess } from './drawguess.jsx';

/*
  الألعاب تعمل مباشرة من الواجهة (بدون محاكي).
  كل لعبة تسجّل في reg.current دالة handle(user, text) تستقبل رسائل الشات كما هي
  (عادية أو أوامر !join / !شارك ...) لتربط البوت لاحقًا عبر window.M92Play.dispatch(user, text).
  تحليل الأوامر ومطابقة الإجابات (عربي/إنجليزي) موجودان في text.js.
*/
export { HOST };

/* ---------------- الروليت ---------------- */
function Roulette({ reg, challengeMode = false }) {
  const force = useForce();
  const D = useRef(null);
  if (!D.current) { let saved = null, cfg = {}; try { saved = JSON.parse(localStorage.getItem('m92_roulette_items') || 'null'); cfg = JSON.parse(localStorage.getItem('m92_game_options') || '{}').roulette || {}; } catch {} D.current = { list: Array.isArray(saved) ? saved.map(String) : ['M92', 'Streamer', 'Viewer 01', 'Viewer 02'], rot: 0, spinning: false, winner: '', hist: [], txt: '', spinSeconds: Number(cfg.spin)||5, eliminate: cfg.mode==='eliminate', mode: challengeMode ? 'challenge' : 'normal', challenge:'', challengeDone:null, challengeRound:0 }; }
  const d = D.current;
  const CHALLENGES = ['قل كلمة مضحكة خلال 5 ثوانٍ','اكتب اسم 3 دول تبدأ بحرف الميم','اذكر شيئًا تحبه في 5 ثوانٍ','اكتب رقمًا من 1 إلى 20 وسأتحقق منه لاحقًا','قل اسم لاعب آخر وامدحه بكلمة واحدة','اكتب 3 ألوان بدون تكرار'];
  const spin = () => {
    if (d.spinning) return 'العجلة تدور الآن…';
    const n = d.list.length;
    if (n < 2) return 'نحتاج مشاركَين على الأقل';
    const a = 360 / n, w = rnd(n), pick = d.list[w];
    d.rot = (Math.floor(d.rot / 360) + 6) * 360 + (360 - (w + 0.5) * a);
    d.spinning = true; d.winner = '';
    setTimeout(() => { d.spinning = false; d.winner = pick; d.hist = [pick, ...d.hist].slice(0, 5);
      if(d.mode === 'challenge'){
        d.challenge = CHALLENGES[rnd(CHALLENGES.length)];
        d.challengeDone = null;
        d.challengeRound += 1;
      } else if(d.eliminate){ d.list=d.list.filter(x=>x!==pick); try{localStorage.setItem('m92_roulette_items',JSON.stringify(d.list));}catch{} }
      force(); }, d.spinSeconds*1000);
    force();
    return 'العجلة تدور… 🎡';
  };
  const add = name => {
    if (d.spinning) return 'السحب جارٍ، حاول بعد قليل';
    if (d.list.includes(name)) return `${name} مسجّل مسبقًا`;
    if (d.list.length >= 60) return 'اكتمل العدد الأقصى';
    d.list.push(name); try { localStorage.setItem('m92_roulette_items', JSON.stringify(d.list)); } catch {} force();
    return `تم تسجيلك يا ${name} ✅`;
  };
  const addTxt = () => { const t = d.txt.trim(); if (t) { add(t); d.txt = ''; force(); } };
  reg.current = {
    handle: (user, text) => {
      const c = parseCommand(text);
      if (c?.cmd === 'join') return add(user);
      if (c?.cmd === 'spin' || c?.cmd === 'start') return isHost(user, HOST) ? spin() : 'هذا الأمر للمضيف فقط';
      return null;
    }
  };

  const n = d.list.length, a = 360 / n;
  const pt = t => { const r = t * Math.PI / 180; return `${(100 + 96 * Math.sin(r)).toFixed(1)} ${(100 - 96 * Math.cos(r)).toFixed(1)}`; };
  const fills = ['rgb(var(--mint-rgb))', 'rgba(var(--mint-rgb),.2)', 'rgba(var(--mint-rgb),.62)', 'rgba(var(--mint-rgb),.08)'];
  const ink = ['#06110e', '#fff', '#06110e', '#fff'];
  const side = <>
    <Row k="عدد المشاركين" v={n} />
    <Row k="الحالة" v={d.spinning ? 'تدور…' : 'جاهزة'} />
    <div className="side-divider"></div>
    {d.list.map((p, i) => <Person key={p} name={p} i={i} end={<button className="icon-btn remove-option" aria-label={`حذف ${p}`} onClick={() => { if (!d.spinning) { d.list.splice(i, 1); try { localStorage.setItem('m92_roulette_items', JSON.stringify(d.list)); } catch {} force(); } }}><X size={13} /></button>} />)}
  </>;
  const challengeToggle = <div className="roulette-mode-bar">
    <span><b>وضع الروليت</b><small>{d.mode==='challenge'?'كل دورة = لاعب + تحدي':'اختيار لاعب/خيار فقط'}</small></span>
    <div className="roulette-mode-buttons">
      <button className={d.mode==='normal'?'on':''} onClick={()=>{if(!d.spinning){d.mode='normal';d.challenge='';force();}}}>عادي</button>
      <button className={d.mode==='challenge'?'on':''} onClick={()=>{if(!d.spinning){d.mode='challenge';force();}}}>تحديات</button>
    </div>
  </div>;
  return <Shell title={d.mode==='challenge'?'روليت التحديات':'عجلة الحظ'} side={side}>
    {challengeToggle}
    <div className="rw-box">
      <svg viewBox="0 0 200 200" role="img" aria-label="عجلة الحظ">
        <g style={{ transformOrigin: '100px 100px', transform: `rotate(${d.rot}deg)`, transition: d.spinning ? `transform ${d.spinSeconds}s cubic-bezier(.12,.7,.1,1)` : 'none' }}>
          {n < 2 ? <circle cx="100" cy="100" r="96" style={{ fill: fills[0] }} /> :
            d.list.map((p, i) => <g key={p}>
              <path d={`M100 100L${pt(i * a)}A96 96 0 0 1 ${pt((i + 1) * a)}Z`} style={{ fill: fills[i % 4] }} stroke="#06110e" strokeWidth="1" />
              {n <= 16 && <text transform={`rotate(${(i + 0.5) * a} 100 100)`} x="100" y="26" textAnchor="middle" fontSize="8" fontWeight="700" fill={ink[i % 4]}>{p.slice(0, 10)}</text>}
            </g>)}
        </g>
        <circle cx="100" cy="100" r="10" fill="#06110e" style={{ stroke: 'var(--mint)' }} strokeWidth="2" />
      </svg>
    </div>
    {d.winner && <div className="draw-result"><span className="eyebrow">المختار</span><strong>{d.winner}</strong><Sparkles size={23} /></div>}
    {d.mode==='challenge' && d.challenge && <div className="challenge-card">
      <div><span className="challenge-kicker">التحدي {d.challengeRound}</span><h3>{d.challenge}</h3><p>نفّذ التحدي لتكمل، أو اختر «لم ينفذ» لإخراج اللاعب.</p></div>
      <div className="challenge-actions"><button className="primary-btn" onClick={()=>{d.challengeDone='done';force();}}>تم التنفيذ ✓</button><button className="outline-btn danger-btn" onClick={()=>{d.challengeDone='out';d.list=d.list.filter(x=>x!==d.winner);try{localStorage.setItem('m92_roulette_items',JSON.stringify(d.list));}catch{}force();}}>لم ينفذ ×</button></div>
      {d.challengeDone && <div className={d.challengeDone==='done'?'challenge-success':'challenge-fail'}>{d.challengeDone==='done'?'استمر اللاعب في الجولة 🎉':'خرج اللاعب من الجولة'}</div>}
    </div>}
    <div className="gm-row">
      <button className="primary-btn" disabled={d.spinning} onClick={spin}><Play size={16} /> أدر العجلة</button>
      <button className="outline-btn" onClick={() => { if (!d.spinning) { d.list = []; d.winner = ''; try { localStorage.setItem('m92_roulette_items', '[]'); } catch {} force(); } }}>مسح القائمة</button>
    </div>
    <div className="gm-row">
      <input className="gm-input" value={d.txt} placeholder="أضف اسمًا أو خيارًا" onChange={e => { d.txt = e.target.value; force(); }} onKeyDown={e => e.key === 'Enter' && addTxt()} />
      <button className="outline-btn" onClick={addTxt}><Plus size={15} /> إضافة</button>
    </div>
    {d.hist.length > 0 && <p className="gm-hint">آخر الفائزين: {d.hist.join(' ‹ ')}</p>}
  </Shell>;
}

function RouletteChallenge({ reg }) { return <Roulette reg={reg} challengeMode/>; }

/* ---------------- خمنها (أسئلة من الموقع) ---------------- */
const KEY = 'm92-guess-questions';
const SAMPLE = [
  { q: 'ما عاصمة السعودية؟', a: 'الرياض', h: 'تبدأ بحرف الراء' },
  { q: 'كم عدد ألوان قوس قزح؟', a: '7|سبعة|سبع', h: '' },
  { q: 'ما أكبر كوكب في المجموعة الشمسية؟', a: 'المشتري', h: '' }
];
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v) && v.length) return v; } catch (e) {} return SAMPLE.map(x => ({ ...x })); };
const save = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };
const alts = splitAnswers;

function Guess({ reg }) {
  const force = useForce();
  const D = useRef(null);
  if (!D.current) { let cfg={}; try { cfg=JSON.parse(localStorage.getItem('m92_game_options')||'{}').guess||{}; } catch {} D.current = { qs: load(), i: 0, tab: 'play', solved: '', reveal: false, hint: false, scores: {}, points: Math.max(0,Number(cfg.points)||1), who: '', ans: '', msg: '', f: { q: '', a: '', h: '', edit: -1 }, bulk: '' }; }
  const d = D.current, cur = d.qs[d.i], done = d.i >= d.qs.length;
  const persist = () => { save(d.qs); force(); };
  const check = (user, text) => {
    if (!cur) return 'لا يوجد سؤال حاليًا';
    if (d.reveal) return 'انتهى هذا السؤال';
    const r = matchAnswer(text, alts(cur.a));
    if (r.ok) {
      d.solved = user; d.reveal = true; d.scores[user] = (d.scores[user] || 0) + d.points; force();
      return `🏆 ${user} جاوب صح: ${alts(cur.a)[0]} (+${d.points})`;
    }
    return r.close ? `${user}: قريب جدًا! 🔥` : null;
  };
  reg.current = {
    handle: (user, text) => {
      const c = parseCommand(text);
      if (c?.cmd === 'answer') return c.args ? check(user, c.args) : 'اكتب إجابتك بعد الأمر';
      if (c) return null;
      return check(user, text);   // الإجابة المباشرة في الشات تكفي
    },
    samples: () => ({ right: cur && !d.reveal ? alts(cur.a)[0] : null, wrong: 'لا أعرف' })
  };
  const next = () => { d.i = Math.min(d.qs.length, d.i + 1); d.solved = ''; d.reveal = false; d.hint = false; d.msg = ''; force(); };
  const submitForm = () => {
    const f = d.f; if (!f.q.trim() || !f.a.trim()) return;
    const item = { q: f.q.trim(), a: f.a.trim(), h: f.h.trim() };
    if (f.edit >= 0) d.qs[f.edit] = item; else d.qs.push(item);
    d.f = { q: '', a: '', h: '', edit: -1 }; persist();
  };
  const addBulk = () => {
    d.bulk.split('\n').forEach(line => { const [q, a, h] = line.split('::').map(x => (x || '').trim()); if (q && a) d.qs.push({ q, a, h: h || '' }); });
    d.bulk = ''; persist();
  };
  const ranking = Object.entries(d.scores).sort((x, y) => y[1] - x[1]);
  const side = <>
    <Row k="السؤال" v={done ? 'انتهت' : `${d.i + 1} / ${d.qs.length}`} />
    <Row k="عدد الأسئلة" v={d.qs.length} />
    <div className="side-divider"></div>
    <div className="participants-title"><Trophy size={16} /> لوحة النقاط <span>{ranking.length}</span></div>
    {ranking.length === 0 && <p className="gm-hint">لم يسجّل أحد نقاطًا بعد.</p>}
    {ranking.slice(0, 8).map(([n, p], i) => <Person key={n} name={n} i={i} end={<strong>{p}</strong>} />)}
    <button className="outline-btn full-btn" onClick={() => { d.i = 0; d.scores = {}; d.solved = ''; d.reveal = false; d.hint = false; force(); }}>جولة جديدة (تصفير النقاط)</button>
  </>;

  const play = done ? <div className="gq"><small>انتهت الأسئلة</small><h3>{ranking[0] ? `🏆 الفائز: ${ranking[0][0]} (${ranking[0][1]} نقطة)` : 'لا توجد نقاط'}</h3></div> :
    <>
      <div className="gq">
        <small>السؤال {d.i + 1} من {d.qs.length}</small>
        <h3>{cur.q}</h3>
        {d.hint && cur.h && <div className="gm-hint">💡 {cur.h}</div>}
        {d.reveal && <div className="ans">{alts(cur.a)[0]}{d.solved && <small style={{ display: 'block' }}>جاوب: {d.solved}</small>}</div>}
      </div>
      {!d.reveal && <div className="gm-row">
        <input className="gm-input" style={{ maxWidth: 150 }} placeholder="اسم اللاعب" value={d.who} onChange={e => { d.who = e.target.value; force(); }} />
        <input className="gm-input" placeholder="إجابته" value={d.ans} onChange={e => { d.ans = e.target.value; force(); }}
          onKeyDown={e => { if (e.key === 'Enter') { d.msg = check(d.who.trim() || 'لاعب', d.ans) || 'ليست الإجابة، حاول مرة أخرى'; d.ans = ''; force(); } }} />
        <button className="primary-btn" onClick={() => { d.msg = check(d.who.trim() || 'لاعب', d.ans) || 'ليست الإجابة، حاول مرة أخرى'; d.ans = ''; force(); }}><Check size={15} /> تحقق</button>
      </div>}
      {d.msg && <p className="gm-hint">{d.msg}</p>}
      <div className="gm-row">
        {cur.h && <button className="outline-btn" onClick={() => { d.hint = true; force(); }}><Lightbulb size={15} /> تلميح</button>}
        {!d.reveal && <button className="outline-btn" onClick={() => { d.reveal = true; force(); }}><Eye size={15} /> كشف الإجابة</button>}
        <button className="primary-btn" onClick={next}><SkipForward size={15} /> {d.i + 1 >= d.qs.length ? 'إنهاء' : 'السؤال التالي'}</button>
      </div>
    </>;

  const edit = <>
    <label className="field-label">السؤال<input value={d.f.q} onChange={e => { d.f.q = e.target.value; force(); }} /></label>
    <label className="field-label">الإجابة (للبدائل افصل بـ | مثل: 7|سبعة)<input value={d.f.a} onChange={e => { d.f.a = e.target.value; force(); }} /></label>
    <label className="field-label">تلميح (اختياري)<input value={d.f.h} onChange={e => { d.f.h = e.target.value; force(); }} /></label>
    <div className="gm-row">
      <button className="primary-btn" disabled={!d.f.q.trim() || !d.f.a.trim()} onClick={submitForm}><Plus size={15} /> {d.f.edit >= 0 ? 'حفظ التعديل' : 'إضافة السؤال'}</button>
      {d.f.edit >= 0 && <button className="outline-btn" onClick={() => { d.f = { q: '', a: '', h: '', edit: -1 }; force(); }}>إلغاء</button>}
    </div>
    <label className="field-label">إضافة جماعية — سطر لكل سؤال: السؤال :: الإجابة :: تلميح<textarea rows="3" value={d.bulk} onChange={e => { d.bulk = e.target.value; force(); }} /></label>
    <button className="outline-btn" disabled={!d.bulk.trim()} onClick={addBulk}>إضافة الأسطر</button>
    <div className="qlist">{d.qs.map((x, i) => <div className="q" key={i}>
      <span>{i + 1}. {x.q}<small>الإجابة: {x.a}</small></span>
      <button className="icon-btn" aria-label="تعديل" onClick={() => { d.f = { q: x.q, a: x.a, h: x.h || '', edit: i }; force(); }}><Pencil size={13} /></button>
      <button className="icon-btn" aria-label="حذف" onClick={() => { d.qs.splice(i, 1); if (d.i > d.qs.length) d.i = d.qs.length; persist(); }}><Trash2 size={13} /></button>
    </div>)}</div>
    <p className="gm-hint">الأسئلة تُحفظ تلقائيًا في هذا المتصفح.</p>
  </>;

  return <Shell title="خمنها" side={side}>
    <div className="tabs">
      <button className={d.tab === 'play' ? 'on' : ''} onClick={() => { d.tab = 'play'; force(); }}>اللعب</button>
      <button className={d.tab === 'edit' ? 'on' : ''} onClick={() => { d.tab = 'edit'; force(); }}>الأسئلة ({d.qs.length})</button>
    </div>
    {d.tab === 'play' ? play : edit}
  </Shell>;
}

function AddRow({ d, force, onAdd, ph }) {
  const go = () => { const t = d.txt.trim(); if (t) { onAdd(t); d.txt = ''; force(); } };
  return <div className="gm-row">
    <input className="gm-input" value={d.txt} placeholder={ph} onChange={e => { d.txt = e.target.value; force(); }} onKeyDown={e => e.key === 'Enter' && go()} />
    <button className="outline-btn" onClick={go}><Plus size={15} /> إضافة</button>
  </div>;
}

/* ---------------- لعبة الكراسي ---------------- */
function Chairs({ reg }) {
  const force = useForce();
  let chairPrefs = {}, savedChairPlayers = null; try { chairPrefs = JSON.parse(localStorage.getItem('m92_game_options') || '{}').chairs || {}; savedChairPlayers = JSON.parse(localStorage.getItem('m92_chairs_players') || 'null'); } catch {}
  const defaultChairPlayers=['M92','Streamer','Viewer 01','Viewer 02','Viewer 03','Viewer 04'];
  const initialChairPlayers=Array.isArray(savedChairPlayers)?savedChairPlayers.map(String):defaultChairPlayers;
  const D = useRef({ list: initialChairPlayers, maxPlayers:Math.max(3,Math.min(30,Number(chairPrefs.players)||12)), alive: [], phase:'lobby', chairs:0, seated:[], round:0, winner:'', out:[], last:'', txt:'', t:0, music:chairPrefs.musicEnabled !== false, musicDuration:Number(chairPrefs.musicDuration)||5, spin:0, seatMap:{} });
  const d=D.current;
  useEffect(()=>()=>clearTimeout(d.t),[]);
  const makeSeats = count => Array.from({length:count},(_,i)=>i+1);
  const seatStyle = n => {
    const total=d.chairs;
    let ring=0,index=0,count=total,radius=112;
    if(total<=12){ ring=0;index=n-1;count=total;radius=Math.min(132,Math.max(96,84+total*3.2)); }
    else if(total<=20){
      const outer=Math.ceil(total*.6);
      if(n<=outer){ring=0;index=n-1;count=outer;radius=142;}
      else {ring=1;index=n-outer-1;count=total-outer;radius=96;}
    } else {
      if(n<=12){ring=0;index=n-1;count=12;radius=148;}
      else if(n<=22){ring=1;index=n-13;count=10;radius=108;}
      else {ring=2;index=n-23;count=total-22;radius=68;}
    }
    const angle=360*index/Math.max(1,count)+(ring?180/Math.max(1,count)*ring:0);
    const mobileRadius=radius*(total>20?.76:total>12?.82:.88);
    const scale=total>20?.76:total>12?.84:.94;
    const mobileScale=total>20?.68:total>12?.76:.86;
    return {'--angle':`${angle}deg`,'--counter-angle':`${-angle}deg`,'--orbit-offset':`-${radius}px`,'--orbit-offset-mobile':`-${mobileRadius}px`,'--chair-scale':scale,'--chair-scale-mobile':mobileScale};
  };
  const start=()=>{ const roster=d.list.slice(0,d.maxPlayers); if(roster.length<3) return 'نحتاج 3 لاعبين على الأقل'; d.alive=[...roster];d.out=[];d.round=0;d.winner='';nextRound();return `بدأت اللعبة بـ ${d.alive.length} لاعبين 🎵`; };
  const nextRound=()=>{ if(d.alive.length<=1){d.phase='end';d.winner=d.alive[0]||'';force();return;} d.round++;d.seated=[];d.last='';d.phase='music';d.chairs=d.alive.length-1;d.seatMap={};d.spin=0;clearTimeout(d.t);d.t=setTimeout(()=>{d.phase='sit';d.spin=1;force();},d.music?d.musicDuration*1000:1800);force(); };
  const persistPlayers=()=>{try{localStorage.setItem('m92_chairs_players',JSON.stringify(d.list));}catch{}};
  const add=name=>{if(!name)return;if(d.phase!=='lobby'&&d.phase!=='end')return 'اللعبة جارية';if(d.list.includes(name))return `${name} مسجّل مسبقًا`;if(d.list.length>=d.maxPlayers)return `اكتمل الحد الأعلى (${d.maxPlayers} لاعب)`;d.list.push(name);persistPlayers();force();return `تم تسجيلك يا ${name} ✅`;};
  const sit=(name,num)=>{
    if(!d.alive.includes(name))return 'أنت خارج اللعبة';
    if(d.phase!=='sit')return d.phase==='music'?'انتظر توقف الموسيقى 🎵':'لا توجد جولة جلوس الآن';
    const n=Number(num); if(!Number.isInteger(n)||n<1||n>d.chairs)return `اختر كرسيًا من 1 إلى ${d.chairs}`;
    const occupied=Object.entries(d.seatMap).find(([,u])=>u===name); if(occupied)return 'أنت اخترت كرسيًا بالفعل';
    if(d.seatMap[n])return `الكرسي ${n} مأخوذ بالفعل`;
    d.seatMap[n]=name; d.seated.push(name); force();
    if(d.seated.length>=d.chairs) resolve();
    return `${name} اختار الكرسي ${n} 🪑`;
  };
  const resolve=()=>{ const loser=d.alive.find(x=>!d.seated.includes(x)); if(!loser)return; d.alive=d.alive.filter(x=>x!==loser);d.out.push(loser);d.last=loser;d.phase=d.alive.length<=1?'end':'result';d.winner=d.alive.length<=1?d.alive[0]:'';force(); };
  const autoSeat=()=>{const free=makeSeats(d.chairs).filter(n=>!d.seatMap[n]);const rest=d.alive.filter(x=>!d.seated.includes(x)).sort(()=>Math.random()-.5);rest.slice(0,free.length).forEach((u,i)=>d.seatMap[free[i]]=u);d.seated=Object.values(d.seatMap);resolve();};
  reg.current={handle:(user,text)=>{const c=parseCommand(text);if(c?.cmd==='join')return add(user);if(c?.cmd==='sit')return sit(user,c.args||c.unknown);if(c?.cmd==='start')return isHost(user,HOST)?start():'هذا الأمر للمضيف فقط';return null;},samples:()=>({right:`!sit ${Math.max(1,Math.floor(Math.random()*Math.max(1,d.chairs))+1)}`,wrong:'!sit 99'})};
  const side=<><Row k="الجولة" v={d.round||'-'}/><Row k="اللاعبون" v={d.phase==='lobby'?d.list.length:d.alive.length}/><Row k="الكراسي" v={d.chairs||'-'}/><Row k="الموسيقى" v={d.music?'ON':'OFF'}/><div className="side-divider"/>{(d.phase==='lobby'?d.list:d.alive).map((p,i)=><Person key={p} name={p} i={i} end={d.phase==='lobby'?<button className="icon-btn" onClick={()=>{d.list.splice(i,1);persistPlayers();force();}}><X size={13}/></button>:null}/>)}</>;
  return <Shell title="الكراسي 3D" side={side}>
    <div className="chairs-hud"><div><span className="eyebrow">M92 MUSICAL CHAIRS</span><h3>{d.phase==='music'?'الموسيقى تعمل…':d.phase==='sit'?'توقفت الموسيقى — اختر كرسيك!':d.phase==='result'?'نتيجة الجولة':d.phase==='end'?'النهاية':'جهّز اللاعبين'}</h3></div><button className="music-toggle" onClick={()=>{d.music=!d.music;try{const all=JSON.parse(localStorage.getItem('m92_game_options')||'{}');all.chairs={...(all.chairs||{}),musicEnabled:d.music};localStorage.setItem('m92_game_options',JSON.stringify(all));}catch{}force();}}>{d.music?<Volume2 size={15}/>:<VolumeX size={15}/>} {d.music?'الموسيقى ON':'بدون موسيقى'}</button></div>
    {d.phase==='lobby'&&<><p className="gm-hint">كل كرسي له رقم مخفي أثناء الدوران. اكتب في الشات <code>!sit 4</code> بعد توقف الموسيقى لاختيار كرسيك.</p><AddRow d={d} force={force} onAdd={add} ph="اسم لاعب"/><button className="primary-btn full-btn" onClick={start}><Play size={16}/> ابدأ الجولة ({d.list.length} لاعب)</button></>}
    {d.phase==='music'&&<div className="chair-arena spinning"><div className="arena-floor"></div><div className="chair-ring">{makeSeats(d.chairs).map(n=><div className={d.chairs>14?'chair-3d dense':'chair-3d'} key={n} style={seatStyle(n)}><div className="chair-object" aria-hidden="true"><i className="chair-back"></i><i className="chair-seat"></i><i className="chair-leg leg-a"></i><i className="chair-leg leg-b"></i></div><b>?</b></div>)}</div><div className="spin-center"><strong>🎵</strong><small>{d.music?'الموسيقى تعمل':'الوضع الصامت'}</small></div></div>}
    {d.phase==='sit'&&<><div className="chair-arena stopped"><div className="arena-floor"></div><div className="chair-ring">{makeSeats(d.chairs).map(n=><div className={`chair-3d ${d.chairs>14?'dense':''} ${d.seatMap[n]?'occupied':''}`} key={n} style={seatStyle(n)}><div className="chair-object" aria-hidden="true"><i className="chair-back"></i><i className="chair-seat"></i><i className="chair-leg leg-a"></i><i className="chair-leg leg-b"></i></div><b>{n}</b><small className={d.seatMap[n] ? 'seat-status occupied-status' : 'seat-status available-status'}>{d.seatMap[n]?'محجوز':'متاح'}</small></div>)}</div><div className="spin-center"><strong>🛑</strong><small>الأرقام ظهرت</small></div></div><p className="gm-hint">كل لاعب يكتب رقم كرسي واحد فقط: <code>!sit 1</code> إلى <code>!sit {d.chairs}</code></p><div className="pill-grid">{d.alive.filter(p=>!d.seated.includes(p)).map(p=><button className="pill" key={p} onClick={()=>sit(p,Math.max(1,makeSeats(d.chairs).find(n=>!d.seatMap[n])||1))}>{p}</button>)}</div><button className="outline-btn" onClick={autoSeat}><RotateCcw size={14}/> إكمال الجلوس تلقائيًا</button></>}
    {d.phase==='result'&&<><div className="draw-result"><span className="eyebrow">خرج من الجولة</span><strong>{d.last}</strong><X size={23}/></div><button className="primary-btn full-btn" onClick={nextRound}><Play size={16}/> الجولة التالية ({d.alive.length} متبقٍ)</button></>}
    {d.phase==='end'&&<><div className="draw-result"><span className="eyebrow">الفائز</span><strong>{d.winner||'لا أحد'}</strong><Trophy size={23}/></div><button className="primary-btn full-btn" onClick={()=>{d.phase='lobby';d.out=[];d.round=0;force();}}>لعبة جديدة</button></>}
  </Shell>;
}

/* ---------------- تحدي الكلمات ---------------- */

const WB_ROUNDS = [
  { letters: ['م', 'د', 'ر', 'س', 'ا', 'ة', 'ب'], words: ['مدرسة', 'مدرس', 'درس', 'رسم', 'دار', 'بار', 'برد', 'بدر', 'مسار', 'سرد', 'ردم', 'مرد', 'سمر', 'ادب', 'باد', 'سدر', 'مدار', 'اسم', 'رماد'] },
  { letters: ['S', 'T', 'R', 'E', 'A', 'M'], words: ['stream', 'master', 'steam', 'smart', 'tears', 'stare', 'rates', 'arms', 'mats', 'team', 'tram', 'star', 'east', 'seat', 'rest', 'mate', 'meat', 'same', 'tea', 'sea', 'ear', 'art', 'rat', 'sat', 'set', 'arm', 'ram', 'tar'] },
  { letters: ['ك', 'ت', 'ا', 'ب', 'ة', 'م', 'ل'], words: ['كتاب', 'كتابة', 'كتب', 'مكتب', 'مكتبة', 'كلم', 'ملك', 'ملكة', 'كاتب', 'كتلة', 'تلك'] }
];
const letterCounts = arr => arr.reduce((m, c) => (m[c] = (m[c] || 0) + 1, m), {});

function WordBattle({ reg }) {
  const force = useForce();
  let cfg={}; try { cfg=JSON.parse(localStorage.getItem('m92_game_options')||'{}').words||{}; } catch {}
  const D = useRef({ r: 0, scores: {}, multiplier:Math.max(1,Number(cfg.multiplier)||1), words: [], round: 1 });
  const x = D.current;
  const cur = WB_ROUNDS[x.r % WB_ROUNDS.length];
  const isEn = /[a-z]/i.test(cur.letters[0]);
  const nrm = s => normalize(s);
  const dict = cur.words.map(nrm);
  const canMake = w => {
    const need = letterCounts([...nrm(w).replace(/ /g, '')]);
    const have = letterCounts(cur.letters.map(nrm));
    return Object.entries(need).every(([c, n]) => (have[c] || 0) >= n);
  };
  const submit = (u, t, explicit) => {
    const raw = clean(t);
    if (!raw) return explicit ? 'اكتب كلمة بعد الأمر' : null;
    // نجرّب الكلمة كما كُتبت ثم بعد تصحيح لغة لوحة المفاتيح
    const hit = variants(raw).map(v => nrm(v.text)).find(n => dict.includes(n));
    if (!hit) return explicit ? (nrm(raw).length < 3 ? 'الكلمة قصيرة (3 أحرف على الأقل)' : !canMake(raw) ? 'الكلمة تحتوي حرفًا غير متاح' : 'الكلمة غير موجودة في قاموس الجولة التجريبي') : null;
    if (x.words.some(z => z.word === hit)) return 'سُجّلت هذه الكلمة من قبل';
    const shown = cur.words[dict.indexOf(hit)];
    x.words.push({ user: u, word: shown, key: hit });
    const pts=shown.length*x.multiplier; x.scores[u] = (x.scores[u] || 0) + pts;
    force(); return `✅ ${shown} (+${pts})`;
  };
  reg.current = {
    handle: (u, t) => {
      const c = parseCommand(t);
      if (c?.cmd === 'word') return submit(u, c.args, true);
      if (c) return null;
      return /\s/.test(clean(t)) ? null : submit(u, t, false);   // كلمة واحدة في الشات تُحتسب مباشرة
    },
    samples: () => { const left = cur.words.filter(w => !x.words.some(z => z.key === nrm(w))); return { right: left.length ? left[rnd(left.length)] : null, wrong: isEn ? 'zzz' : 'ززز' }; }
  };
  const next = () => { x.r += 1; x.words = []; x.round += 1; force(); };
  const ranking = Object.entries(x.scores).sort((a, b) => b[1] - a[1]);
  const side = <><Row k="الجولة" v={x.round} /><Row k="الكلمات المقبولة" v={`${x.words.length} / ${cur.words.length}`} /><div className="side-divider" />{ranking.map(([n, v], i) => <Person key={n} name={n} i={i} end={<b>{v} نقطة</b>} />)}</>;
  return <Shell title="معركة الكلمات" side={side}>
    <div className="wordbattle-board">
      <span className="eyebrow">كوّن كلمات من الحروف المتاحة ({isEn ? 'English' : 'عربي'})</span>
      <div className="wordbattle-letters" dir={isEn ? 'ltr' : 'rtl'}>{cur.letters.map((l, i) => <b key={`${l}-${i}`}>{l}</b>)}</div>
      <p>اكتب الكلمة في الشات مباشرة، أو <code>!word كلمة</code></p>
      <button className="outline-btn" onClick={next}>جولة جديدة بحروف أخرى</button>
    </div>
    <div className="wordbattle-log">{x.words.slice().reverse().map((w, i) => <div key={i}><b><T>{w.user}</T></b><span dir="auto">{w.word}</span><strong>+{w.word.length}</strong></div>)}{!x.words.length && <p className="gm-hint">بانتظار أول كلمة من الجمهور.</p>}</div>
    <p className="gm-hint">القاموس تجريبي ومحدود لأغراض الواجهة؛ سيحتاج لاحقًا إلى قاموس عربي وإنجليزي أوسع ومعالجة تصريف الكلمات.</p>
  </Shell>;
}

/* ---------------- تحدي العواصم ---------------- */
const CAPITALS = [
  ['المملكة العربية السعودية', 'Saudi Arabia', 'الرياض|Riyadh'], ['الجزائر', 'Algeria', 'الجزائر|الجزائر العاصمة|Algiers'],
  ['اليابان', 'Japan', 'طوكيو|Tokyo'], ['تركيا', 'Türkiye', 'أنقرة|Ankara'], ['مصر', 'Egypt', 'القاهرة|Cairo'],
  ['فرنسا', 'France', 'باريس|Paris'], ['المغرب', 'Morocco', 'الرباط|Rabat'], ['ألمانيا', 'Germany', 'برلين|Berlin'],
  ['كندا', 'Canada', 'أوتاوا|Ottawa'], ['أستراليا', 'Australia', 'كانبرا|Canberra'], ['البرازيل', 'Brazil', 'برازيليا|Brasilia'],
  ['الإمارات', 'UAE', 'أبوظبي|Abu Dhabi']
];

function Capitals({ reg }) {
  const force = useForce();
  let cfg={}; try { cfg=JSON.parse(localStorage.getItem('m92_game_options')||'{}').capitals||{}; } catch {}
  const D = useRef({ order: shuffle(CAPITALS.map((_, i) => i)), p: 0, solved: false, scores: {}, points:Math.max(0,Number(cfg.points)||1), winner: '', at: 0, ms: 0 });
  const x = D.current;
  const q = CAPITALS[x.order[x.p % x.order.length]];
  useEffect(() => { x.at = performance.now(); }, []);
  const answer = (u, t, explicit) => {
    if (x.solved) return explicit ? 'تم تسجيل إجابة هذه الجولة' : null;
    const r = matchAnswer(t, q[2], { allowClose: true });
    if (r.ok) { x.solved = true; x.winner = u; x.ms = Math.round(performance.now() - x.at); x.scores[u] = (x.scores[u] || 0) + x.points; force(); return `إجابة صحيحة يا ${u}! +${x.points}`; }
    return r.close ? 'قريب جدًا! 🔥' : (explicit ? 'إجابة غير صحيحة، حاول مرة أخرى' : null);
  };
  reg.current = {
    handle: (u, t) => {
      const c = parseCommand(t);
      if (c?.cmd === 'answer') return answer(u, c.args, true);
      if (c) return null;
      return answer(u, t, false);
    },
    samples: () => ({ right: x.solved ? null : q[2].split('|')[0], wrong: 'Atlantis' })
  };
  const next = () => { x.p += 1; x.solved = false; x.winner = ''; x.at = performance.now(); force(); };
  const side = <><Row k="السؤال" v={`${(x.p % x.order.length) + 1} / ${x.order.length}`} /><Row k="الحالة" v={x.solved ? 'تمت الإجابة' : 'مفتوح'} /><div className="side-divider" />{Object.entries(x.scores).sort((a, b) => b[1] - a[1]).map(([n, v], i) => <Person key={n} name={n} i={i} end={<b>{v}</b>} />)}</>;
  return <Shell title="تحدي عواصم العالم" side={side}>
    <div className="capital-scene">
      <div className="capital-globe">🌐</div><small>ما عاصمة الدولة التالية؟</small>
      <h3 dir="auto">{q[0]} <span className="cap-en" dir="ltr">· {q[1]}</span></h3>
      {x.solved && <div className="capital-answer" dir="auto">{q[2].split('|')[0]}<small>أجاب أولًا: <T>{x.winner}</T> · {x.ms}ms</small></div>}
      <div className="capital-command">اكتب اسم العاصمة في الشات — بالعربي أو English</div>
    </div>
    <button className="primary-btn full-btn" onClick={next}><SkipForward size={15} /> الدولة التالية</button>
  </Shell>;
}


/* ---------------- الألعاب الجديدة ---------------- */
const DECODE_WORDS = [
  ['ةسردم','مدرسة'], ['رتويبمك','كمبيوتر'], ['ةرايس','سيارة'],
  ['ةعماج','جامعة'], ['ةرئاط','طائرة'], ['نوفلت','تلفون'], ['ةقيدح','حديقة']
];

function DecodeGame({ reg }) {
  const force = useForce();
  const d = useRef(null);
  if(!d.current){
    const cfg=(()=>{try{return JSON.parse(localStorage.getItem('m92_game_options')||'{}').decode||{};}catch{return {};}})();
    const seconds=Math.max(10,Math.min(90,Number(cfg.duration)||20));
    d.current={i:rnd(DECODE_WORDS.length),scrambled:'',answer:'',seconds,left:seconds,started:false,winner:'',scores:{},timer:null};
    const pair=DECODE_WORDS[d.current.i]; d.current.scrambled=shuffle(pair[0].split('')).join(''); d.current.answer=pair[1];
  }
  const x=d.current;
  const start=()=>{
    clearInterval(x.timer); x.left=x.seconds; x.started=true; x.winner='';
    x.timer=setInterval(()=>{x.left-=1;if(x.left<=0){clearInterval(x.timer);x.started=false;force();}else force();},1000); force();
  };
  useEffect(()=>()=>clearInterval(x.timer),[]);
  const next=()=>{
    clearInterval(x.timer); x.i=rnd(DECODE_WORDS.length); const pair=DECODE_WORDS[x.i];
    x.scrambled=shuffle(pair[0].split('')).join(''); x.answer=pair[1]; x.left=x.seconds; x.started=false; x.winner=''; force();
  };
  const answer=(u,t)=>{
    if(!x.started) return 'ابدأ الجولة أولًا';
    if(x.winner) return 'تم حسم الجولة';
    if(matchAnswer(t,x.answer,{allowClose:false}).ok){x.winner=u;x.started=false;clearInterval(x.timer);x.scores[u]=(x.scores[u]||0)+1;force();return `🏆 ${u} فك الشيفرة: ${x.answer}`;}
    return null;
  };
  reg.current={handle:(u,t)=>{const c=parseCommand(t);if(c?.cmd==='start')return isHost(u,HOST)?(start(),'بدأت جولة فك الشيفرة'): 'هذا الأمر للمضيف فقط';if(c?.cmd==='next')return isHost(u,HOST)?(next(),'كلمة جديدة'): 'هذا الأمر للمضيف فقط';if(c?.cmd==='answer')return answer(u,c.args);if(c)return null;return answer(u,t);}};
  const ranking=Object.entries(x.scores).sort((a,b)=>b[1]-a[1]).slice(0,6);
  return <Shell title="فك الشيفرة" side={<><Row k="الوقت" v={`${x.left}s`}/><Row k="الحالة" v={x.started?'جارية':x.winner?'محسومة':'متوقفة'}/><div className="side-divider"/>{ranking.map(([n,p],i)=><Person key={n} name={n} i={i} end={<b>{p}</b>}/>)}</>}>
    <div className="newgame decode-game">
      <div className="game-topline"><span className="game-chip">CODE BREAK</span><span className="timer-chip">{String(x.left).padStart(2,'0')} ث</span></div>
      <div className="decode-lock"><span>فك الحروف</span><strong dir="ltr">{x.scrambled.split('').join(' ')}</strong><small>أرسل الكلمة الصحيحة في الشات</small></div>
      {x.winner?<div className="winner-banner">🏆 {x.winner} حلها: <b>{x.answer}</b></div>:!x.started&&x.left===0?<div className="timeout-banner">انتهى الوقت — الإجابة كانت <b>{x.answer}</b></div>:null}
      <div className="game-controls"><button className="primary-btn" onClick={start} disabled={x.started}><Play size={15}/> {x.started?'الجولة جارية':'ابدأ الجولة'}</button><button className="outline-btn" onClick={next}><SkipForward size={15}/> كلمة جديدة</button></div>
    </div>
  </Shell>;
}

function BombGame({ reg }) {
  const force=useForce(); const d=useRef(null);
  if(!d.current){const cfg=(()=>{try{return JSON.parse(localStorage.getItem('m92_game_options')||'{}').bomb||{};}catch{return {};}})();const seconds=Math.max(10,Math.min(60,Number(cfg.duration)||20));d.current={code:String(Math.floor(1000+Math.random()*9000)),seconds,left:seconds,started:false,solved:'',timer:null,scores:{}};}
  const x=d.current;
  const reset=()=>{clearInterval(x.timer);x.code=String(Math.floor(1000+Math.random()*9000));x.left=x.seconds;x.started=true;x.solved='';x.timer=setInterval(()=>{x.left--;if(x.left<=0){clearInterval(x.timer);x.started=false;force();}else force();},1000);force();};
  useEffect(()=>()=>clearInterval(x.timer),[]);
  const check=(u,t)=>{
    if(!x.started)return 'القنبلة غير مفعلة';
    if(x.solved)return 'تم فك القنبلة';
    const raw=clean(t).replace(/^[!！]/,'').trim();
    if(raw===x.code){x.solved=u;x.started=false;clearInterval(x.timer);x.scores[u]=(x.scores[u]||0)+1;force();return `💥 تم فك القنبلة بواسطة ${u}`;}
    return null;
  };
  reg.current={handle:(u,t)=>{const c=parseCommand(t);if(c?.cmd==='start')return isHost(u,HOST)?(reset(),'بدأ العد التنازلي'): 'هذا الأمر للمضيف فقط';if(c?.cmd==='reset')return isHost(u,HOST)?(reset(),'قنبلة جديدة'): 'هذا الأمر للمضيف فقط';if(c?.cmd==='answer')return check(u,c.args);if(c)return null;return check(u,t);}};
  const expired=!x.started&&!x.solved&&x.left<=0;
  return <Shell title="فك القنبلة" side={<><Row k="المؤقت" v={`${x.left}s`}/><Row k="الحالة" v={x.solved?'تم الفك':expired?'انفجرت':'جاهزة'}/><div className="side-divider"/>{Object.entries(x.scores).sort((a,b)=>b[1]-a[1]).map(([n,p],i)=><Person key={n} name={n} i={i} end={<b>{p}</b>}/>)}</>}>
    <div className={`newgame bomb-game ${expired?'bomb-expired':''} ${x.started?'bomb-live':''}`}>
      <div className="bomb-core"><div className="bomb-ring"><span>💣</span></div><strong>{expired?'BOOM':x.solved?'SAFE':'ARMED'}</strong><small>{expired?'انتهى الوقت':x.solved?`فكها ${x.solved}`:'الرمز مخفي — ابحث عنه'}</small></div>
      <div className="bomb-timer">{String(x.left).padStart(2,'0')}<small>ثانية</small></div>
      {x.solved&&<div className="winner-banner">🔓 القنبلة آمنة — الفائز <b>{x.solved}</b></div>}
      {expired&&<div className="timeout-banner">انفجرت القنبلة. الرمز كان <b>{x.code}</b></div>}
      <button className="primary-btn" onClick={reset}><RotateCcw size={15}/> {x.started?'إعادة تشغيل':'ابدأ القنبلة'}</button>
    </div>
  </Shell>;
}

function ProtectionGame({ reg }) {
  const force=useForce(); const d=useRef(null);
  if(!d.current){const cfg=(()=>{try{return JSON.parse(localStorage.getItem('m92_game_options')||'{}').protection||{};}catch{return {};}})();d.current={zones:Array.from({length:6},(_,i)=>({id:i+1,hp:100,hit:false})),scores:{},active:true,timer:null,attackMs:Math.max(1200,Number(cfg.attack)*1000||2400)};}
  const x=d.current;
  useEffect(()=>{
    const attack=()=>{if(!x.active)return;const z=x.zones[rnd(x.zones.length)];z.hit=true;z.hp=Math.max(0,z.hp-20);force();setTimeout(()=>{z.hit=false;force();},900);};
    x.timer=setInterval(attack,x.attackMs); return ()=>clearInterval(x.timer);
  },[]);
  const protect=(u,n)=>{
    const z=x.zones.find(v=>v.id===Number(n)); if(!z)return 'اختر منطقة من 1 إلى 6';
    if(z.hp<=0)return 'هذه المنطقة سقطت';
    if(!z.hit)return 'لا يوجد هجوم على هذه المنطقة الآن';
    z.hp=Math.min(100,z.hp+20);z.hit=false;x.scores[u]=(x.scores[u]||0)+1;force();return `🛡️ ${u} حمى المنطقة ${z.id} +1`;
  };
  reg.current={handle:(u,t)=>{const raw=clean(t);const m=raw.match(/^(?:!|！|\/)?(?:protect|حماية|احمي)\s*([1-6])$/i);if(m)return protect(u,m[1]);if(/^[1-6]$/.test(raw))return protect(u,raw);return null;}};
  const ranking=Object.entries(x.scores).sort((a,b)=>b[1]-a[1]).slice(0,8);
  return <Shell title="حماية" side={<><Row k="المناطق" v="6"/><Row k="الهجوم" v="متغير"/><div className="side-divider"/>{ranking.map(([n,p],i)=><Person key={n} name={n} i={i} end={<b>{p}</b>}/>)}</>}>
    <div className="newgame protection-game">
      <div className="protection-head"><div><span className="game-chip">DEFEND THE ZONE</span><h3>احمِ المنطقة عند نزول الهجوم</h3></div><span className="live-indicator">● LIVE</span></div>
      <div className="zone-grid">{x.zones.map(z=><button key={z.id} className={`zone-card ${z.hit?'under-attack':''} ${z.hp<=0?'fallen':''}`} onClick={()=>protect('المضيف',z.id)}><span>منطقة {z.id}</span><strong>{z.hp}%</strong><div><i style={{width:`${z.hp}%`}}/></div><small>{z.hit?'⚠️ تحت الهجوم':'🛡️ محمية'}</small></button>)}</div>
      <p className="game-hint">في الشات: <code>!protect 3</code> لحماية المنطقة 3 عند تعرضها للهجوم.</p>
    </div>
  </Shell>;
}

function FishingGame({ reg }) {
  const force=useForce(); const d=useRef(null);
  if(!d.current){const cfg=(()=>{try{return JSON.parse(localStorage.getItem('m92_game_options')||'{}').fishing||{};}catch{return {};}})();const count=Math.max(4,Math.min(8,Number(cfg.fish)||6));d.current={target:rnd(count)+1,round:1,winner:'',scores:{},active:true,fish:Array.from({length:count},(_,i)=>i+1),count};}
  const x=d.current;
  const next=()=>{x.target=rnd(x.count)+1;x.round++;x.winner='';x.active=true;force();};
  const fish=(u,n)=>{if(!x.active)return 'انتهت الجولة';if(Number(n)!==x.target)return null;x.winner=u;x.active=false;x.scores[u]=(x.scores[u]||0)+1;force();return `🎣 ${u} اصطاد السمكة الصحيحة!`;};
  reg.current={handle:(u,t)=>{const raw=clean(t);const m=raw.match(/^(?:!|！|\/)?(?:fish|صيد|سمك)\s*([1-8])$/i);if(m)return fish(u,m[1]);if(/^[1-8]$/.test(raw))return fish(u,raw);return null;}};
  return <Shell title="صيد السمك" side={<><Row k="الجولة" v={x.round}/><Row k="الحالة" v={x.active?'صيد مفتوح':'تم الاصطياد'}/><div className="side-divider"/>{Object.entries(x.scores).sort((a,b)=>b[1]-a[1]).map(([n,p],i)=><Person key={n} name={n} i={i} end={<b>{p}</b>}/>)}</>}>
    <div className="newgame fishing-game">
      <div className="water-stage"><div className="water-surface"/>{x.fish.map(n=><button key={n} className={`fish-token fish-${n}`} onClick={()=>fish('المضيف',n)}><span>🐟</span><b>{n}</b></button>)}<div className="target-note">🎯 السمكة المطلوبة مخفية عن الجمهور</div></div>
      {x.winner?<div className="winner-banner">🎣 اصطادها <b>{x.winner}</b> — كانت السمكة رقم {x.target}</div>:<div className="game-hint">في الشات: أرسل رقم السمكة <code>1–6</code> أو <code>!fish 4</code>.</div>}
      <button className="primary-btn" onClick={next}><RotateCcw size={15}/> جولة صيد جديدة</button>
    </div>
  </Shell>;
}

const M92_STAGES=[
  {type:'معلومات عامة',q:'ما عاصمة الجزائر؟',a:'الجزائر',icon:'🧠'},
  {type:'أعلام',q:'أي دولة يرتبط بها هذا العلم؟ 🇯🇵',a:'اليابان|Japan',icon:'🚩'},
  {type:'كلمات',q:'أكمل الكلمة: م_رسة',a:'مدرسة',icon:'🔤'},
  {type:'أكواب',q:'أي كوب يحتوي الكرة؟ اختر 1 أو 2 أو 3.',a:'2',icon:'🥤'},
  {type:'كرة قدم',q:'كم لاعبًا يبدأ به الفريق داخل الملعب؟',a:'11|أحد عشر',icon:'⚽'},
  {type:'متاهة',q:'للوصول للنهاية اتبع المسار: يمين ثم أعلى ثم يمين. ما أول حركة؟',a:'يمين|right',icon:'🧭'},
  {type:'أسرع',q:'اكتب كلمة "M92" بأسرع وقت.',a:'M92',icon:'⚡'}
];
function M92Round({ reg }) {
  const force=useForce(); const d=useRef(null);
  if(!d.current)d.current={i:0,solved:'',scores:{},started:false};
  const x=d.current,cur=M92_STAGES[x.i];
  const answer=(u,t)=>{if(!x.started)return 'ابدأ الجولة أولًا';if(x.solved)return 'انتهت هذه المرحلة';if(matchAnswer(t,cur.a,{allowClose:false}).ok){x.solved=u;x.scores[u]=(x.scores[u]||0)+1;force();return `🏆 ${u} حل المرحلة: ${cur.type}`;}return null;};
  const start=()=>{x.started=true;x.solved='';force();};
  const next=()=>{x.i=(x.i+1)%M92_STAGES.length;x.solved='';x.started=true;force();};
  reg.current={handle:(u,t)=>{const c=parseCommand(t);if(c?.cmd==='start')return isHost(u,HOST)?(start(),'بدأت جولة M92'): 'هذا الأمر للمضيف فقط';if(c?.cmd==='next')return isHost(u,HOST)?(next(),'المرحلة التالية'): 'هذا الأمر للمضيف فقط';if(c?.cmd==='answer')return answer(u,c.args);if(c)return null;return answer(u,t);}};
  return <Shell title="جولة M92" side={<><Row k="المرحلة" v={`${x.i+1} / ${M92_STAGES.length}`}/><Row k="النوع" v={cur.type}/><div className="side-divider"/>{Object.entries(x.scores).sort((a,b)=>b[1]-a[1]).map(([n,p],i)=><Person key={n} name={n} i={i} end={<b>{p}</b>}/>)}</>}>
    <div className="newgame m92-round-game">
      <div className="round-progress">{M92_STAGES.map((s,i)=><span key={s.type} className={i===x.i?'active':''}>{i+1}</span>)}</div>
      <div className="stage-card"><div className="stage-icon">{cur.icon}</div><span className="game-chip">{cur.type}</span><h3>{cur.q}</h3><p>أول إجابة صحيحة في الشات تحصد نقطة.</p></div>
      {x.solved&&<div className="winner-banner">🏆 {x.solved} فاز بهذه المرحلة</div>}
      <div className="game-controls"><button className="primary-btn" onClick={start} disabled={x.started&&!x.solved}><Play size={15}/> {x.started?'المرحلة مفتوحة':'ابدأ المرحلة'}</button><button className="outline-btn" onClick={next}><SkipForward size={15}/> المرحلة التالية</button></div>
    </div>
  </Shell>;
}

/* ---------------- M92 فيود ---------------- */
const FEUD_DEFAULT = [
  { q:'اذكر شيئًا يفعله الناس قبل النوم', answers:[['تفريش الأسنان',40],['تصفح الجوال',28],['مشاهدة التلفاز',16],['قراءة',9],['شرب الماء',7]] },
  { q:'اذكر رياضة يحب الناس متابعتها', answers:[['كرة القدم',46],['كرة السلة',21],['التنس',14],['الملاكمة',10],['السباقات',9]] },
  { q:'اذكر شيئًا تجده في الثلاجة', answers:[['ماء',32],['حليب',24],['خضار',19],['عصير',15],['جبن',10]] }
];
function loadFeudQuestions(){
  try { const saved=JSON.parse(localStorage.getItem('m92_feud_questions') || 'null'); if(Array.isArray(saved) && saved.length) return saved.filter(q=>q.q && Array.isArray(q.answers)).map(q=>({...q,answers:q.answers.map(a=>[String(a[0]),Number(a[1])||0])})); } catch {}
  return FEUD_DEFAULT.map(x=>({...x,answers:x.answers.map(a=>[...a])}));
}
function Feud({reg}){
  const force=useForce();
  const D=useRef(null);
  if(!D.current){ const cfg=(()=>{try{return JSON.parse(localStorage.getItem('m92_game_options')||'{}').feud||{};}catch{return {};}})(); D.current={questions:loadFeudQuestions(),i:0,revealed:[],answerers:{},teamA:cfg.teamA||'M92',teamB:cfg.teamB||'المنافسون',scores:[0,0],turn:0,wrong:0,started:false,txt:'',strikeLimit:Number(cfg.strikes)||3,double:!!cfg.double}; }
  const d=D.current; const cur=d.questions[d.i];
  const reveal=(i,user='المضيف')=>{
    if(!d.revealed.includes(i)){
      d.revealed.push(i); d.answerers[i]=clean(user)||'مشاهد';
      d.scores[d.turn]+=cur.answers[i][1] * (d.double ? 2 : 1); force();
      return true;
    }
    return false;
  };
  const check=(u,t)=>{
    const raw=clean(t).replace(/^[!！]/,'').trim();
    const parsed=parseCommand(t);
    // Accept !answer <text> and the requested shorthand !<answer>.
    const answerText=parsed?.cmd==='answer' ? parsed.args : (parsed?.unknown ? [parsed.unknown, parsed.args].filter(Boolean).join(' ') : raw);
    if(!answerText) return 'اكتب الإجابة بعد علامة ! مثال: !كرة القدم';
    const q=normalize(answerText);
    const i=cur.answers.findIndex(a=>normalize(a[0])===q);
    if(i>=0){
      if(d.revealed.includes(i)) return `هذه الإجابة كُشفت بالفعل بواسطة ${d.answerers[i]||'مشاهد آخر'}`;
      reveal(i,u);
      return `إجابة صحيحة: ${cur.answers[i][0]} (+${cur.answers[i][1]})`;
    }
    d.wrong++;
    if(d.wrong>=d.strikeLimit){d.turn=d.turn?0:1;d.wrong=0;force();return `${d.strikeLimit} أخطاء — انتقل الدور للفريق الآخر`;}
    force(); return `إجابة غير موجودة (${d.wrong}/${d.strikeLimit} أخطاء)`;
  };
  const next=()=>{d.i=(d.i+1)%d.questions.length;d.revealed=[];d.answerers={};d.wrong=0;d.turn=0;d.started=true;force();};
  const reset=()=>{d.i=0;d.revealed=[];d.answerers={};d.wrong=0;d.turn=0;d.scores=[0,0];d.started=false;force();};
  reg.current={handle:(u,t)=>{
    const c=parseCommand(t);
    if(c?.cmd==='start') return isHost(u,HOST)?(d.started=true,force(),'بدأت فعالية M92 فيود 🔥'):'هذا الأمر للمضيف فقط';
    if(c?.cmd==='next') return isHost(u,HOST)?(next(),'انتقلنا للسؤال التالي'):'هذا الأمر للمضيف فقط';
    if(c?.cmd==='reset') return isHost(u,HOST)?(reset(),'تمت إعادة ضبط الفعالية'):'هذا الأمر للمضيف فقط';
    if(!d.started) return 'لم تبدأ الجولة بعد';
    if(!clean(t).startsWith('!')&&!clean(t).startsWith('！')) return 'أرسل الإجابة مسبوقة بعلامة !';
    return check(u,t);
  },samples:()=>({right:'!'+cur.answers.find(a=>!d.revealed.includes(cur.answers.indexOf(a)))?.[0],wrong:'!إجابة غير موجودة'})};
  const side=<><Row k="السؤال" v={`${d.i+1} / ${d.questions.length}`}/><Row k="الدور" v={d.turn===0?d.teamA:d.teamB}/><Row k="الأخطاء" v={`${d.wrong} / ${d.strikeLimit}`}/><div className="side-divider"/><Person name={d.teamA} i={0} end={<strong>{d.scores[0]}</strong>}/><Person name={d.teamB} i={1} end={<strong>{d.scores[1]}</strong>}/></>;
  return <Shell title="M92 فيود" side={side}><div className="feud-stage">
    <div className="feud-score"><div><small>{d.teamA}</small><strong>{d.scores[0]}</strong></div><span>VS</span><div><small>{d.teamB}</small><strong>{d.scores[1]}</strong></div></div>
    <div className="feud-question"><span>السؤال {d.i+1}</span><h3>{cur.q}</h3></div>
    <div className="feud-answers">{cur.answers.map(([a,p],i)=>{const shown=d.revealed.includes(i);return <button className={shown?'feud-answer revealed':'feud-answer'} key={i} onClick={()=>reveal(i,'المضيف')}><b>{String(i+1).padStart(2,'0')}</b><span>{shown?a:'كشف الإجابة'}{shown&&<small className="feud-answerer">أجاب: {d.answerers[i]}</small>}</span><strong>{shown?p:'?'}</strong></button>;})}</div>
    <div className="feud-chat-hint">إجابة المشاهد في الشات: <code dir="ltr">!كرة القدم</code> أو <code dir="ltr">!answer كرة القدم</code></div>
    <div className="feud-controls"><input value={d.txt} onChange={e=>{d.txt=e.target.value;force();}} onKeyDown={e=>{if(e.key==='Enter'&&d.txt.trim()){check('المضيف',d.txt.startsWith('!')?d.txt:'!'+d.txt);d.txt='';force();}}} placeholder="اختبر إجابة تبدأ بـ !"/><button className="primary-btn" onClick={()=>{if(d.txt.trim()){check('المضيف',d.txt.startsWith('!')?d.txt:'!'+d.txt);d.txt='';force();}}}><Check size={15}/> تحقق</button><button className="outline-btn" onClick={next}><SkipForward size={15}/> التالي</button><button className="outline-btn" onClick={reset}><RotateCcw size={14}/> إعادة الجولة</button></div>
  </div></Shell>;
}

export const RealGames = {
  roulette: Roulette,
  'roulette-challenge': RouletteChallenge,
  guess: Guess,
  chairs: Chairs,
  typing: TypeRace,
  drawguess: DrawGuess,
  words: WordBattle,
  capitals: Capitals,
  feud: Feud,
  decode: DecodeGame,
  bomb: BombGame,
  protection: ProtectionGame,
  fishing: FishingGame,
  'm92-round': M92Round
};
