import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, ArrowRight, ArrowUpLeft, Search, Gamepad2, Users, Sparkles, Trophy, ChevronDown,
  CircleHelp, Clock3, X, Check,
  Zap, Dices, Brain, Keyboard, Palette, Menu, Home, Compass, MessageCircle, Monitor, Radio, Settings2, Lock, SlidersHorizontal, Plus, Play, Eye, RotateCcw, Volume2, VolumeX, Image as ImageIcon, Palette as PaletteIcon, Save, Trash2
} from 'lucide-react';
import { RealGames } from './games.jsx';
import { SecretWindow } from './drawguess.jsx';
import { clean } from './text.js';
import './styles.css';

if (typeof window !== 'undefined' && !window.M92Play) {
  window.M92Play = {
    dispatch: () => ({ ok:false, reason:'no-active-game', message:'لا توجد لعبة مفتوحة حاليًا.' })
  };
}

function ShieldIcon({ size = 24, ...props }){ return <span className="emoji-icon emoji-shield" style={{fontSize:`${size}px`,lineHeight:1}} aria-hidden="true" {...props}>🛡️</span>; }
function WavesIcon({ size = 24, ...props }){ return <span className="emoji-icon emoji-waves" style={{fontSize:`${size}px`,lineHeight:1}} aria-hidden="true" {...props}>🐟</span>; }

const DEFAULT_CHAIR_PLAYERS = ['M92','Streamer','Viewer 01','Viewer 02','Viewer 03','Viewer 04'];
const DEFAULT_GUESS_QUESTIONS = [
  { q:'ما عاصمة السعودية؟', a:'الرياض', h:'تبدأ بحرف الراء' },
  { q:'كم عدد ألوان قوس قزح؟', a:'7|سبعة|سبع', h:'' },
  { q:'ما أكبر كوكب في المجموعة الشمسية؟', a:'المشتري', h:'' }
];
const DEFAULT_RULES = {
  roulette:'أضف المشاركين، أدر العجلة، ثم اعتمد النتيجة. يمكن تبديل وضع العجلة إلى وضع التحديات من داخل اللعبة.',
  'roulette-challenge':'تدور العجلة على المشاركين. يظهر تحدٍ للاسم المختار؛ تنفيذ التحدي يبقي اللاعب، وعدم تنفيذه يخرجه من الجولة.',
  chairs:'يشارك اللاعبون عبر الشات، وتقل المقاعد مع كل جولة حتى يبقى فائز واحد.',
  typing:'اكتب النص الظاهر في الشات بأسرع وقت. أول إجابة صحيحة تحصد النقاط.',
  guess:'يظهر سؤال واحد في كل مرة. أول إجابة صحيحة في الشات تحصد النقاط.',
  drawguess:'يظهر الرسم للجمهور والكلمة السرية تبقى مخفية عن شاشة البث.',
  words:'كوّن كلمات صحيحة من الحروف المعروضة واجمع النقاط.',
  capitals:'اكتب عاصمة الدولة الظاهرة قبل بقية المشاركين.',
  feud:'اكشف إجابات الجمهور الصحيحة واجمع النقاط للفريق.',
  decode:'فك الحروف الملخبطة واكتب الكلمة الصحيحة قبل انتهاء الوقت.',
  bomb:'أرسل الرمز الصحيح قبل انتهاء المؤقت. أول إجابة صحيحة تفوز؛ وإلا تنفجر القنبلة وتنتهي الجولة.',
  protection:'تظهر مناطق مرقمة وتتلقى هجمات. احمِ المناطق قبل وصول الضرر واجمع أكبر عدد من النقاط.',
  fishing:'اصطد السمكة المطلوبة من بين الأسماك المتحركة. أول لاعب يرسل الرقم الصحيح يفوز بالجولة.',
  'm92-round':'جولة متعددة المراحل: معلومات عامة، أعلام، كلمات، أكواب، كرة قدم، متاهة، وأسرع.'
};
function readStoredArray(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value : [...fallback];
  } catch { return [...fallback]; }
}
function getSavedContent() {
  try {
    const value = JSON.parse(localStorage.getItem('m92_game_content') || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}

const games = [
  { id:'roulette-challenge', title:'روليت التحديات', subtitle:'الروليت يختار اللاعب والتحدي يقرر مصيره', category:'تحديات', players:'2–100', time:'3–10 دقائق', color:'gold', icon:Dices, tag:'تحديات', description:'تدور الروليت على اللاعبين، ويظهر تحدٍ للاعب المختار. تنفيذ التحدي يبقيه في اللعبة، وعدم تنفيذه يخرجه.' },
  { id:'decode', title:'فك الشيفرة', subtitle:'فك الكلمة قبل انتهاء الوقت', category:'ألغاز وتخمين', players:'2–100+', time:'1–5 دقائق', color:'lime', icon:Lock, tag:'مؤقت', description:'تظهر كلمة مشفرة أو حروفها ملخبطة، ويملك اللاعبون وقتًا محدودًا لإرسال الإجابة الصحيحة.' },
  { id:'bomb', title:'فك القنبلة', subtitle:'اعثر على الرمز قبل انتهاء العد التنازلي', category:'تحديات', players:'2–100+', time:'1–3 دقائق', color:'orange', icon:Clock3, tag:'ضغط الوقت', description:'يظهر رمز مخفي ويبدأ العد التنازلي. من يرسل الرمز الصحيح يفوز، وإذا انتهى الوقت دون إجابة تنتهي الجولة بانفجار القنبلة.' },
  { id:'protection', title:'حماية', subtitle:'احمِ أكبر عدد من المناطق', category:'منافسات', players:'2–100+', time:'3–8 دقائق', color:'violet', icon:ShieldIcon, tag:'تجميع نقاط', description:'تظهر مناطق مرقمة، وتتعرض مناطق مختارة للحجارة أو الصواريخ. اللاعب الذي يحمي أكبر عدد من المناطق يجمع أعلى نقاط.' },
  { id:'fishing', title:'صيد السمك', subtitle:'اصطد السمكة قبل غيرك', category:'منافسات', players:'2–100+', time:'2–5 دقائق', color:'blue', icon:WavesIcon, tag:'سريعة', description:'بدل الجلوس على كرسي، يحاول كل لاعب اصطياد السمكة الصحيحة قبل بقية اللاعبين.' },
  { id:'m92-round', title:'جولة M92', subtitle:'مجموعة تحديات سريعة في جولة واحدة', category:'جولة M92', players:'2–100+', time:'5–15 دقيقة', color:'pink', icon:Gamepad2, tag:'متنوعة', description:'جولة تجمع معلومات عامة، أعلام، كلمات، أكواب، كرة قدم، متاهة، وأسرع.' },
  { id:'roulette', title:'الروليت', subtitle:'دع الحظ يختار', category:'ألعاب الحظ', players:'2–100', time:'1–5 دقائق', color:'gold', icon:Dices, tag:'الأكثر لعبًا', description:'أضف الأسماء أو الخيارات، أدر العجلة، واترك النتيجة تصنع لحظة البث القادمة.' },
  { id:'chairs', title:'لعبة الكراسي', subtitle:'آخر شخص يبقى يفوز', category:'منافسات', players:'4–30', time:'5–10 دقائق', color:'orange', icon:Users, tag:'تنافسية', description:'جولات إقصائية، مقاعد أقل في كل جولة، ومنافسة حتى يبقى فائز واحد.' },
  { id:'typing', title:'سرعة الكتابة', subtitle:'اكتب ما يظهر قبل الجميع', category:'منافسات', players:'2–100+', time:'2–5 دقائق', color:'lime', icon:Keyboard, tag:'سريعة', description:'تظهر كلمة أو رقم أو رمز على الشاشة، وأسرع مشاهد يكتبه في الشات يأخذ النقاط — بالعربي أو الإنجليزي.' },
  { id:'guess', title:'خمنها', subtitle:'هل تستطيع معرفة الإجابة؟', category:'ألغاز وتخمين', players:'2–50', time:'3–8 دقائق', color:'blue', icon:Brain, tag:'تحدّي الذكاء', description:'أضف أسئلتك بنفسك من داخل الموقع، وأول من يجاوب صح يأخذ النقطة.' },
  { id:'drawguess', title:'تحدي الرسم', subtitle:'ارسم ودع الجمهور يخمّن', category:'ألغاز وتخمين', players:'2–100+', time:'3–8 دقائق', color:'pink', icon:Palette, tag:'تفاعل مباشر', description:'ترسم أنت على لوحة حقيقية، والكلمة السرية تبقى مخفية عن الشاشة وتصلك في نافذة خاصة، والجمهور يخمّن من الشات.' },
  { id:'words', title:'معركة الكلمات', subtitle:'كوّن أكبر عدد من الكلمات', category:'ألغاز وتخمين', players:'2–100+', time:'2–4 دقائق', color:'lime', icon:Sparkles, tag:'تحدي لغوي', description:'تظهر مجموعة حروف، وعلى المشاهدين تكوين كلمات صحيحة منها وجمع النقاط.' },
  { id:'capitals', title:'عواصم العالم', subtitle:'أجب قبل بقية المشاهدين', category:'ألغاز وتخمين', players:'2–100+', time:'3–6 دقائق', color:'violet', icon:Compass, tag:'معلومات عامة', description:'تظهر دولة على الشاشة، وأول مشاهد يكتب عاصمتها الصحيحة يحصد نقطة.' },
  { id:'feud', title:'M92 فيود', subtitle:'سؤال واحد… والجمهور يحدد أشهر الإجابات', category:'تفاعل الجمهور', players:'4–100+', time:'8–15 دقيقة', color:'violet', icon:Trophy, tag:'فعالية جماعية', description:'فعالية فرق سريعة بنظام كشف الإجابات والنقاط، مصممة للمذيع ولحظات التفاعل الكبيرة في البث.' }
];

const categories = ['الكل', 'تفاعل الجمهور', 'ألعاب الحظ', 'منافسات', 'ألغاز وتخمين', 'تحديات', 'جولة M92'];

function Logo({ small=false }) {
  return <div className={`brand ${small ? 'brand-small' : ''}`}>
    <img src="/m92-logo.png" alt="M92" />
    <div className="brand-copy"><strong>M92 <span>PLAY</span></strong><small>PLAY TOGETHER</small></div>
  </div>;
}

function Header({ onHome, onGoto, onControl }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (id) => { setMenuOpen(false); if (id === 'games') onGoto('games'); else if (id === 'about') onGoto('about'); };
  return <header className="topbar">
    <button className="menu-button icon-btn" aria-label="فتح القائمة" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><Menu size={20}/></button>
    <button className="brand-button" onClick={() => {setMenuOpen(false);onHome();}}><Logo /></button>
    <nav className={menuOpen ? 'nav nav-open' : 'nav'}>
      <button className="nav-link active" onClick={onHome}><Home size={16}/> الرئيسية</button>
      <button className="nav-link" onClick={() => go('games')}><Compass size={16}/> استكشف الألعاب</button>
      <button className="nav-link" onClick={() => go('about')}><CircleHelp size={16}/> عن المنصة</button>
      <button className="nav-link control-nav-link" onClick={() => {setMenuOpen(false);onControl();}}><Monitor size={16}/> لوحة التحكم</button>
    </nav>
    <div className="header-actions">
      <span className="live-dot"></span><span className="community-label">منصة المجتمع</span>
      <button className="host-button" onClick={onControl}><Monitor size={16}/> لوحة التحكم</button>
    </div>
    {menuOpen && <button className="nav-backdrop" aria-label="إغلاق القائمة" onClick={() => setMenuOpen(false)}></button>}
  </header>;
}

function GameCard({ game, onOpen, index }) {
  const Icon = game.icon;
  let customCover = ''; let customTheme = '';
  try { customCover = JSON.parse(localStorage.getItem('m92_game_covers') || '{}')[game.id] || ''; customTheme = JSON.parse(localStorage.getItem('m92_game_themes') || '{}')[game.id] || ''; } catch {}
  return (
    <button
      className={`game-card ${game.color}`}
      style={{
        ...(customTheme ? { '--card-theme': customTheme } : {}),
        '--delay': `${index * 60}ms`,
      }}
      onClick={() => onOpen(game)}
    >
    <div className="card-topline"><span className="game-category">{game.category}</span><span className="card-arrow"><ArrowUpLeft size={17}/></span></div>
    <div className="game-art">
      <div className="art-orbit orbit-one"></div><div className="art-orbit orbit-two"></div>
      <div className="art-glow"></div>
      {customCover ? <div className="game-scene custom-cover-scene"><img src={customCover} alt=""/><div className="custom-cover-shade"></div></div> : game.id === 'roulette' ? <div className="game-scene roulette-scene"><div className="scene-badge">LUCK</div><div className="roulette-art"><div className="wheel-segments"></div><div className="wheel-center"><Icon size={35}/></div><span className="wheel-pin"></span></div></div> :
       game.id === 'chairs' ? <div className="game-scene chairs-scene"><div className="scene-badge">MUSICAL</div><div className="mini-chair-ring">{[1,2,3,4,5,6].map(n=><i key={n} style={{'--n':n}}><b>{n}</b></i>)}</div></div> :
       game.id === 'typing' ? <div className="game-scene typing-scene"><div className="speed-line"></div><div className="typing-card-art"><span dir="ltr">A7K2</span><span>اكتب!</span><span dir="ltr">٤٨٢١</span></div></div> :
       game.id === 'drawguess' ? <div className="game-scene draw-scene"><div className="draw-board-mini"><span>?</span><i></i><i></i><i></i></div><div className="scene-pencil">✎</div></div> :
       game.id === 'feud' ? <div className="game-scene feud-scene"><div className="feud-mini-board"><b>TOP ANSWERS</b><span>01 · 42</span><span>02 · 27</span><span>03 · 18</span></div><div className="feud-light"></div></div> :
       <div className="game-scene generic-scene"><Icon size={60} strokeWidth={1.4}/><span className="spark spark-a">✦</span><span className="spark spark-b">✧</span></div>}
      <span className="art-index">0{index + 1}</span>
    </div>
    <div className="card-body">
      <div className="card-title-row"><h3>{game.title}</h3><span className="tag">{game.tag}</span></div>
      <p>{game.subtitle}</p>
      <div className="card-meta"><span><Users size={14}/>{game.players} لاعب</span><span><Clock3 size={14}/>{game.time}</span></div>
    </div>
    <div className="card-play"><span>افتح اللعبة</span><ArrowLeft size={16}/></div>
    </button>
  );
}


function ChatSlot(){ return <section className="chat-slot-panel"><div className="mock-chat-head"><div><span className="eyebrow"><MessageCircle size={14}/> الشات</span><h3>مساحة الشات</h3></div><span className="chat-status-pill">جاهز للربط</span></div><p className="mock-chat-note">هذه المساحة مخصصة لرسائل الشات الحقيقية. ربط البوت ومعالجة الرسائل يتم من خارج الموقع.</p><div className="chat-slot-empty">بانتظار اتصال البوت…</div></section>; }

function ControlPanel({ onBack, onOpenGame }) {
  const [tab, setTab] = useState('overview');
  const [selected, setSelected] = useState('feud');
  const [themeColor, setThemeColor] = useState(() => { try { return JSON.parse(localStorage.getItem('m92_game_themes') || '{}')['feud'] || '#8dffcf'; } catch { return '#8dffcf'; } });
  const [designStyle, setDesignStyle] = useState(() => { try { return JSON.parse(localStorage.getItem('m92_game_designs') || '{}')['feud'] || 'signature'; } catch { return 'signature'; } });
  const [gameOptions, setGameOptions] = useState(() => { try { return JSON.parse(localStorage.getItem('m92_game_options') || '{}'); } catch { return {}; } });
  const [rouletteItems, setRouletteItems] = useState(() => { try { return JSON.parse(localStorage.getItem('m92_roulette_items') || '[\"Nawaf\",\"Rakan\",\"M7md\",\"Layan\"]'); } catch { return ['Nawaf','Rakan','M7md','Layan']; } });
  const [newRouletteItem, setNewRouletteItem] = useState('');
  const [chairPlayers, setChairPlayers] = useState(() => readStoredArray('m92_chairs_players', DEFAULT_CHAIR_PLAYERS));
  const [newChairPlayer, setNewChairPlayer] = useState('');
  const [guessQuestions, setGuessQuestions] = useState(() => { const saved=readStoredArray('m92-guess-questions', DEFAULT_GUESS_QUESTIONS); return saved.length?saved:DEFAULT_GUESS_QUESTIONS; });
  const [guessDraft, setGuessDraft] = useState({q:'',a:'',h:''});
  const [cover, setCover] = useState(() => { try { return JSON.parse(localStorage.getItem('m92_game_covers') || '{}'); } catch { return {}; } });
  const [content, setContent] = useState(() => getSavedContent());
  const defaultFeudQuestions = [
    { q:'اذكر شيئًا يفعله الناس قبل النوم', answers:[['تفريش الأسنان',40],['تصفح الجوال',28],['مشاهدة التلفاز',16],['قراءة',9],['شرب الماء',7]] },
    { q:'اذكر رياضة يحب الناس متابعتها', answers:[['كرة القدم',46],['كرة السلة',21],['التنس',14],['الملاكمة',10],['السباقات',9]] },
    { q:'اذكر شيئًا تجده في الثلاجة', answers:[['ماء',32],['حليب',24],['خضار',19],['عصير',15],['جبن',10]] }
  ];
  const [questions, setQuestions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('m92_feud_questions') || 'null') || defaultFeudQuestions; } catch { return defaultFeudQuestions; }
  });
  const [draft, setDraft] = useState({q:'', answer:'', points:10});
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [pointDrafts, setPointDrafts] = useState({});
  const current = games.find(g=>g.id===selected) || games[0];
  const gameConfig = gameOptions[selected] || {};
  const updateGameOption = (key, value) => { const next={...gameOptions,[selected]:{...gameConfig,[key]:value}}; setGameOptions(next); try { localStorage.setItem('m92_game_options', JSON.stringify(next)); } catch {} };
  const themePresets = [{id:'mint',name:'نعناعي',color:'#8dffcf',soft:'rgba(141,255,207,.16)'},{id:'gold',name:'ذهبي',color:'#e9bd68',soft:'rgba(233,189,104,.16)'},{id:'ocean',name:'محيطي',color:'#72bfff',soft:'rgba(114,191,255,.16)'},{id:'violet',name:'بنفسجي',color:'#b69aff',soft:'rgba(182,154,255,.16)'},{id:'rose',name:'وردي',color:'#ff9fbd',soft:'rgba(255,159,189,.16)'}];
  const saveQuestions = (next) => { setQuestions(next); try { localStorage.setItem('m92_feud_questions', JSON.stringify(next)); } catch {} };
  const saveGuessQuestions = (next) => { setGuessQuestions(next); try { localStorage.setItem('m92-guess-questions', JSON.stringify(next)); } catch {} };
  const saveChairPlayers = (next) => { setChairPlayers(next); try { localStorage.setItem('m92_chairs_players', JSON.stringify(next)); } catch {} };
  const addChairPlayer = () => {
    const name=newChairPlayer.trim();
    if(!name) return;
    if(chairPlayers.some(p=>p.toLowerCase()===name.toLowerCase())) { window.alert('هذا اللاعب موجود بالفعل.'); return; }
    const limit=Math.max(3,Math.min(30,Number(gameConfig.players)||12));
    if(chairPlayers.length>=limit) { window.alert(`وصلت إلى الحد المحدد: ${limit} لاعب.`); return; }
    saveChairPlayers([...chairPlayers,name]); setNewChairPlayer('');
  };
  const saveCover = (data) => { const next={...cover,[selected]:data}; setCover(next); try { localStorage.setItem('m92_game_covers', JSON.stringify(next)); } catch {} };
  const saveTheme = (value) => { setThemeColor(value); try { const next={...JSON.parse(localStorage.getItem('m92_game_themes') || '{}'),[selected]:value}; localStorage.setItem('m92_game_themes', JSON.stringify(next)); } catch {} };
  const designOptions = {
    roulette:[['signature','طاولة كازينو','عجلة مركزية وإضاءة محيطية'],['broadcast','استوديو مباشر','لوحة نتائج وإطار بث'],['minimal','واجهة نظيفة','تركيز على خيارات العجلة']],
    chairs:[['signature','حلبة المنافسة','أرضية دائرية ومقاعد ثابتة'],['broadcast','قاعة البطولة','منصة وجمهور ولوحة جولات'],['minimal','ساحة بسيطة','مقاعد واضحة ومساحة لعب واسعة']],
    typing:[['signature','سباق السرعة','مسارات وحركة زمنية'],['broadcast','استوديو التحدي','عداد كبير ولوحة متصدرين'],['minimal','تركيز الكتابة','نص كبير ومساحة خالية']],
    guess:[['signature','غرفة الألغاز','بطاقات سؤال وتلميحات'],['broadcast','مسابقة مباشرة','عداد ونقاط بارزة'],['minimal','بطاقة السؤال','سؤال مركزي واضح']],
    drawguess:[['signature','مرسم الفنان','لوحة رسم كبيرة وأدوات'],['broadcast','تحدي مباشر','لوحة عرض ومؤقت'],['minimal','لوحة نظيفة','مساحة رسم واسعة']],
    words:[['signature','مختبر الحروف','حروف بارزة وشبكة كلمات'],['broadcast','تحدي الجمهور','عداد ونقاط مباشرة'],['minimal','لوحة الكلمات','تركيز على الحروف']],
    capitals:[['signature','أطلس العالم','بطاقات خرائط ومعلومات'],['broadcast','مسابقة جغرافيا','دولة ومؤقت ونقاط'],['minimal','بطاقة الدولة','معلومة مركزية واضحة']],
    feud:[['signature','لوحة تلفزيونية','لوحة إجابات ومساحات فرق'],['broadcast','استوديو المسابقة','شاشة نتائج كبيرة'],['minimal','لوحة استطلاع','إجابات مرتبة وبسيطة']]
  };
  const saveDesign = (value) => { setDesignStyle(value); try { const next={...JSON.parse(localStorage.getItem('m92_game_designs') || '{}'),[selected]:value}; localStorage.setItem('m92_game_designs',JSON.stringify(next)); } catch {} };
  useEffect(() => {
    try {
      const savedFeud=JSON.parse(localStorage.getItem('m92_feud_questions') || 'null');
      setQuestions(Array.isArray(savedFeud) && savedFeud.length ? savedFeud : defaultFeudQuestions);
      {const savedGuess=readStoredArray('m92-guess-questions', DEFAULT_GUESS_QUESTIONS);setGuessQuestions(savedGuess.length?savedGuess:DEFAULT_GUESS_QUESTIONS);}
      setChairPlayers(readStoredArray('m92_chairs_players', DEFAULT_CHAIR_PLAYERS));
      setDraft({q:'',answer:'',points:10}); setGuessDraft({q:'',a:'',h:''}); setAnswerDrafts({}); setPointDrafts({}); setNewChairPlayer('');
      const saved=JSON.parse(localStorage.getItem('m92_game_themes') || '{}');
      const designs=JSON.parse(localStorage.getItem('m92_game_designs') || '{}');
      setThemeColor(saved[selected] || '#8dffcf');
      setDesignStyle(designs[selected] || 'signature');
    } catch {}
  }, [selected]);
  const addRouletteItem = () => { const value=newRouletteItem.trim(); if(!value) return; const next=[...rouletteItems,value]; setRouletteItems(next); setNewRouletteItem(''); try { localStorage.setItem('m92_roulette_items',JSON.stringify(next)); } catch {} };
  const removeRouletteItem = (index) => { const next=rouletteItems.filter((_,i)=>i!==index); setRouletteItems(next); try { localStorage.setItem('m92_roulette_items',JSON.stringify(next)); } catch {} };
  const currentContent = content[selected] || { description: current.description, rules: DEFAULT_RULES[selected] || 'أضف قوانين اللعبة من لوحة التحكم.' };
  const saveContent = (field, value) => { const next={...content,[selected]:{...currentContent,[field]:value}}; setContent(next); try { localStorage.setItem('m92_game_content', JSON.stringify(next)); } catch {} };
  const uploadCover = (file) => {
    if(!file) return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)) return;
    const reader=new FileReader();
    reader.onload=()=>{
      const image=new Image();
      image.onload=()=>{
        const max=1500, scale=Math.min(1,max/Math.max(image.width,image.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.width*scale)); canvas.height=Math.max(1,Math.round(image.height*scale));
        const ctx=canvas.getContext('2d'); ctx.fillStyle='#080d0b'; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        saveCover(canvas.toDataURL('image/webp',.82));
      };
      image.onerror=()=>alert('تعذر قراءة الصورة. جرّب PNG أو JPG أو WebP.');
      image.src=reader.result;
    };
    reader.readAsDataURL(file);
  };
  const addQuestion = () => { if(!draft.q.trim() || !draft.answer.trim()) return; saveQuestions([...questions,{q:draft.q.trim(),answers:[[draft.answer.trim(),Number(draft.points)||0]]}]); setDraft({q:'',answer:'',points:10}); };
  const addGuessQuestion = () => {
    if(!guessDraft.q.trim() || !guessDraft.a.trim()) return;
    saveGuessQuestions([...guessQuestions,{q:guessDraft.q.trim(),a:guessDraft.a.trim(),h:guessDraft.h.trim()}]);
    setGuessDraft({q:'',a:'',h:''});
  };
  const addAnswer = (qi) => { const answer=(answerDrafts[qi]||'').trim(); if(!answer) return; const points=Number(pointDrafts[qi] ?? 10)||0; const next=questions.map((q,i)=>i===qi?{...q,answers:[...(q.answers||[]),[answer,points]]}:q); saveQuestions(next); setAnswerDrafts(v=>({...v,[qi]:''})); setPointDrafts(v=>({...v,[qi]:10})); };
  const deleteQuestion = (qi) => { if(questions.length<=1){ window.alert('يجب الاحتفاظ بسؤال واحد على الأقل.'); return; } saveQuestions(questions.filter((_,i)=>i!==qi)); };
  const hasContentManager=['roulette','chairs','guess','feud'].includes(selected);
  const contentStepTitle={roulette:'تجهيز خيارات العجلة',chairs:'إعداد قائمة اللاعبين',guess:'تجهيز بنك الأسئلة',feud:'تجهيز أسئلة وإجابات الفرق'}[selected] || 'محتوى الجولة';
  const contentStepMeta=selected==='roulette'?`${rouletteItems.length} خيار محفوظ`:selected==='chairs'?`${chairPlayers.length} لاعب في القائمة`:selected==='guess'?`${guessQuestions.length} سؤال محفوظ`:selected==='feud'?`${questions.length} سؤال محفوظ`:'المحتوى المدمج جاهز للاستخدام';
  return <main className="control-page">
    <div className="control-top">
      <button className="back-link" onClick={onBack}><ArrowRight size={16}/> العودة</button>
      <div><span className="eyebrow"><SlidersHorizontal size={14}/> M92 PLAY CONTROL</span><h1>لوحة تحكم المشرف</h1><p>هذه اللوحة مخصصة للمشرفين: إعداد اللعبة، الأسئلة، النقاط، عدد اللاعبين، الألوان، الصور، والصوت قبل وأثناء البث.</p></div>
      <div className="control-live"><i></i> ADMIN CONTROL</div>
    </div>
    <div className="control-layout">
      <aside className="control-sidebar">
        <div className="control-side-title">الألعاب</div>
        {games.map(g=>{const GIcon=g.icon; return <button key={g.id} className={selected===g.id?'control-game active':'control-game'} onClick={()=>{setSelected(g.id);setTab('overview')}}><span className={`control-game-icon ${g.color}`}><GIcon size={17}/></span><span>{g.title}</span><small>{g.players}</small></button>})}
        <div className="control-side-divider" />
        <button className={tab==='overview'?'control-nav active':'control-nav'} onClick={()=>setTab('overview')}><Monitor size={16}/> التشغيل</button>
        {['guess','feud','roulette','chairs'].includes(selected) && <button className={tab==='questions'?'control-nav active':'control-nav'} onClick={()=>setTab('questions')}><CircleHelp size={16}/> {selected==='roulette'?'خيارات العجلة':selected==='chairs'?'قائمة اللاعبين':selected==='guess'?'بنك الأسئلة':'أسئلة وإجابات الفرق'}</button>}
        <button className={tab==='settings'?'control-nav active':'control-nav'} onClick={()=>setTab('settings')}><Settings2 size={16}/> إعدادات {current.title}</button>
        <button className={tab==='appearance'?'control-nav active':'control-nav'} onClick={()=>setTab('appearance')}><PaletteIcon size={16}/> ثيم اللعبة</button>
      </aside>
      <section className="control-main">
        <div className="control-game-header"><div><span className="eyebrow">إعداد اللعبة المحددة</span><h2>{current.title}</h2><p>{currentContent.description}</p></div><span className="control-game-status"><Check size={14}/> إعدادات مستقلة لهذه اللعبة</span></div>
        {tab==='questions' && selected==='roulette' ? <div className="question-manager">
          <div className="manager-heading"><div><h3>خيارات عجلة الروليت</h3><p>أضف أسماء المشاركين أو الخيارات التي ستظهر على العجلة.</p></div><span className="simulation-pill">{rouletteItems.length} خيار</span></div>
          <div className="question-compose roulette-compose"><input value={newRouletteItem} onChange={e=>setNewRouletteItem(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addRouletteItem()} placeholder="اسم أو خيار جديد" aria-label="خيار جديد"/><button className="primary-btn" onClick={addRouletteItem} disabled={!newRouletteItem.trim()}><Plus size={15}/> إضافة خيار</button></div>
          <div className="roulette-option-list">{rouletteItems.map((item,i)=><div className="roulette-option-row" key={`${item}-${i}`}><span>{String(i+1).padStart(2,'0')}</span><b>{item}</b><button className="icon-btn" aria-label={`حذف ${item}`} onClick={()=>removeRouletteItem(i)}><Trash2 size={14}/></button></div>)}</div>
          {!rouletteItems.length&&<div className="empty-state compact-empty">أضف خيارين على الأقل قبل فتح العجلة.</div>}
        </div> : tab==='questions' && selected==='chairs' ? <div className="question-manager chair-roster-manager">
          <div className="manager-heading"><div><h3>قائمة المشاركين المبدئية</h3><p>تُحمّل هذه الأسماء مباشرة في ساحة الكراسي، ويمكن للمشاهدين الانضمام أيضًا.</p></div><span className="simulation-pill">{chairPlayers.length} / {Math.max(3,Math.min(30,Number(gameConfig.players)||12))} لاعب</span></div>
          <div className="question-compose roulette-compose"><input value={newChairPlayer} onChange={e=>setNewChairPlayer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addChairPlayer()} placeholder="اسم المشارك" aria-label="اسم المشارك"/><button className="primary-btn" onClick={addChairPlayer} disabled={!newChairPlayer.trim()}><Plus size={15}/> إضافة مشارك</button></div>
          <div className="roulette-option-list">{chairPlayers.map((name,i)=><div className="roulette-option-row" key={`${name}-${i}`}><span>{String(i+1).padStart(2,'0')}</span><b>{name}</b><button className="icon-btn" aria-label={`حذف ${name}`} onClick={()=>saveChairPlayers(chairPlayers.filter((_,j)=>j!==i))}><Trash2 size={14}/></button></div>)}</div>
          {chairPlayers.length>Math.max(3,Math.min(30,Number(gameConfig.players)||12))&&<p className="roster-warning">القائمة أطول من الحد المحدد؛ ستستخدم الجولة أول {Math.max(3,Math.min(30,Number(gameConfig.players)||12))} أسماء فقط. احذف الزائد أو ارفع الحد من إعدادات الكراسي.</p>}
          <p className="gm-hint">تحتاج اللعبة إلى 3 لاعبين على الأقل. الحد الأعلى قابل للتعديل من إعدادات الكراسي.</p>
        </div> : tab==='questions' && selected==='guess' ? <div className="question-manager">
          <div className="manager-heading"><div><h3>بنك أسئلة خمنها</h3><p>هذه الأسئلة هي نفسها التي ستظهر في اللعبة. افصل الإجابات البديلة بعلامة |.</p></div><span className="simulation-pill">{guessQuestions.length} أسئلة</span></div>
          <div className="question-compose guess-compose"><input value={guessDraft.q} onChange={e=>setGuessDraft(v=>({...v,q:e.target.value}))} placeholder="نص السؤال" aria-label="نص السؤال"/><input value={guessDraft.a} onChange={e=>setGuessDraft(v=>({...v,a:e.target.value}))} placeholder="الإجابة الصحيحة أو البدائل" aria-label="الإجابة الصحيحة"/><input value={guessDraft.h} onChange={e=>setGuessDraft(v=>({...v,h:e.target.value}))} placeholder="تلميح اختياري" aria-label="تلميح اختياري"/><button className="primary-btn" onClick={addGuessQuestion} disabled={!guessDraft.q.trim()||!guessDraft.a.trim()}><Plus size={15}/> إضافة السؤال</button></div>
          <div className="question-grid">{guessQuestions.map((item,qi)=><article className="question-card guess-question-card" key={`${item.q}-${qi}`}><div className="question-number">{String(qi+1).padStart(2,'0')}</div><h4>{item.q}</h4><p className="guess-answer-preview">الإجابة: <b>{item.a}</b></p>{item.h&&<small className="guess-hint-preview">التلميح: {item.h}</small>}<div className="question-actions"><button className="outline-btn" onClick={()=>{if(guessQuestions.length<=1){window.alert('يجب الاحتفاظ بسؤال واحد على الأقل.');return;}saveGuessQuestions(guessQuestions.filter((_,i)=>i!==qi));}}><Trash2 size={14}/> حذف السؤال</button></div></article>)}</div>
          {!guessQuestions.length&&<div className="empty-state compact-empty">أضف سؤالًا واحدًا على الأقل لتبدأ اللعبة.</div>}
        </div> : tab==='questions' && selected==='feud' ? <div className="question-manager">
          <div className="manager-heading"><div><h3>أسئلة وإجابات M92 فيود</h3><p>كل إجابة لها نقاطها، وتظهر تلقائيًا عند إرسالها مسبوقة بعلامة !.</p></div><span className="simulation-pill">{questions.length} أسئلة</span></div>
          <div className="question-compose"><input value={draft.q} onChange={e=>setDraft({...draft,q:e.target.value})} placeholder="نص السؤال"/><input value={draft.answer} onChange={e=>setDraft({...draft,answer:e.target.value})} placeholder="إجابة أولى اختيارية"/><input type="number" min="0" value={draft.points} onChange={e=>setDraft({...draft,points:e.target.value})} placeholder="النقاط"/><button className="primary-btn" onClick={addQuestion} disabled={!draft.q.trim()||!draft.answer.trim()}><Save size={15}/> حفظ السؤال</button></div>
          <div className="question-grid">{questions.map((item,qi)=><article className="question-card" key={qi}><div className="question-number">{String(qi+1).padStart(2,'0')}</div><h4>{item.q}</h4><div className="answer-list">{(item.answers||[]).map(([a,p],i)=><div className="answer-row" key={i}><span>{i+1}</span><b>{a}</b><strong>{p}</strong><button className="icon-btn" aria-label={`حذف ${a}`} onClick={()=>saveQuestions(questions.map((q,j)=>j===qi?{...q,answers:q.answers.filter((_,k)=>k!==i)}:q))}><Trash2 size={13}/></button></div>)}</div><div className="inline-answer"><input value={answerDrafts[qi]||''} onChange={e=>setAnswerDrafts(v=>({...v,[qi]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addAnswer(qi)} placeholder="إضافة إجابة لهذا السؤال"/><input aria-label="نقاط الإجابة" type="number" min="0" value={pointDrafts[qi]??10} onChange={e=>setPointDrafts(v=>({...v,[qi]:e.target.value}))}/><button className="outline-btn" onClick={()=>addAnswer(qi)} disabled={!(answerDrafts[qi]||'').trim()}><Plus size={14}/> إضافة</button></div><div className="question-actions"><button className="outline-btn" onClick={()=>deleteQuestion(qi)}><Trash2 size={14}/> حذف السؤال</button></div></article>)}</div>
        </div> : tab==='settings' ? <div className="settings-grid game-specific-settings">
          {selected==='roulette' && <>
            <div className="setting-card"><span className="setting-icon"><Dices size={18}/></span><div><b>طريقة الاختيار</b><small>اختيار عشوائي أو استبعاد الفائز بعد كل دورة.</small></div><CustomSelect value={gameConfig.mode||'random'} onChange={v=>updateGameOption('mode',v)} options={[{value:'random',label:'اختيار عشوائي'},{value:'eliminate',label:'استبعاد الفائز'}]}/></div>
            <div className="setting-card"><span className="setting-icon"><Clock3 size={18}/></span><div><b>مدة الدوران</b><small>وقت حركة العجلة قبل النتيجة.</small></div><CustomSelect value={gameConfig.spin||'5'} onChange={v=>updateGameOption('spin',v)} options={[{value:'3',label:'3 ثوانٍ'},{value:'5',label:'5 ثوانٍ'},{value:'8',label:'8 ثوانٍ'},{value:'12',label:'12 ثانية'}]}/></div>
            <div className="setting-card"><span className="setting-icon"><Users size={18}/></span><div><b>خيارات العجلة</b><small>عدد الخيارات التي أعددتها.</small></div><strong className="setting-value">{rouletteItems.length}</strong></div>
          </>}
          {selected==='chairs' && <>
            <div className="setting-card"><span className="setting-icon"><Volume2 size={18}/></span><div><b>موسيقى الكراسي</b><small>تشغيل الموسيقى أثناء دوران الجولة.</small></div><button type="button" aria-label="تبديل موسيقى الكراسي" aria-pressed={gameConfig.musicEnabled!==false} className={gameConfig.musicEnabled!==false?'toggle on':'toggle'} onClick={()=>updateGameOption('musicEnabled',gameConfig.musicEnabled===false)}><i/></button></div>
            <div className="setting-card"><span className="setting-icon"><Clock3 size={18}/></span><div><b>مدة الموسيقى</b><small>الوقت قبل توقف الموسيقى.</small></div><CustomSelect value={gameConfig.musicDuration||'5'} onChange={v=>updateGameOption('musicDuration',v)} options={[{value:'3',label:'3 ثوانٍ'},{value:'5',label:'5 ثوانٍ'},{value:'8',label:'8 ثوانٍ'},{value:'10',label:'10 ثوانٍ'}]}/></div>
            <div className="setting-card"><span className="setting-icon"><Users size={18}/></span><div><b>الحد الأعلى للاعبين</b><small>من 3 إلى 30 لاعبًا في الجولة.</small></div><input className="setting-number" type="number" min="3" max="30" value={gameConfig.players||'12'} onChange={e=>updateGameOption('players',String(Math.max(3,Math.min(30,Number(e.target.value)||3))))}/></div>
          </>}
          {selected==='typing' && <>
            <div className="setting-card"><span className="setting-icon"><Clock3 size={18}/></span><div><b>وقت التحدي</b><small>مدة استقبال الإجابات في كل جولة.</small></div><CustomSelect value={gameConfig.duration||'30'} onChange={v=>updateGameOption('duration',v)} options={[{value:'15',label:'15 ثانية'},{value:'30',label:'30 ثانية'},{value:'60',label:'60 ثانية'}]}/></div>
            <div className="setting-card"><span className="setting-icon"><Keyboard size={18}/></span><div><b>لغة التحدي</b><small>مصدر الكلمات والأرقام.</small></div><CustomSelect value={gameConfig.language||'both'} onChange={v=>updateGameOption('language',v)} options={[{value:'both',label:'العربية والإنجليزية'},{value:'ar',label:'العربية'},{value:'en',label:'الإنجليزية'}]}/></div>
            <div className="setting-card"><span className="setting-icon"><Trophy size={18}/></span><div><b>عدد الجولات</b><small>طول المسابقة قبل إعلان الفائز.</small></div><CustomSelect value={gameConfig.rounds||'5'} onChange={v=>updateGameOption('rounds',v)} options={[{value:'3',label:'3 جولات'},{value:'5',label:'5 جولات'},{value:'10',label:'10 جولات'}]}/></div>
          </>}
          {selected==='guess' && <div className="setting-card"><span className="setting-icon"><Trophy size={18}/></span><div><b>نقاط الإجابة الصحيحة</b><small>تُضاف إلى رصيد أول من يجيب.</small></div><input className="setting-number" type="number" min="0" max="100" value={gameConfig.points||'1'} onChange={e=>updateGameOption('points',String(Math.max(0,Math.min(100,Number(e.target.value)||0))))}/></div>}
          {selected==='capitals' && <div className="setting-card"><span className="setting-icon"><Trophy size={18}/></span><div><b>نقاط الإجابة الصحيحة</b><small>قيمة الفوز بكل دولة.</small></div><input className="setting-number" type="number" min="0" max="100" value={gameConfig.points||'1'} onChange={e=>updateGameOption('points',String(Math.max(0,Math.min(100,Number(e.target.value)||0))))}/></div>}
          {selected==='words' && <div className="setting-card"><span className="setting-icon"><Trophy size={18}/></span><div><b>مضاعف النقاط</b><small>يضاعف قيمة كل كلمة صحيحة.</small></div><CustomSelect value={gameConfig.multiplier||'1'} onChange={v=>updateGameOption('multiplier',v)} options={[{value:'1',label:'عادي ×1'},{value:'2',label:'مضاعف ×2'}]}/></div>}
          {selected==='drawguess' && <>
            <div className="setting-card"><span className="setting-icon"><Clock3 size={18}/></span><div><b>مدة الرسم</b><small>الوقت المتاح لتخمين الكلمة.</small></div><CustomSelect value={gameConfig.duration||'90'} onChange={v=>updateGameOption('duration',v)} options={[{value:'60',label:'60 ثانية'},{value:'90',label:'90 ثانية'},{value:'120',label:'دقيقتان'}]}/></div>
            <div className="setting-card"><span className="setting-icon"><Keyboard size={18}/></span><div><b>لغة الكلمات</b><small>لغة الكلمة السرية.</small></div><CustomSelect value={gameConfig.language||'ar'} onChange={v=>updateGameOption('language',v)} options={[{value:'ar',label:'العربية'},{value:'en',label:'الإنجليزية'},{value:'mix',label:'مختلطة'}]}/></div>
            <div className="setting-card"><span className="setting-icon"><Sparkles size={18}/></span><div><b>التلميحات التلقائية</b><small>كشف بعض الحروف مع مرور الوقت.</small></div><button type="button" aria-label="تبديل التلميحات" aria-pressed={gameConfig.hints!==false} className={gameConfig.hints!==false?'toggle on':'toggle'} onClick={()=>updateGameOption('hints',gameConfig.hints===false)}><i/></button></div>
            <div className="setting-card"><span className="setting-icon"><Users size={18}/></span><div><b>عدد الفائزين في الجولة</b><small>عدد من يمكنهم تخمين الكلمة قبل كشفها.</small></div><CustomSelect value={gameConfig.maxWinners||'5'} onChange={v=>updateGameOption('maxWinners',v)} options={[{value:'1',label:'فائز واحد'},{value:'3',label:'3 فائزين'},{value:'5',label:'5 فائزين'},{value:'10',label:'10 فائزين'}]}/></div>
          </>}
          {selected==='roulette-challenge' && <>
            <div className="setting-card"><span className="setting-icon"><Dices size={18}/></span><div><b>وضع البداية</b><small>تفتح اللعبة مباشرة على وضع التحديات.</small></div><strong className="setting-value">تحديات</strong></div>
            <div className="setting-card"><span className="setting-icon"><Clock3 size={18}/></span><div><b>مدة الدوران</b><small>وقت اختيار اللاعب.</small></div><CustomSelect value={gameConfig.spin||'5'} onChange={v=>updateGameOption('spin',v)} options={[{value:'3',label:'3 ثوانٍ'},{value:'5',label:'5 ثوانٍ'},{value:'8',label:'8 ثوانٍ'}]}/></div>
          </>}
          {selected==='decode' && <div className="setting-card"><span className="setting-icon"><Clock3 size={18}/></span><div><b>وقت فك الشيفرة</b><small>مدة كل كلمة قبل كشف الإجابة.</small></div><CustomSelect value={gameConfig.duration||'20'} onChange={v=>updateGameOption('duration',v)} options={[{value:'15',label:'15 ثانية'},{value:'20',label:'20 ثانية'},{value:'30',label:'30 ثانية'},{value:'45',label:'45 ثانية'}]}/></div>}
          {selected==='bomb' && <div className="setting-card"><span className="setting-icon"><Clock3 size={18}/></span><div><b>وقت القنبلة</b><small>العد التنازلي قبل الانفجار.</small></div><CustomSelect value={gameConfig.duration||'20'} onChange={v=>updateGameOption('duration',v)} options={[{value:'10',label:'10 ثوانٍ'},{value:'20',label:'20 ثانية'},{value:'30',label:'30 ثانية'},{value:'45',label:'45 ثانية'}]}/></div>}
          {selected==='protection' && <div className="setting-card"><span className="setting-icon"><ShieldIcon size={18}/><span></span></span><div><b>سرعة الهجوم</b><small>الفاصل بين الهجمات على المناطق.</small></div><CustomSelect value={gameConfig.attack||'2.4'} onChange={v=>updateGameOption('attack',v)} options={[{value:'1.6',label:'سريع'},{value:'2.4',label:'متوسط'},{value:'3.5',label:'هادئ'}]}/></div>}
          {selected==='fishing' && <div className="setting-card"><span className="setting-icon"><WavesIcon size={18}/><span></span></span><div><b>عدد الأسماك</b><small>عدد الخيارات في ساحة الصيد.</small></div><CustomSelect value={gameConfig.fish||'6'} onChange={v=>updateGameOption('fish',v)} options={[{value:'4',label:'4 أسماك'},{value:'6',label:'6 أسماك'},{value:'8',label:'8 أسماك'}]}/></div>}
          {selected==='m92-round' && <div className="setting-card"><span className="setting-icon"><Gamepad2 size={18}/></span><div><b>ترتيب المراحل</b><small>المراحل السبع مدمجة داخل جولة واحدة.</small></div><strong className="setting-value">7 مراحل</strong></div>}
          {selected==='feud' && <>
            <div className="setting-card"><span className="setting-icon"><Users size={18}/></span><div><b>اسم الفريق الأول</b><small>يظهر في لوحة النتائج.</small></div><input className="setting-number" type="text" maxLength="18" value={gameConfig.teamA||'M92'} onChange={e=>updateGameOption('teamA',e.target.value)}/></div>
            <div className="setting-card"><span className="setting-icon"><Users size={18}/></span><div><b>اسم الفريق الثاني</b><small>الفريق المنافس.</small></div><input className="setting-number" type="text" maxLength="18" value={gameConfig.teamB||'المنافسون'} onChange={e=>updateGameOption('teamB',e.target.value)}/></div>
            <div className="setting-card"><span className="setting-icon"><X size={18}/></span><div><b>عدد الأخطاء المسموحة</b><small>قبل انتقال الدور للفريق الآخر.</small></div><CustomSelect value={gameConfig.strikes||'3'} onChange={v=>updateGameOption('strikes',v)} options={[{value:'1',label:'خطأ واحد'},{value:'2',label:'خطآن'},{value:'3',label:'3 أخطاء'},{value:'4',label:'4 أخطاء'}]}/></div>
            <div className="setting-card"><span className="setting-icon"><Trophy size={18}/></span><div><b>مضاعفة نقاط الجولة</b><small>تفعيل جولة النقاط المضاعفة.</small></div><button type="button" aria-label="مضاعفة النقاط" aria-pressed={!!gameConfig.double} className={gameConfig.double?'toggle on':'toggle'} onClick={()=>updateGameOption('double',!gameConfig.double)}><i/></button></div>
          </>}
          <div className="settings-save-note"><Check size={15}/> الخيارات المعروضة تخص {current.title} فقط، وتُحفظ على هذا الجهاز.</div>
        </div> : tab==='appearance' ? <div className="appearance-panel theme-panel">
          <div className="theme-heading"><div><span className="eyebrow">GAME DESIGN</span><h3>هوية {current.title}</h3><p>اختر شكلًا خاصًا بهذه اللعبة وشاهد نموذجًا حقيقيًا لتوزيع عناصرها قبل فتح ساحة اللعب.</p></div><span className="simulation-pill">خاص بـ {current.title}</span></div>
          <div className={`theme-preview-card game-${selected} design-${designStyle}`} style={{'--preview-accent':themeColor}}>
            <div className="theme-preview-topline"><span>M92 PLAY · LIVE</span><span>معاينة قبل التطبيق</span></div>
            {cover[selected] && <div className="theme-upload-preview"><img src={cover[selected]} alt={`الصورة المرفوعة للعبة ${current.title}`}/><span>الصورة المرفوعة · عرض مستقل دون تراكب</span></div>}
            <div className="theme-preview-live"><ThemePreviewScene game={current} design={designStyle}/></div>
            <div className="theme-preview-caption"><div><strong>{current.title}</strong><small>{(designOptions[selected]||designOptions.roulette).find(x=>x[0]===designStyle)?.[1] || 'التصميم الأساسي'}</small></div><span className="theme-preview-accent" style={{background:themeColor}}/></div>
            <div className="theme-preview-meta"><span>لون الهوية</span><b>{themeColor.toUpperCase()}</b><i style={{background:themeColor}}/></div>
          </div>
          <div className="game-design-picker"><div className="manager-heading"><div><h3>نمط تصميم اللعبة</h3><p>يتغير توزيع المكونات والبطاقات وساحة اللعب، وليس اللون فقط.</p></div></div>
            <div className="design-options">{(designOptions[selected]||designOptions.roulette).map(([id,name,desc])=><button type="button" key={id} className={designStyle===id?'design-option active':'design-option'} onClick={()=>saveDesign(id)}><span className={`design-option-art ${selected} ${id}`}><i/><i/><i/></span><b>{name}</b><small>{desc}</small>{designStyle===id&&<Check size={14}/>}</button>)}</div>
          </div>
          <div className="theme-presets">{themePresets.map(p=><button type="button" key={p.id} className={themeColor===p.color?'theme-swatch active':'theme-swatch'} onClick={()=>saveTheme(p.color)}><i style={{background:p.color}}/><span>{p.name}</span>{themeColor===p.color&&<Check size={14}/>}</button>)}</div>
          <div className="appearance-fields"><label className="custom-color-label">لون الهوية<input type="color" value={themeColor} onChange={e=>saveTheme(e.target.value)}/></label><label className="upload-cover"><ImageIcon size={16}/> رفع صورة للعبة<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>uploadCover(e.target.files?.[0])}/></label>{cover[selected]&&<button className="outline-btn" onClick={()=>saveCover('')}><Trash2 size={14}/> إزالة الصورة</button>}</div>
        </div> : <div className="control-overview">
          <div className="setup-welcome"><div><span className="eyebrow">مسار المضيف · {current.category}</span><h3>جهّز {current.title} للبث</h3><p>أعد المحتوى، اضبط ما تحتاجه هذه اللعبة فقط، راجع شكلها، ثم افتح ساحة اللعب لبدء الجولة.</p></div><span className="setup-ready-pill"><Check size={14}/> إعداد محلي</span></div>
          <div className="setup-steps">
            {hasContentManager ? <button type="button" className="setup-step" onClick={()=>setTab('questions')}><span>01</span><div><b>{contentStepTitle}</b><small>{contentStepMeta}</small></div><ArrowLeft size={17}/></button> : <div className="setup-step setup-step-static"><span>01</span><div><b>محتوى الجولة</b><small>{contentStepMeta} — يتم اختياره داخل اللعبة.</small></div><Check size={17}/></div>}
            <button type="button" className="setup-step" onClick={()=>setTab('settings')}><span>02</span><div><b>ضبط إعدادات {current.title}</b><small>لا تظهر هنا إلا الخيارات المرتبطة بهذه اللعبة.</small></div><ArrowLeft size={17}/></button>
            <button type="button" className="setup-step" onClick={()=>setTab('appearance')}><span>03</span><div><b>معاينة تصميم اللعبة</b><small>اختر بنية الواجهة وهوية العرض قبل التطبيق.</small></div><ArrowLeft size={17}/></button>
            <button type="button" className="setup-step setup-step-launch" onClick={()=>onOpenGame(current)}><span>04</span><div><b>معاينة وفتح ساحة اللعب</b><small>افتح اللعبة وابدأ الجولة من أدواتها.</small></div><Play size={17}/></button>
          </div>
          <details className="control-copy-details"><summary>تعديل شرح اللعبة والقوانين (اختياري)</summary><div className="control-copy-editor">
            <div className="copy-editor-heading"><div><span className="eyebrow">GAME GUIDE</span><h3>نصوص {current.title}</h3><p>تظهر هذه النصوص في صفحة اللعبة.</p></div><Save size={18}/></div>
            <label>شرح اللعبة<textarea value={currentContent.description} onChange={e=>saveContent('description',e.target.value)} placeholder="اكتب شرحًا واضحًا للعبة..." /></label>
            <label>القوانين<textarea value={currentContent.rules} onChange={e=>saveContent('rules',e.target.value)} placeholder="اكتب قوانين اللعبة..." /></label>
          </div></details>
          <div className="setup-note"><Check size={16}/><span>تُحفظ إعدادات كل لعبة على هذا الجهاز بشكل مستقل.</span></div>
        </div>}
      </section>
    </div>
  </main>;
}

function CustomSelect({ value, onChange, options=[], ariaLabel='اختر خيارًا' }) {
  const [open,setOpen]=useState(false);
  const root=useRef(null);
  const trigger=useRef(null);
  const optionRefs=useRef([]);
  const listId=useId();
  const selectedIndex=Math.max(0,options.findIndex(o=>String(o.value)===String(value)));
  useEffect(()=>{
    if(!open) return;
    const close=e=>{ if(root.current && !root.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown',close);
    const focusFrame=requestAnimationFrame(()=>optionRefs.current[selectedIndex]?.focus());
    return ()=>{document.removeEventListener('pointerdown',close);cancelAnimationFrame(focusFrame);};
  },[open,selectedIndex]);
  const closeMenu=()=>{setOpen(false);trigger.current?.focus();};
  const handleMenuKeyDown=e=>{
    const index=optionRefs.current.indexOf(document.activeElement);
    if(e.key==='Escape'){e.preventDefault();closeMenu();return;}
    if(e.key==='Tab'){setOpen(false);return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End'){
      e.preventDefault();
      const next=e.key==='Home'?0:e.key==='End'?options.length-1:e.key==='ArrowDown'?Math.min(options.length-1,Math.max(0,index)+1):Math.max(0,index-1);
      optionRefs.current[next]?.focus();
    }
  };
  const selectedOption=options.find(o=>String(o.value)===String(value))||options[0];
  return <div className={`m92-select ${open?'open':''}`} ref={root}>
    <button ref={trigger} type="button" className="m92-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-controls={listId} aria-expanded={open} onClick={()=>setOpen(v=>!v)} onKeyDown={e=>{if(!open&&(e.key==='ArrowDown'||e.key==='Enter'||e.key===' ')){e.preventDefault();setOpen(true);}}}>
      <span>{selectedOption?.label ?? value}</span><ChevronDownIcon/>
    </button>
    {open&&<div id={listId} className="m92-select-menu" role="listbox" aria-label={ariaLabel} onKeyDown={handleMenuKeyDown}>{options.map((o,i)=><button ref={el=>optionRefs.current[i]=el} type="button" role="option" aria-selected={String(o.value)===String(value)} className={String(o.value)===String(value)?'m92-select-option selected':'m92-select-option'} key={o.value} onClick={()=>{onChange(o.value);closeMenu();}}>{o.label}{String(o.value)===String(value)&&<Check size={14}/>}</button>)}</div>}
  </div>;
}
function ChevronDownIcon(){ return <ChevronDown size={14} className="select-chevron"/>; }

function ThemePreviewScene({game,design}) {
  const id=game.id;
  if(id==='roulette-challenge') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-wheel"><i/><i/><i/><b>🎡</b></div><div className="preview-challenge-card">تحدي اللاعب المختار</div></div>;
  if(id==='decode') return <div className={`mini-game-preview preview-${id} preview-${design}`}><span className="preview-kicker">CODE BREAK</span><strong dir="ltr">م د ر س ة</strong><div className="preview-answer-line">00:14</div></div>;
  if(id==='bomb') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-bomb">💣<b>17</b></div><span>فك الرمز قبل الانفجار</span></div>;
  if(id==='protection') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-zones">{[1,2,3,4,5,6].map(n=><i key={n}>{n}</i>)}</div><span>احمِ المناطق</span></div>;
  if(id==='fishing') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-water">🐟　🐟　🐟</div><span>اصطد السمكة الصحيحة</span></div>;
  if(id==='m92-round') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-round-dots">{['🧠','🚩','🔤','🥤','⚽','🧭','⚡'].map((x,i)=><i key={i} className={i===2?'active':''}>{x}</i>)}</div><strong>المرحلة 03 · كلمات</strong></div>;
  if(id==='roulette') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-wheel"><i/><i/><i/><b>🎡</b></div><div className="preview-side-list"><span>01 · لاعب</span><span>02 · لاعب</span><span>03 · لاعب</span></div></div>;
  if(id==='chairs') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-chair-floor"><div className="preview-chair-ring">{Array.from({length:6},(_,i)=><i key={i} style={{'--seat-index':i}}><b/></i>)}</div><span>ساحة المنافسة</span></div><div className="preview-round-chip">الجولة 03</div></div>;
  if(id==='typing') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-race-timer">00:24</div><strong dir="ltr">A7K2</strong><div className="preview-race-lanes"><i/><i/><i/></div></div>;
  if(id==='guess') return <div className={`mini-game-preview preview-${id} preview-${design}`}><span className="preview-kicker">السؤال 02 / 08</span><strong>ما أكبر كوكب؟</strong><div className="preview-answer-line">••••••••</div><small>بانتظار إجابة الجمهور</small></div>;
  if(id==='drawguess') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-draw-toolbar"><i/><i/><i/><i/></div><div className="preview-drawing"><span/><i/><b/></div><div className="preview-word-mask">_ _ _ _ _</div></div>;
  if(id==='words') return <div className={`mini-game-preview preview-${id} preview-${design}`}><span className="preview-kicker">كوّن كلمة من الحروف</span><div className="preview-letter-row">{'مدرسة'.split('').map((x,i)=><b key={i}>{x}</b>)}</div><small>4 كلمات صحيحة · 28 نقطة</small></div>;
  if(id==='capitals') return <div className={`mini-game-preview preview-${id} preview-${design}`}><div className="preview-globe">🌐</div><span className="preview-kicker">ما عاصمة الدولة؟</span><strong>الجزائر · Algeria</strong><div className="preview-capital-answer">الرياض</div></div>;
  return <div className={`mini-game-preview preview-feud preview-${design}`}><div className="preview-feud-score"><b>M92 <strong>120</strong></b><i>VS</i><b>TEAM B <strong>85</strong></b></div><div className="preview-feud-answers"><span>01 <b>كرة القدم</b><strong>46</strong></span><span>02 <b>كرة السلة</b><strong>21</strong></span><span>03 <b>التنس</b><strong>14</strong></span></div></div>;
}

function SkipForwardIcon(){ return <ArrowLeft size={15}/>; }


class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { error:null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error, info){ console.error('M92 PLAY render error', error, info); }
  render(){
    if(this.state.error) return <main className="error-screen" dir="rtl">
      <div className="error-card">
        <span className="eyebrow">M92 PLAY · ERROR</span>
        <h1>حدث خطأ في هذه الصفحة</h1>
        <p>تعذر عرض هذه الشاشة. يمكنك العودة للرئيسية أو إعادة المحاولة.</p>
        <div className="error-detail">{String(this.state.error?.message || this.state.error)}</div>
        <div className="gm-row"><button className="primary-btn" onClick={()=>this.setState({error:null})}>إعادة المحاولة</button><button className="outline-btn" onClick={()=>location.reload()}>إعادة تحميل الصفحة</button></div>
      </div>
    </main>;
    return this.props.children;
  }
}

function GameDetail({ game, onBack }) {
  const Icon = game.icon;
  const saved = getSavedContent()[game.id] || {};
  const gameDescription = saved.description || game.description;
  const gameRules = saved.rules || DEFAULT_RULES[game.id] || 'لم يضف المشرفون قوانين لهذه اللعبة بعد.';
  const reg = useRef(null);
  const Real = RealGames[game.id];
  useEffect(() => { const previous = window.M92Play; window.M92Play = { dispatch: (user, text) => { const result=reg.current?.handle?.(user, text); window.dispatchEvent(new CustomEvent('m92:chat-result',{detail:{user,text,result:result??null}})); return result; } }; return () => { window.M92Play = previous || { dispatch: () => ({ok:false,reason:'no-active-game'}) }; }; }, []);
  let savedTheme = '#8dffcf', savedDesign='signature', savedCover='';
  try {
    savedTheme = JSON.parse(localStorage.getItem('m92_game_themes') || '{}')[game.id] || savedTheme;
    savedDesign = JSON.parse(localStorage.getItem('m92_game_designs') || '{}')[game.id] || 'signature';
    savedCover = JSON.parse(localStorage.getItem('m92_game_covers') || '{}')[game.id] || '';
  } catch {}
  return <main className={`game-detail ${game.color} game-${game.id} design-${savedDesign}`} style={{'--game-accent':savedTheme}}>
    <button className="back-link" onClick={onBack}><ArrowRightIcon/> العودة إلى الألعاب</button>
    <div className="detail-hero">
      <div className="detail-copy"><span className="eyebrow"><span className="live-dot"></span> تجربة تفاعلية</span><h1>{game.title}</h1><p>{gameDescription}</p>
        <div className="detail-pills"><span><Users size={15}/>{game.players} لاعب</span><span><Clock3 size={15}/>{game.time}</span><span><Sparkles size={15}/>لعبة فعلية</span></div>
      </div>
      <div className={`detail-art ${savedCover?'has-cover':''}`}>{savedCover&&<img className="detail-cover-image" src={savedCover} alt=""/>}<div className="detail-art-ring"></div><div className="detail-icon"><Icon size={82} strokeWidth={1.2}/></div><span className="detail-spark s1">✦</span><span className="detail-spark s2">✧</span></div>
    </div>
    <div className="game-info-panels"><section className="info-panel"><span className="eyebrow">GAME GUIDE</span><h3>شرح اللعبة</h3><p>{gameDescription}</p></section><section className="info-panel rules-panel"><span className="eyebrow">RULES</span><h3>القوانين</h3><p>{gameRules}</p></section></div>
    <div className="play-layout">{Real ? <Real reg={reg}/> : <div className="missing-game-panel"><span className="eyebrow">GAME MODULE</span><h3>هذه اللعبة لا تحتوي على وحدة تشغيل بعد</h3><p>تم العثور على بطاقة اللعبة لكن لا يوجد مكوّن تشغيل مرتبط بها.</p></div>}</div>
    <ChatSlot/>
  </main>;
}
function ArrowRightIcon(){ return <ArrowRight size={16}/>; }

function App() {
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [controlOpen, setControlOpen] = useState(false);
  const filtered = useMemo(()=>games.filter(g=>(activeCategory==='الكل'||g.category===activeCategory) && `${g.title} ${g.subtitle} ${g.category}`.toLowerCase().includes(search.toLowerCase())),[activeCategory,search]);
  const openGame = g => { setSelectedGame(g); window.scrollTo({top:0,behavior:'smooth'}); };
  const goTo = id => { setSelectedGame(null); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 60); };
  const goHome = () => { setSelectedGame(null); setControlOpen(false); window.scrollTo({top:0,behavior:'smooth'}); };
  return <div className="app-shell" data-theme={selectedGame ? selectedGame.color : 'home'}>
    <div className="ambient ambient-one"></div><div className="ambient ambient-two"></div>
    <Header onHome={goHome} onGoto={goTo} onControl={()=>{setSelectedGame(null);setControlOpen(true);window.scrollTo({top:0,behavior:'smooth'});}}/>
    {controlOpen ? <ControlPanel onBack={()=>setControlOpen(false)} onOpenGame={g=>{setControlOpen(false);setSelectedGame(g);window.scrollTo({top:0,behavior:'smooth'});}}/> : selectedGame ? <GameDetail game={selectedGame} onBack={goHome}/> : <main>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-kicker"><span className="kicker-mark"><Sparkles size={14}/></span> استوديو البث التفاعلي · M92 <span className="kicker-line"></span></div>
          <h1>أدر البث.<br/> <span>والجمهور يصنع اللعب.</span></h1>
          <p className="hero-description">من لوحة واحدة اختر اللعبة، جهّز الجولة، وراقب تفاعل المشاهدين عبر أوامر الشات. واجهة الموقع جاهزة للربط مع بوت الشات الخارجي.</p>
          <div className="hero-actions"><a className="primary-btn" href="#games">افتح مكتبة الألعاب <ArrowLeft size={17}/></a><a className="secondary-btn" href="#studio">عن وضع الاستوديو <Monitor size={16}/></a></div>
          <div className="hero-stats"><div><strong>{games.length}</strong><span>ألعاب في المكتبة</span></div><div className="stat-divider"></div><div><strong>CHAT</strong><span>مساحة الشات</span></div><div className="stat-divider"></div><div><strong className="stat-mint">AR · EN</strong><span>كتابة بالعربي والإنجليزي</span></div></div>
        </div>
        <div className="hero-visual" aria-label="رسم تجريدي لمنصة الألعاب">
          <div className="hero-grid"></div><div className="hero-halo"></div><div className="hero-orbit orbit-a"></div><div className="hero-orbit orbit-b"></div>
          <div className="hero-core"><img src="/m92-logo.png" alt="شعار M92"/><span>M92 PLAY</span><small>PLAY TOGETHER</small></div>
          <div className="float-card float-card-top"><span className="float-icon mint-bg"><Trophy size={17}/></span><div><strong>لحظة الفوز!</strong><small>المجتمع في قلب اللعبة</small></div><span className="tiny-signal"></span></div>
          <div className="float-card float-card-bottom"><span className="float-icon violet-bg"><Users size={17}/></span><div><strong>الكل يشارك</strong><small>تجربة تجمع الجميع</small></div><div className="mini-avatars"><i>م</i><i>س</i><i>+</i></div></div>
          <div className="visual-caption"><span></span> YOUR COMMUNITY. YOUR GAME.</div>
        </div>
        <div className="hero-bottom-line"><span>01 / PLAY</span><span>مصممة للحظات التي تستحق المشاركة</span><span>SCROLL TO EXPLORE ↓</span></div>
      </section>
      <section className="studio-strip" id="studio">
        <div className="studio-intro"><span className="eyebrow"><Radio size={14}/> HOST STUDIO</span><h2>مساحة تحكم المذيع</h2><p>المذيع يدير اللعبة من الموقع، والمشاهدون يشاركون من خلال الشات — والموقع مخصص لعرض وإدارة الجولة.</p></div>
        <div className="studio-feature"><span><Settings2 size={18}/></span><b>تحكم بالجولة</b><small>إعدادات، بدء، إيقاف، ونتائج</small></div>
        <div className="studio-feature"><span><MessageCircle size={18}/></span><b>تفاعل الشات</b><small>مساحة شات جاهزة للربط مع البوت</small></div>
        <div className="studio-feature"><span><Lock size={18}/></span><b>خصوصية المضيف</b><small>الكلمات السرية في نافذة خاصة لا تظهر في البث</small></div>
      </section>
      <section className="games-section" id="games">
        <div className="section-heading"><div><span className="eyebrow"><span className="live-dot"></span> مكتبة الألعاب</span><h2>مكتبة الألعاب <span>التفاعلية.</span></h2><p>اختر لعبة لفتح لوحة إعدادها. الشات هنا مساحة عرض فقط، والربط يتم عبر البوت الخارجي.</p></div><div className="library-count"><strong>{String(filtered.length).padStart(2,'0')}</strong><span>لعبة معروضة</span></div></div>
        <div className="library-tools"><div className="category-tabs">{categories.map(c=><button key={c} className={activeCategory===c?'category-tab selected':'category-tab'} onClick={()=>setActiveCategory(c)}>{c}</button>)}</div><label className="search-box"><Search size={17}/><input placeholder="ابحث عن لعبة..." value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')} aria-label="مسح البحث"><X size={14}/></button>}</label></div>
        {filtered.length ? <div className="games-grid">{filtered.map((g,i)=><GameCard key={g.id} game={g} index={games.indexOf(g)} onOpen={openGame}/>)}</div> : <div className="empty-state"><Search size={28}/><strong>ما لقينا لعبة بهذا الاسم</strong><span>جرّب كلمة ثانية أو غيّر التصنيف.</span><button className="text-btn" onClick={()=>{setSearch('');setActiveCategory('الكل')}}>عرض جميع الألعاب</button></div>}
      </section>
      <section className="community-banner" id="about"><div className="banner-icon"><Gamepad2 size={29}/></div><div><span className="eyebrow">هذه مجرد البداية</span><h2>اللعبة تبدأ بك، <span>وتكتمل بالجميع.</span></h2><p>مساحة واحدة للتحديات والضحك واللحظات التي تصنعها مع مجتمعك.</p></div><a className="primary-btn" href="#games">استكشف الألعاب <ArrowLeft size={16}/></a><div className="banner-decoration">M92</div></section>
    </main>}
    <footer className="footer"><Logo small/><span>© 2026 M92 PLAY · صُنعت للمجتمع</span><span className="footer-status"><i></i> Frontend · Chat Integration Ready</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<ErrorBoundary>{location.hash === '#secret-word' ? <SecretWindow/> : <App/>}</ErrorBoundary>);