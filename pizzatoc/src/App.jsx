import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Trophy, Zap, TrendingDown, ChevronRight, BarChart2, X } from 'lucide-react';

const GAME_DURATION    = 30;
const OUTAGE_START     = 10;
const PROD_TIME        = GAME_DURATION - OUTAGE_START;
const PIZZA_VAL        = 100;
const PENALTY_RATE     = 50;
const OVEN_MS          = 3000;
const TAPS_PER_PIZZA   = 5;
const WORLD_RECORD_CPS = 10;

const fmt = (n) => (n < 0 ? `-$${Math.abs(n)}` : `$${n}`);
const pct = (v, max) => Math.round(Math.min(v / max, 1) * 100);
const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

const calcOee = (r) => {
  const chefOee   = pct(r.maxCps, WORLD_RECORD_CPS);
  const ovenOee   = pct(r.baked * (OVEN_MS / 1000), PROD_TIME);
  const maxByChef = Math.floor((r.totalTaps || 0) / TAPS_PER_PIZZA);
  const maxByOven = Math.floor(PROD_TIME / (OVEN_MS / 1000));
  const lost      = maxByOven - r.baked;
  return { chefOee, ovenOee, maxByChef, maxByOven, lost };
};

// ─── AUDIO ───────────────────────────────────────────────────────────────────
const createAudio = () => {
  let ctx = null;
  const ac = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; };
  const play = (freq, type = 'sine', vol = 0.1, dur = 0.1, t0 = 0) => {
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type; o.frequency.value = freq;
      const s = c.currentTime + t0;
      g.gain.setValueAtTime(vol, s);
      g.gain.exponentialRampToValueAtTime(0.001, s + dur);
      o.start(s); o.stop(s + dur);
    } catch {}
  };
  return {
    tap:    () => play(900, 'sine', 0.06, 0.05),
    pizza:  () => { [523, 659, 784].forEach((f, i) => play(f, 'sine', 0.1, 0.15, i * 0.07)); },
    baked:  () => { [440, 554, 659, 880].forEach((f, i) => play(f, 'sine', 0.08, 0.12, i * 0.055)); },
    whoosh: () => { play(180, 'sine', 0.07, 0.12); play(520, 'sine', 0.04, 0.1, 0.04); },
    ching:  () => { play(1046, 'triangle', 0.15, 0.35); play(1568, 'triangle', 0.12, 0.45, 0.06); play(2093, 'triangle', 0.08, 0.55, 0.12); },
    plop:   () => play(280, 'sine', 0.08, 0.08),
    // D — Zamknięta kasa: bas + metaliczny pisk
    cash:   () => {
      play(120, 'sine', 0.22, 0.2);
      play(1400, 'triangle', 0.08, 0.1, 0.05);
      play(900, 'triangle', 0.05, 0.12, 0.12);
    },
    // Dźwięk awarii
    outage: () => {
      try {
        const c = ac(), o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(380, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(55, c.currentTime + 0.9);
        g.gain.setValueAtTime(0.28, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
        o.start(); o.stop(c.currentTime + 0.9);
      } catch {}
      setTimeout(() => play(70, 'square', 0.18, 0.5), 220);
    },
  };
};
const audio = createAudio();

// ─── OVEN SVG ─────────────────────────────────────────────────────────────────
const OvenSVG = ({ active, progress, pizzaPhase }) => {
  const archColor    = active ? '#f97316' : '#334155';
  const insideFill   = active ? '#0a0500' : '#050d1a';
  const insideStroke = active ? '#f97316' : '#334155';
  const floorFill    = active ? '#1a0800' : '#0a1120';
  const floorStroke  = active ? '#c2410c' : '#334155';
  const lblColor     = active ? '#f97316' : '#475569';
  const progWidth    = progress * 74;
  const pizzaEmoji   = pizzaPhase === 'exit' ? '🍕' : '🫓';
  const pizzaX       = pizzaPhase === 'enter' ? 22 : pizzaPhase === 'exit' ? 88 : 55;
  const pizzaOpacity = pizzaPhase === 'hidden' ? 0 : 1;
  let pizzaStyle     = { transition: 'opacity 0.3s' };
  if (pizzaPhase === 'enter') pizzaStyle = { animation: 'ovenEnter 0.4s ease-out forwards' };
  if (pizzaPhase === 'exit')  pizzaStyle = { animation: 'ovenExit 0.5s ease-in forwards' };

  return (
    <svg viewBox="0 0 110 122" width="110" height="122" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="og" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#020617" stopOpacity="0"/>
        </radialGradient>
        <style>{`
          @keyframes ovenEnter { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes ovenExit  { from { transform: translateX(0); opacity: 1; } to { transform: translateX(30px); opacity: 0; } }
        `}</style>
      </defs>
      {active && <ellipse cx="55" cy="68" rx="46" ry="34" fill="url(#og)"/>}
      <path d="M 8 88 Q 8 12 55 12 Q 102 12 102 88" fill="none" stroke={archColor} strokeWidth="13" strokeLinecap="round" strokeDasharray="16 3"/>
      <path d="M 18 88 Q 18 26 55 26 Q 92 26 92 88" fill={insideFill} stroke={insideStroke} strokeWidth="2"/>
      <rect x="18" y="81" width="74" height="9" rx="3" fill={floorFill} stroke={floorStroke} strokeWidth="1.5"/>
      <text x={pizzaX} y="60" textAnchor="middle" dominantBaseline="central" fontSize="26" opacity={pizzaOpacity} style={pizzaStyle}>{pizzaEmoji}</text>
      {!active && <text x="55" y="56" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#334155" fontWeight="600">PUSTY</text>}
      <text x="55" y="101" textAnchor="middle" fontFamily="sans-serif" fontSize="7.5" fontWeight="700" fill={lblColor} letterSpacing="0.5">WĄSKIE GARDŁO</text>
      <rect x="18" y="109" width="74" height="4" rx="2" fill="#1e293b"/>
      {active && <rect x="18" y="109" width={progWidth} height="4" rx="2" fill="#f97316"/>}
    </svg>
  );
};

// ─── TRAFFIC LIGHT MINI ───────────────────────────────────────────────────────
const TrafficLightMini = ({ ovenActive }) => (
  <div style={{ display: 'flex', gap: 5, marginBottom: 4, justifyContent: 'center' }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: !ovenActive ? '#22c55e' : '#1e293b', boxShadow: !ovenActive ? '0 0 8px rgba(74,222,128,0.9)' : 'none', transition: 'all 0.3s' }}/>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: ovenActive ? '#ef4444' : '#1e293b', boxShadow: ovenActive ? '0 0 8px rgba(239,68,68,0.9)' : 'none', transition: 'all 0.3s' }}/>
  </div>
);

// ─── WIP PIZZA ITEM (awaria — eksplozja) ─────────────────────────────────────
const WipPizzaItem = ({ index, onExplode }) => {
  const [phase, setPhase]     = useState('alive');
  const [showNum, setShowNum] = useState(false);
  const triggered             = useRef(false);

  // Expose trigger function via callback
  useEffect(() => {
    if (onExplode) onExplode(index, () => {
      if (triggered.current) return;
      triggered.current = true;
      setPhase('dying');
      setShowNum(true);
      setTimeout(() => { setPhase('gone'); setShowNum(false); }, 800);
    });
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 32, height: 32 }}>
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm
        ${phase === 'alive' ? 'bg-orange-900 border-orange-700' : 'bg-red-950 border-red-800'}`}
        style={phase === 'dying' ? { animation: 'wipDie 0.8s ease-out forwards' } : {}}>
        🫓
      </div>
      {showNum && (
        <div className="absolute text-red-400 font-black text-xs pointer-events-none select-none"
          style={{ top: 0, left: '50%', transform: 'translateX(-50%)', animation: 'floatPenalty 1s ease-out forwards', whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(239,68,68,0.8)', zIndex: 10 }}>
          -$30
        </div>
      )}
    </div>
  );
};

// ─── OUTAGE SCREEN ────────────────────────────────────────────────────────────
const OutageScreen = ({ wip, onUnlock, timeLeft, onBalanceUpdate }) => {
  const [locked, setLocked]       = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [flash, setFlash]         = useState(true);
  const [totalLoss, setTotalLoss] = useState(0);
  const [exploded, setExploded]   = useState(0);
  const wipCount                  = useRef(wip);
  const triggers                  = useRef({});

  useEffect(() => {
    // Flash
    const flashTimers = [
      setTimeout(() => setFlash(false), 160),
      setTimeout(() => setFlash(true),  320),
      setTimeout(() => setFlash(false), 480),
    ];

    // Co 1s: dźwięk D + eksplozja pizzy
    const beatTimers = Array.from({ length: wipCount.current }, (_, i) =>
      setTimeout(() => {
        audio.cash();
        const trigger = triggers.current[i];
        if (trigger) trigger();
        setTotalLoss(t => t + PENALTY_RATE);
        setExploded(e => e + 1);
        onBalanceUpdate && onBalanceUpdate(PENALTY_RATE);
      }, 800 + i * 1000)
    );

    return () => { [...flashTimers, ...beatTimers].forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(id); setLocked(false); return 0; }
      return c - 1;
    }), 900);
    return () => clearInterval(id);
  }, []);

  const count = wipCount.current;

  return (
    <div onClick={!locked ? onUnlock : undefined}
      className="flex flex-col items-center justify-center py-4 gap-3 text-center"
      style={{ cursor: locked ? 'default' : 'pointer' }}>
      {flash && <div className="fixed inset-0 bg-red-600 opacity-50 pointer-events-none z-50"/>}
      <Zap size={50} className="text-red-500" style={{ animation: 'pulse 0.6s ease-in-out infinite' }}/>
      <h2 className="text-3xl font-black text-red-500">AWARIA PRĄDU!</h2>

      {/* Pizze na blacie */}
      {count > 0 && (
        <div className="flex flex-wrap justify-center gap-2 max-w-xs">
          {[...Array(Math.min(count, 20))].map((_, i) => (
            <WipPizzaItem key={i} index={i} onExplode={(idx, fn) => { triggers.current[idx] = fn; }}/>
          ))}
          {count > 20 && (
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-900 border-2 border-red-600 text-xs font-black text-red-300"
              id="extra-wip">
              +{count - 20}
            </div>
          )}
        </div>
      )}

      {/* Panel straty */}
      <div className="w-full max-w-xs bg-red-950 border border-red-900 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💨</span>
          <span className="text-[10px] text-red-700 uppercase tracking-widest font-bold">Awaria — straty</span>
        </div>
        <div className="text-4xl font-black text-red-400 text-center">
          -{totalLoss}$
        </div>
        <div className="text-xs text-red-800 text-center">
          {exploded} nieupieczone pizze × $50
        </div>
        <div className="w-full h-2 bg-red-900 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 rounded-full transition-all duration-700"
            style={{ width: `${100 - (exploded / Math.max(count, 1)) * 100}%` }}/>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-red-800">Zniszczone</span>
          <span className="text-red-400 font-bold">{exploded} / {wipCount.current}</span>
        </div>
      </div>

      <div className="mt-2">
        {locked
          ? <div className="flex flex-col items-center gap-1">
              <span className="text-5xl font-black text-slate-700">{countdown}</span>
              <p className="text-slate-700 text-[10px] uppercase tracking-widest">poczekaj...</p>
            </div>
          : <div className="flex flex-col items-center gap-2 animate-pulse">
              <div className="w-14 h-14 rounded-full border-4 border-orange-500 flex items-center justify-center text-2xl">👆</div>
              <p className="text-orange-400 text-xs font-bold uppercase tracking-widest">Dotknij → wyniki</p>
            </div>
        }
      </div>
      <p className="text-[9px] text-slate-800 uppercase mt-1">pozostało: {timeLeft}s</p>
    </div>
  );
};

// ─── OEE HELPERS ─────────────────────────────────────────────────────────────
const MAX_BY_OVEN = Math.floor(PROD_TIME / (OVEN_MS / 1000));
const oeeGrade = (p) => {
  if (p >= 85) return { bg: '#0a1f10', border: '#1a4a25', text: '#4ade80', desc: '#86c898', sub: '#4ade8088' };
  if (p >= 60) return { bg: '#1a1800', border: '#3a3500', text: '#facc15', desc: '#c4a832', sub: '#facc1588' };
  return             { bg: '#1f0a0a', border: '#4a1515', text: '#f87171', desc: '#c06060', sub: '#f8717188' };
};

// ─── OEE PANEL ────────────────────────────────────────────────────────────────
const OeePanel = ({ r }) => {
  const avail = 67;
  const perf  = Math.min(100, Math.round((r.baked / MAX_BY_OVEN) * 100));
  const total = r.baked + r.wipAtEnd;
  const qual  = total === 0 ? 100 : Math.round((r.baked / total) * 100);
  const oee   = Math.round(avail * perf * qual / 10000);
  const ca = oeeGrade(avail), cp = oeeGrade(perf), cq = oeeGrade(qual), cr = oeeGrade(oee);
  const tileStyle = (g) => ({ background: g.bg, border: `1px solid ${g.border}`, borderRadius: 12, padding: '14px 10px', textAlign: 'center', flex: 1 });

  return (
    <div style={{ background: '#1a2035', border: '1px solid #2a3150', borderRadius: 16, overflow: 'hidden', color: '#fff', marginBottom: 12 }}>
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2a3150' }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>Próba #{r.attempt}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: r.balance >= 0 ? '#4ade80' : '#f87171' }}>{fmt(r.balance)}</span>
      </div>
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'Dostępność', val: `${avail}%`, c: ca, d1: '20s z 30s\npiec mógł pracować', d2: '10s = awaria prądu', d2c: '#f87171' },
            { label: 'Wydajność',  val: `${perf}%`,  c: cp, d1: `${r.baked} z ${MAX_BY_OVEN} możliwych\ncykli pieca`, d2: `max = floor(20÷3) = ${MAX_BY_OVEN}`, d2c: cp.sub },
            { label: 'Jakość',     val: `${qual}%`,  c: cq, d1: `${r.baked} dobrych z ${total}\nwyprodukowanych`, d2: `${r.wipAtEnd} WIP = NOK (scrap)`, d2c: '#f87171' },
          ].map(({ label, val, c, d1, d2, d2c }) => (
            <div key={label} style={tileStyle(c)}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.text, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 30, fontWeight: 500, color: c.text, lineHeight: 1, marginBottom: 6 }}>{val}</div>
              <div style={{ fontSize: 11, color: c.desc, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{d1}</div>
              <div style={{ fontSize: 10, color: d2c, marginTop: 4 }}>{d2}</div>
            </div>
          ))}
        </div>
        <div style={{ background: cr.bg, border: `1px solid ${cr.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#8890aa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>OEE Pizzerii</div>
            <div style={{ fontSize: 11, color: '#3a4260' }}>{avail}% × {perf}% × {qual}%</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, color: cr.text }}>{oee}%</div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #2a3150' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: '#0d1520', borderBottom: '1px solid #2a3150' }}>
          <span style={{ fontSize: 22 }}>📐</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#378ADD' }}>Jak działa wzór OEE?</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1a3a5a', marginTop: 2 }}>Overall Equipment Effectiveness</div>
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 14, color: '#c8cfe0', lineHeight: 1.65, marginBottom: 12 }}>
            OEE to iloczyn trzech liczb. Każda z nich "<span style={{ color: '#378ADD', fontWeight: 500 }}>zjada</span>" część potencjału. Nawet jeśli dwa składniki są świetne — jeden zły ciągnie całość w dół.
          </p>
          <div style={{ height: 1, background: '#2a3150', marginBottom: 12 }}/>
          <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#378ADD', marginBottom: 10 }}>Trzy pytania = trzy składniki</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { icon: '⚡', name: 'Czy działał?', c: ca, lines: ['Czas pracy ÷ czas całkowity', `20 ÷ 30 = ${avail}%`, 'awaria zabrała 33%'], lc: ['#8890aa', ca.text, '#f87171'] },
              { icon: '⏱️', name: 'Czy piekł w rytmie?', c: cp, lines: ['Upieczone ÷ max możliwe', `${r.baked} ÷ ${MAX_BY_OVEN} = ${perf}%`, 'piec bił równo co 3s'], lc: ['#8890aa', cp.text, '#4ade80'] },
              { icon: '✅', name: 'Czy trafiło do klienta?', c: cq, lines: ['Sprzedane ÷ wszystkie wytworzone', `${r.baked} ÷ ${total} = ${qual}%`, `${r.wipAtEnd} WIP = scrap`], lc: ['#8890aa', cq.text, '#f87171'] },
            ].map(({ icon, name, c, lines, lc }) => (
              <div key={name} style={{ flex: 1, background: '#141928', border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: c.text, marginBottom: 8 }}>{name}</div>
                {lines.map((l, i) => <div key={i} style={{ fontSize: 11, color: lc[i], lineHeight: 1.5, marginBottom: i === 0 ? 6 : 2 }}>{l}</div>)}
              </div>
            ))}
          </div>
          <div style={{ background: '#0e1525', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#8890aa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Wzór krok po kroku</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 14, fontWeight: 500 }}>
              <span style={{ color: ca.text }}>{avail}%</span><span style={{ color: '#4a5270' }}>×</span>
              <span style={{ color: cp.text }}>{perf}%</span><span style={{ color: '#4a5270' }}>×</span>
              <span style={{ color: cq.text }}>{qual}%</span><span style={{ color: '#4a5270' }}>=</span>
              <span style={{ color: cr.text, fontSize: 20 }}>{oee}%</span>
              <span style={{ color: '#4a5270', fontSize: 11, marginLeft: 4 }}>OEE pizzerii</span>
            </div>
            <div style={{ fontSize: 11, color: '#4a5270', marginTop: 8, fontStyle: 'italic' }}>
              Światowa klasa to 85%. Każdy WIP na blacie podczas awarii obniża jakość i demoluje OEE.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── OEE ANALYSIS ────────────────────────────────────────────────────────────
const OeeAnalysis = ({ history, onClose }) => (
  <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
    <div className="min-h-screen p-5 flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-black text-white">Analiza OEE</h2>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Overall Equipment Effectiveness · Pizzeria</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700">
          <X size={18} className="text-slate-400"/>
        </button>
      </div>
      {history.map(r => <OeePanel key={r.attempt} r={r}/>)}
      <button onClick={onClose} className="mt-4 bg-orange-500 hover:bg-orange-400 px-8 py-4 rounded-full font-black text-base transition-colors self-center">
        Zamknij analizę
      </button>
    </div>
  </div>
);

// ─── RESULTS TABLE ────────────────────────────────────────────────────────────
const ResultsTable = ({ history, onRestart }) => {
  const [showOee, setShowOee] = useState(false);
  const best = [...history].sort((a, b) => b.balance - a.balance)[0];
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-5 pb-12">
      {showOee && <OeeAnalysis history={history} onClose={() => setShowOee(false)}/>}
      <Trophy size={44} className="text-yellow-400 mb-3"/>
      <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">RAPORT KOŃCOWY</h1>
      <p className="text-slate-600 text-[10px] uppercase tracking-widest mb-6">OEE vs Theory of Constraints</p>
      <div className="w-full max-w-lg space-y-3 mb-6">
        <div className="grid grid-cols-5 gap-2 text-[10px] text-slate-600 uppercase px-3">
          <span>Próba</span><span className="text-center">$</span>
          <span className="text-center">CPS↑</span><span className="text-center">🍕</span>
          <span className="text-center">🗑WIP</span>
        </div>
        {history.map((r, i) => {
          const isBest = r.balance === best.balance;
          const { chefOee, ovenOee } = calcOee(r);
          return (
            <div key={i} className={`rounded-xl border overflow-hidden ${isBest ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-slate-800'}`}>
              <div className={`grid grid-cols-5 gap-2 items-center px-3 py-2.5 ${isBest ? 'bg-orange-500/10' : 'bg-slate-900'}`}>
                <span className="font-bold text-sm flex items-center gap-1">{isBest && <Trophy size={10} className="text-yellow-400"/>}#{r.attempt}</span>
                <span className={`text-center font-black text-sm ${r.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>{fmt(r.balance)}</span>
                <span className="text-center text-blue-400 font-bold text-sm">{r.maxCps}</span>
                <span className="text-center text-slate-200 text-sm">{r.baked}</span>
                <span className={`text-center text-sm font-bold ${r.wipAtEnd > 0 ? 'text-red-400' : 'text-slate-500'}`}>{r.wipAtEnd}</span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-800">
                <div className="bg-slate-950 px-3 py-1 flex items-center gap-2">
                  <span className="text-[9px] text-slate-600">Kucharz</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${chefOee}%` }}/>
                  </div>
                  <span className="text-[9px] text-blue-400 font-bold">{chefOee}%</span>
                </div>
                <div className="bg-slate-950 px-3 py-1 flex items-center gap-2">
                  <span className="text-[9px] text-slate-600">Piec</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${ovenOee}%` }}/>
                  </div>
                  <span className="text-[9px] text-orange-400 font-bold">{ovenOee}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-lg mb-5 rounded-3xl overflow-hidden border border-orange-900 shadow-[0_0_30px_rgba(249,115,22,0.12)]">
        <div className="bg-gradient-to-r from-orange-950 to-red-950 px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">🥁</span>
          <div>
            <p className="font-black text-orange-400 text-base">Co czułeś w ręku?</p>
            <p className="text-orange-800 text-[9px] uppercase tracking-widest">Theory of Constraints · DBR</p>
          </div>
        </div>
        <div className="bg-slate-900 px-5 py-4 space-y-3 text-sm leading-relaxed">
          <p className="text-slate-200">To wibro przy każdej pizzy — to był <strong className="text-orange-400">rytm wąskiego gardła</strong>.</p>
          <p className="text-slate-400">W TOC ten rytm ma nazwę: <strong className="text-white">Drum</strong> — bęben, który wybija tempo całej produkcji. Piec bije co <strong className="text-orange-400">3 sekundy</strong>. Nie szybciej, nie wolniej.</p>
          <div className="border-t border-slate-800 pt-3">
            <p className="text-orange-300 font-bold text-[10px] uppercase tracking-widest mb-2">Drum–Buffer–Rope</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[['🥁','Drum','text-orange-400','rytm pieca co 3s'],['🛡️','Buffer','text-blue-400','mały zapas przed piecem'],['🪢','Rope','text-green-400','hamuje kucharza = brak WIP']].map(([e,n,c,d]) => (
                <div key={n} className="bg-slate-800 rounded-xl p-2.5">
                  <p className="text-xl mb-1">{e}</p>
                  <p className={`font-bold ${c}`}>{n}</p>
                  <p className="text-slate-500 mt-0.5 leading-tight">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button onClick={() => setShowOee(true)}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-slate-200">
          <BarChart2 size={18} className="text-orange-400"/> Analiza OEE
        </button>
        <button onClick={onRestart}
          className="flex items-center justify-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-black text-base hover:bg-orange-400 transition-colors">
          <RotateCcw size={16}/> Zagraj ponownie
        </button>
      </div>
    </div>
  );
};

// ─── ATTEMPT RESULT ───────────────────────────────────────────────────────────
const AttemptResult = ({ result, attempt, onNext, isLast }) => {
  const { chefOee, ovenOee } = calcOee(result);
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <h2 className="text-base text-slate-500 uppercase tracking-widest mb-1">Wynik próby</h2>
      <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">#{result.attempt}</h1>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
        {[
          { label: 'Zysk', value: fmt(result.balance), color: result.balance >= 0 ? 'text-green-400' : 'text-red-500' },
          { label: 'Rekord CPS', value: result.maxCps, color: 'text-blue-400' },
          { label: '🍕 Upieczone', value: result.baked, color: 'text-orange-400' },
          { label: '🗑 WIP', value: result.wipAtEnd, color: result.wipAtEnd > 0 ? 'text-red-400' : 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-[9px] text-slate-500 uppercase mb-1">{label}</p>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-[9px] text-slate-500 uppercase mb-1">OEE Kucharza</p>
          <p className={`text-3xl font-black ${chefOee > 70 ? 'text-red-400' : 'text-blue-400'}`}>{chefOee}%</p>
          <p className="text-[9px] text-slate-600 mt-1">vs rekord świata 10 CPS</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-[9px] text-slate-500 uppercase mb-1">OEE Pieca</p>
          <p className={`text-3xl font-black ${ovenOee >= 70 ? 'text-green-400' : 'text-orange-400'}`}>{ovenOee}%</p>
          <p className="text-[9px] text-slate-600 mt-1">czas pracy ÷ czas dostępny</p>
        </div>
      </div>
      <button onClick={onNext}
        className="flex items-center gap-3 bg-orange-500 hover:bg-orange-400 px-10 py-4 rounded-full font-black text-lg transition-colors">
        {isLast ? <><Trophy size={18}/> Wyniki końcowe</> : <><ChevronRight size={18}/> Próba {attempt + 1}</>}
      </button>
    </div>
  );
};

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
const GameScreen = ({ attempt, onFinish, showTrafficLight }) => {
  const [timeLeft,     setTimeLeft]    = useState(GAME_DURATION);
  const [balance,      setBalance]     = useState(0);
  const [taps,         setTaps]        = useState(0);
  const [wip,          setWip]         = useState(0);
  const [ovenActive,   setOvenActive]  = useState(false);
  const [ovenProgress, setOvenProgress] = useState(0);
  const [pizzaPhase,   setPizzaPhase]  = useState('hidden');
  const [baked,        setBaked]       = useState(0);
  const [powerOutage,  setPowerOutage] = useState(false);
  const [showOutage,   setShowOutage]  = useState(false);
  const [ropeLimit,    setRopeLimit]   = useState(3); // null = ∞
  const autoIntervalRef = useRef(null);

  const balanceRef      = useRef(0);
  const wipRef          = useRef(0);
  const bakedRef        = useRef(0);
  const maxCpsRef       = useRef(0);
  const totalTapsRef    = useRef(0);
  const tapTimes        = useRef([]);
  const finishedRef     = useRef(false);
  const outageRef       = useRef(false);
  const lastTapRef      = useRef(0);
  const ovenTimerRef    = useRef(null);
  const progIntervalRef = useRef(null);

  const ovenRef         = useRef(false);
  const ovenAtOutageRef = useRef(false);
  const updBalance = (v) => { balanceRef.current = v; setBalance(v); };
  const updWip     = (v) => { wipRef.current = v;     setWip(v); };
  const updBaked   = (v) => { bakedRef.current = v;   setBaked(v); };

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      tapTimes.current = tapTimes.current.filter(t => now - t < 1000);
      const c = tapTimes.current.length;
      if (c > maxCpsRef.current) maxCpsRef.current = c;
    }, 100);
    return () => clearInterval(id);
  }, []);

  const runOven = useRef(null);
  runOven.current = () => {
    if (outageRef.current || finishedRef.current) return;
    if (wipRef.current > 0) {
      updWip(wipRef.current - 1);
      setOvenActive(true);
      ovenRef.current = true;
      setPizzaPhase('enter');
      audio.whoosh();
      setTimeout(() => setPizzaPhase('baking'), 400);

      let prog = 0;
      setOvenProgress(0);
      progIntervalRef.current = setInterval(() => {
        prog += 50 / OVEN_MS;
        setOvenProgress(Math.min(prog, 1));
      }, 50);

      ovenTimerRef.current = setTimeout(() => {
        clearInterval(progIntervalRef.current);
        setPizzaPhase('exit');
        audio.ching();
        setTimeout(() => {
          setPizzaPhase('hidden');
          setOvenActive(false);
          ovenRef.current = false;
          setOvenProgress(0);
          const nb = bakedRef.current + 1;
          updBaked(nb);
          updBalance(balanceRef.current + PIZZA_VAL);
          audio.plop();
          vibrate([50, 30, 50]);
          setTimeout(() => runOven.current(), 300);
        }, 500);
      }, OVEN_MS);
    } else {
      ovenTimerRef.current = setTimeout(() => runOven.current(), 100);
    }
  };

  useEffect(() => {
    if (outageRef.current) return;
    runOven.current();
    return () => {
      if (ovenTimerRef.current) clearTimeout(ovenTimerRef.current);
      if (progIntervalRef.current) clearInterval(progIntervalRef.current);
    };
  }, [powerOutage]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next <= OUTAGE_START && !outageRef.current) {
          outageRef.current = true;
          setPowerOutage(true);
          setShowOutage(true);
          audio.outage();
          vibrate([200, 100, 200, 100, 400]);
          ovenAtOutageRef.current = ovenRef.current;
          if (ovenTimerRef.current) clearTimeout(ovenTimerRef.current);
          if (progIntervalRef.current) clearInterval(progIntervalRef.current);
          setOvenActive(false);
          setPizzaPhase('hidden');
          if (ovenRef.current) updBalance(balanceRef.current - PENALTY_RATE);
          ovenRef.current = false;
        }
        if (next <= 0 && !finishedRef.current && !outageRef.current) {
          finishedRef.current = true;
          clearInterval(id);
          doFinish();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const doFinish = () => {
    const finalWip = wipRef.current + (ovenAtOutageRef.current ? 1 : 0);
    const earnedFromBaking = bakedRef.current * PIZZA_VAL;
    const penalty = finalWip * PENALTY_RATE;
    const finalBalance = earnedFromBaking - penalty;
    return onFinish({
    attempt, balance: finalBalance, maxCps: maxCpsRef.current,
    baked: bakedRef.current, wipAtEnd: finalWip, totalTaps: totalTapsRef.current,
  });
  };

  const handleOutageUnlock = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    doFinish();
  };

  const handleTap = useCallback(() => {
    if (outageRef.current || finishedRef.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < 20) return;
    lastTapRef.current = now;
    audio.tap();
    totalTapsRef.current += 1;
    tapTimes.current.push(now);
    setTaps(t => {
      const next = t + 1;
      if (next >= TAPS_PER_PIZZA) {
        updWip(wipRef.current + 1);
        audio.pizza();
        return 0;
      }
      return next;
    });
  }, []);

  // Auto-klikacz — zawsze aktywny w próbie 3+, klika gdy WIP < ropeLimit
  useEffect(() => {
    if (attempt < 3) return;
    autoIntervalRef.current = setInterval(() => {
      const withinLimit = ropeLimit === null || wipRef.current < ropeLimit;
      if (withinLimit && !outageRef.current && !finishedRef.current) handleTap();
    }, 100);
    return () => clearInterval(autoIntervalRef.current);
  }, [ropeLimit, handleTap, attempt]);

  const isOutage = timeLeft <= OUTAGE_START;

  const segments = Array.from({ length: 4 }, (_, i) => {
    const r = 68, ri = 52, gap = 4;
    const a1 = (i * 90 - 90) * Math.PI / 180;
    const a2 = ((i + 1) * 90 - 90 - gap) * Math.PI / 180;
    const x1 = r*Math.cos(a1), y1 = r*Math.sin(a1);
    const x2 = r*Math.cos(a2), y2 = r*Math.sin(a2);
    const xi1 = ri*Math.cos(a1), yi1 = ri*Math.sin(a1);
    const xi2 = ri*Math.cos(a2), yi2 = ri*Math.sin(a2);
    return (
      <path key={i}
        d={`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 0 0 ${xi1} ${yi1} Z`}
        fill={i < taps ? '#f97316' : '#1e293b'} opacity={i < taps ? 1 : 0.5}
      />
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans select-none flex flex-col px-4 pt-5 pb-4 gap-3">
      <div className="flex items-start justify-between">
        <div className={`text-4xl font-black tabular-nums leading-none ${balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>
          {fmt(balance)}
        </div>
        <div className="flex flex-col items-end">
          <p className="text-[8px] text-slate-600 uppercase tracking-widest">Próba {attempt}/3</p>
          <div className={`text-4xl font-black font-mono tabular-nums leading-none ${isOutage ? 'text-red-500 animate-pulse' : timeLeft <= 15 ? 'text-orange-400' : 'text-white'}`}>
            {timeLeft}<span className="text-sm text-slate-500">s</span>
          </div>
        </div>
      </div>

      {showOutage ? (
        <div className="flex-1 flex items-start justify-center pt-2">
          <OutageScreen wip={wip} onUnlock={handleOutageUnlock} timeLeft={timeLeft} onBalanceUpdate={(penalty) => updBalance(balanceRef.current - penalty)}/>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex flex-col gap-1">
              {/* STATUS BAR — tylko próba 2+ */}
              {attempt >= 2 && (
              <div className={`flex items-center justify-between px-2 py-1 rounded-lg transition-all duration-300
                ${wip === 0 || wip > 4 ? 'bg-red-950 border border-red-800' : wip <= 2 ? 'bg-green-950 border border-green-800' : 'bg-yellow-950 border border-yellow-800'}`}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                    ${wip === 0 || wip > 4 ? 'bg-red-500' : wip <= 2 ? 'bg-green-400' : 'bg-yellow-400'}`}
                    style={wip > 4 ? { animation: 'pulse 0.6s ease-in-out infinite' } : {}}/>
                  <span className={`text-[9px] font-bold uppercase tracking-wide
                    ${wip <= 2 ? 'text-green-400' : wip <= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {wip === 0 ? '✕ niebezpiecznie niski poziom' : wip <= 2 ? '✓ ok — bezpieczny poziom' : wip <= 4 ? '⚠ uwaga — poziom wzrasta' : '✕ niebezpiecznie wysoki'}
                  </span>
                </div>
                <span className={`text-[9px] font-bold
                  ${wip === 0 || wip > 4 ? 'text-red-400' : wip <= 2 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {wip}
                </span>
              </div>
              )}
            <div className={`flex-1 bg-orange-950 rounded-2xl p-2 min-h-[100px] flex flex-col gap-1 transition-all duration-150
              ${attempt >= 2
                ? wip === 0  ? 'border-2 border-green-700'
                : wip <= 2   ? 'border-2 border-green-500 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                : wip <= 4   ? 'border-2 border-yellow-500 shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                :              'border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                : 'border border-orange-900'
              }
              ${attempt >= 2 && taps > 0 ? 'scale-[1.02]' : 'scale-100'}
            `}>
              <span className="text-[7px] text-orange-800 uppercase tracking-widest font-bold">⬤ Surowe</span>
              <div className="flex flex-wrap gap-1 flex-1 items-start content-start">
                {wip === 0 && <span className="text-orange-900 text-[9px] italic">pusty blat</span>}
                {[...Array(Math.min(wip, 12))].map((_, i) => (
                  <div key={i} className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${wip >= 4 ? 'border-orange-400 bg-orange-900 animate-pulse' : 'border-orange-700 bg-orange-950'}`}>🫓</div>
                ))}
                {wip > 8 && <span className="text-orange-400 text-[9px] font-bold">+{wip-8}</span>}
              </div>
              <span className="text-[8px] text-orange-800">{wip} szt.</span>
            </div>
            </div>
            <div className="flex flex-col items-center flex-shrink-0">
              {showTrafficLight && <TrafficLightMini ovenActive={ovenActive}/>}
              <OvenSVG active={ovenActive} progress={ovenProgress} pizzaPhase={pizzaPhase}/>
            </div>
            <div className="flex-1 bg-green-950 border border-green-900 rounded-2xl p-2 min-h-[100px] flex flex-col gap-1">
              <span className="text-[7px] text-green-800 uppercase tracking-widest font-bold">⬤ Gotowe</span>
              <div className="flex flex-wrap gap-1 flex-1 items-start content-start">
                {baked === 0 && <span className="text-green-900 text-[9px] italic">czeka...</span>}
                {[...Array(Math.min(baked, 8))].map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-green-900 border border-green-500 flex items-center justify-center text-[10px]">🍕</div>
                ))}
                {baked > 8 && <span className="text-green-400 text-[9px] font-bold">+{baked-8}</span>}
              </div>
              <span className="text-[8px] text-green-800">{baked} szt.</span>
            </div>
          </div>

          {/* ROPE + AUTO — tylko próba 3+ */}
          {attempt >= 3 ? (
            <div className="flex flex-col gap-2">

              {/* ROPE regulator */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">🪢 Rope — limit WIP</span>
                  <span className="text-[9px] text-slate-600">{ropeLimit === null ? 'brak limitu' : `max ${ropeLimit}`}</span>
                </div>
                <div className="flex gap-2">
                  {[null,1,2,3,4,5].map(v => (
                    <button key={v ?? 'inf'} onClick={() => setRopeLimit(v)}
                      className={`flex-1 py-1.5 rounded-xl text-sm font-black transition-all
                        ${ropeLimit === v
                          ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {v === null ? '∞' : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* SIGNAL LINE: WIP → 🤖 → przycisk */}
              <div style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center' }}>
                {/* Linia tło */}
                <div style={{ position: 'absolute', left: '10%', right: '10%', height: 2, background: '#1e293b', borderRadius: 2 }}/>
                {/* Linia aktywna */}
                <div style={{
                  position: 'absolute', left: '10%', height: 2, borderRadius: 2,
                  width: ropeLimit !== null && wip >= ropeLimit ? '35%' : '80%',
                  background: ropeLimit !== null && wip >= ropeLimit ? '#ef4444' : '#4ade80',
                  boxShadow: ropeLimit !== null && wip >= ropeLimit ? '0 0 6px rgba(239,68,68,0.7)' : '0 0 6px rgba(74,222,128,0.7)',
                  transition: 'all 0.4s ease'
                }}/>
                {/* Dot WIP */}
                <div style={{ position: 'absolute', left: '8%', width: 10, height: 10, borderRadius: '50%', background: ropeLimit !== null && wip >= ropeLimit ? '#ef4444' : '#4ade80', boxShadow: '0 0 8px currentColor', transform: 'translateX(-50%)' }}/>
                {/* Label WIP */}
                <div style={{ position: 'absolute', left: '10%', top: 0, fontSize: 7, color: '#475569', textTransform: 'uppercase' }}>WIP</div>

                {/* Robot 🤖 — jedzie po linie */}
                <div style={{
                  position: 'absolute',
                  left: ropeLimit !== null && wip >= ropeLimit ? '40%' : '82%',
                  top: '50%', transform: 'translate(-50%, -50%)',
                  fontSize: 20,
                  transition: 'left 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                  animation: ropeLimit !== null && wip >= ropeLimit ? 'robotWarn 0.35s ease-in-out infinite alternate' : 'robotBounce 0.2s ease-in-out infinite alternate',
                  zIndex: 2,
                }}>🤖</div>

                {/* Label status */}
                <div style={{ position: 'absolute', right: '10%', top: 0, fontSize: 7, color: '#475569', textTransform: 'uppercase' }}>PRZYCISK</div>
                {/* Dot przycisk */}
                <div style={{ position: 'absolute', right: '8%', width: 10, height: 10, borderRadius: '50%', background: ropeLimit !== null && wip >= ropeLimit ? '#334155' : '#f97316', boxShadow: ropeLimit !== null && wip >= ropeLimit ? 'none' : '0 0 8px rgba(249,115,22,0.8)', transform: 'translateX(50%)' }}/>
              </div>

            </div>
          ) : (
            <div style={{ height: 120 }}/>
          )}

          <div className="flex flex-col items-center gap-1 mt-1">
            <div className="relative w-36 h-36">
              <svg width="144" height="144" style={{ position: 'absolute', top: 0, left: 0 }}>
                <g transform="translate(72,72)">{segments}</g>
              </svg>
              <button
                onMouseDown={handleTap}
                onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
                className={`absolute inset-3 rounded-full border-4 shadow-2xl transition-all duration-300 flex flex-col items-center justify-center
                  ${attempt >= 3 && ropeLimit !== null && wip >= ropeLimit
                    ? 'bg-slate-800 border-slate-600'
                    : 'bg-gradient-to-br from-orange-500 to-red-700 border-orange-300'}`}
                style={{ animation: (attempt >= 3 && (ropeLimit === null || wip < ropeLimit)) ? 'autoPress 0.1s ease-in-out infinite alternate' : 'none' }}>
                <span className="text-3xl">🍕</span>
                <span className="font-black text-xs text-white">
                  {attempt >= 3 && ropeLimit !== null && wip >= ropeLimit ? 'ROPE' : 'KLEPIEMY!'}
                </span>
              </button>
            </div>
            <p className="text-[8px] text-slate-700 uppercase tracking-widest">{taps}/{TAPS_PER_PIZZA} tapów</p>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse        { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes wipDie       { 0%{transform:scale(1);opacity:1;filter:brightness(1)} 25%{transform:scale(1.8);opacity:1;filter:brightness(3) saturate(3)} 60%{transform:scale(1.2);opacity:0.6;filter:brightness(0.5) grayscale(0.5)} 100%{transform:scale(0.2);opacity:0;filter:grayscale(1)} }
        @keyframes floatPenalty { 0%{transform:translateX(-50%) translateY(0);opacity:1} 100%{transform:translateX(-50%) translateY(-28px);opacity:0} }
        @keyframes autoPress    { from{transform:scale(1)} to{transform:scale(0.88)} }
        @keyframes robotBounce  { from{transform:translateX(-50%) translateY(0)} to{transform:translateX(-50%) translateY(-6px)} }
        @keyframes robotWarn    { from{transform:translateX(-50%) translateY(0) rotate(-10deg)} to{transform:translateX(-50%) translateY(-8px) rotate(10deg)} }
      `}</style>
    </div>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function PizzaTOC() {
  const [phase,      setPhase]      = useState('START');
  const [attempt,    setAttempt]    = useState(1);
  const [history,    setHistory]    = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const MAX_ATTEMPTS = 3;

  const handleFinish = (result) => {
    const h = [...history, result];
    setHistory(h);
    setLastResult(result);
    setPhase(attempt >= MAX_ATTEMPTS ? 'FINAL' : 'ATTEMPT_RESULT');
  };

  const handleNext    = () => { setAttempt(a => a + 1); setPhase('PLAYING'); };
  const handleRestart = () => { setPhase('START'); setAttempt(1); setHistory([]); setLastResult(null); };

  if (phase === 'START') return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-6 text-center"
      style={{ background: 'radial-gradient(ellipse at top, #1a1040 0%, #020617 60%)' }}>
      <div className="text-7xl mb-4" style={{ animation: 'bounce 1s infinite' }}>🍕</div>
      <h1 className="font-black mb-2 leading-tight uppercase"
        style={{ fontSize: 32, background: 'linear-gradient(135deg,#f97316,#facc15)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        ZARÓB JAK NAJWIĘCEJ<br/>W 30 SEKUND!
      </h1>
      <p className="text-slate-400 mb-6 text-sm italic">(Ale uważaj na przerwy w dostawie prądu...)</p>
      <div className="w-full max-w-xs mb-8 text-left space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">👨‍🍳</span>
          <p className="text-sm text-slate-200 leading-relaxed"><strong className="text-white">Tapuj szybko</strong>, by przygotować pizzę na blat. Piec nie może czekać!</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🔥</span>
          <p className="text-sm text-slate-200 leading-relaxed"><strong className="text-white">Piec</strong> piecze jedną pizzę co 3 sekundy.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⚡</span>
          <p className="text-sm text-slate-200 leading-relaxed"><strong className="text-yellow-400">AWARYJNE WYŁĄCZENIE:</strong> Gdy zgaśnie światło, każda pizza na blacie generuje potężne straty!</p>
        </div>
      </div>
      <button onClick={() => setPhase('PLAYING')}
        className="font-black text-lg text-white px-10 py-4 rounded-2xl transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 0 30px rgba(249,115,22,0.5)', letterSpacing: '0.03em' }}>
        [ START: PRÓBA 1 — SPRAWDŹ SIĘ ]
      </button>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  );

  if (phase === 'PLAYING') return (
    <GameScreen key={attempt} attempt={attempt} onFinish={handleFinish} showTrafficLight={attempt >= 2}/>
  );

  if (phase === 'ATTEMPT_RESULT') return (
    <AttemptResult result={lastResult} attempt={attempt} onNext={handleNext} isLast={attempt >= MAX_ATTEMPTS}/>
  );

  if (phase === 'FINAL') return (
    <ResultsTable history={history} onRestart={handleRestart}/>
  );

  return null;
}
