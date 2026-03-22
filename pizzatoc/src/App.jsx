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
    cash:   () => { play(120, 'sine', 0.22, 0.2); play(1400, 'triangle', 0.08, 0.1, 0.05); play(900, 'triangle', 0.05, 0.12, 0.12); },
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

// ─── WIP PIZZA ITEM ───────────────────────────────────────────────────────────
const WipPizzaItem = ({ index, onExplode }) => {
  const [phase, setPhase]     = useState('alive');
  const [showNum, setShowNum] = useState(false);
  const triggered             = useRef(false);

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
          -$50
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
    const flashTimers = [
      setTimeout(() => setFlash(false), 160),
      setTimeout(() => setFlash(true),  320),
      setTimeout(() => setFlash(false), 480),
    ];
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
      {count > 0 && (
        <div className="flex flex-wrap justify-center gap-2 max-w-xs">
          {[...Array(Math.min(count, 20))].map((_, i) => (
            <WipPizzaItem key={i} index={i} onExplode={(idx, fn) => { triggers.current[idx] = fn; }}/>
          ))}
          {count > 20 && (
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-900 border-2 border-red-600 text-xs font-black text-red-300">
              +{count - 20}
            </div>
          )}
        </div>
      )}
      <div className="w-full max-w-xs bg-red-950 border border-red-900 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💨</span>
          <span className="text-[10px] text-red-700 uppercase tracking-widest font-bold">Awaria — straty</span>
        </div>
        <div className="text-4xl font-black text-red-400 text-center">-{totalLoss}$</div>
        <div className="text-xs text-red-800 text-center">{exploded} nieupieczone pizze × $50</div>
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
        <span style={{ fontWeight: 600, fontSize: 15 }}>Etap #{r.attempt}</span>
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
const ResultsTable = ({ history, attempt, onRestart, onContinue, onRepeatE3, onRepeatE4, onGoE4 }) => {
  const [showOee, setShowOee] = useState(false);
  const best = [...history].sort((a, b) => b.balance - a.balance)[0];
  const bestAttempt = best?.attempt;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-5 pb-12 gap-6">
      {showOee && <OeeAnalysis history={history} onClose={() => setShowOee(false)}/>}

      <div className="text-center pt-4">
        <Trophy size={44} className="text-yellow-400 mx-auto mb-3"/>
        <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">PODSUMOWANIE</h1>
        <p className="text-slate-600 text-[10px] uppercase tracking-widest">Drum · Buffer · Rope</p>
      </div>

      {/* Tabela etapów */}
      <div className="w-full max-w-lg space-y-3">
        {history.map((r, i) => {
          const isBest = r.attempt === bestAttempt;
          const { chefOee, ovenOee } = calcOee(r);
          const avail = 67;
          const perf  = Math.min(100, Math.round((r.baked / MAX_BY_OVEN) * 100));
          const total = r.baked + r.wipAtEnd;
          const qual  = total === 0 ? 100 : Math.round((r.baked / total) * 100);
          const oeePiz = Math.round(avail * perf * qual / 10000);
          const labels = ['', 'E1 — na maksa', 'E2 — z sygnałami', 'E3 — Rope + Auto'];
          return (
            <div key={i} className={`rounded-2xl border overflow-hidden ${isBest ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-slate-800'}`}>
              <div className={`flex items-center justify-between px-4 py-2.5 ${isBest ? 'bg-orange-500/10' : 'bg-slate-900'}`}>
                <span className="font-bold text-sm flex items-center gap-2">
                  {isBest && <Trophy size={12} className="text-yellow-400"/>}
                  {labels[r.attempt] || `Etap ${r.attempt}`}
                </span>
                <span className={`font-black text-lg ${r.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>{fmt(r.balance)}</span>
              </div>
              <div className="grid grid-cols-5 gap-px bg-slate-800">
                {[
                  { label: '🍕', val: r.baked, color: 'text-orange-400' },
                  { label: '🗑', val: r.wipAtEnd, color: r.wipAtEnd > 0 ? 'text-red-400' : 'text-slate-500' },
                  { label: 'OEE🔥', val: `${ovenOee}%`, color: ovenOee >= 70 ? 'text-green-400' : 'text-orange-400' },
                  { label: 'OEE🍕', val: `${oeePiz}%`, color: oeePiz >= 50 ? 'text-green-400' : 'text-red-400' },
                  { label: '⏱ LT', val: r.avgLt ? `${r.avgLt}s` : '—', color: r.avgLt ? (r.avgLt<=3?'text-green-400':r.avgLt<=6?'text-yellow-400':'text-red-400') : 'text-slate-600' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-slate-950 px-2 py-1.5 text-center">
                    <div className="text-[8px] text-slate-600">{label}</div>
                    <div className={`text-sm font-bold ${color}`}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* DBR karta */}
      <div className="w-full max-w-lg rounded-3xl overflow-hidden border border-orange-900">
        <div className="bg-gradient-to-r from-orange-950 to-red-950 px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">🥁</span>
          <div>
            <p className="font-black text-orange-400 text-base">Drum–Buffer–Rope</p>
            <p className="text-orange-800 text-[9px] uppercase tracking-widest">Theory of Constraints</p>
          </div>
        </div>
        <div className="bg-slate-900 px-5 py-4">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[['🥁','Drum','text-orange-400','rytm pieca co 3s — etap 1'],['🛡️','Buffer','text-blue-400','zapas przed piecem — etap 2'],['🪢','Rope','text-green-400','limit WIP = synchronizacja — etap 3']].map(([e,n,c,d]) => (
              <div key={n} className="bg-slate-800 rounded-xl p-2.5">
                <p className="text-xl mb-1">{e}</p>
                <p className={`font-bold ${c}`}>{n}</p>
                <p className="text-slate-500 mt-0.5 leading-tight text-[9px]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {onContinue && (
          <button onClick={onContinue}
            className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 px-8 py-4 rounded-full font-black text-lg transition-colors text-white">
            <ChevronRight size={18}/> Etap {(attempt||1) + 1}
          </button>
        )}
        {onRepeatE3 && (
          <button onClick={onRepeatE3}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-slate-200">
            <RotateCcw size={16} className="text-orange-400"/> Powtórz etap 3
          </button>
        )}
        {onRepeatE4 && (
          <button onClick={onRepeatE4}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-white"
            style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            ⚡ Powtórz etap 4 PRO
          </button>
        )}
        {onGoE4 && !onRepeatE4 && (
          <button onClick={onGoE4}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-white"
            style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow:'0 0 20px rgba(124,58,237,0.4)' }}>
            ⚡ Etap 4 — tryb PRO
          </button>
        )}
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

// ─── FEEDBACK HELPERS ─────────────────────────────────────────────────────────
const getFeedbackE1 = (r) => {
  if (r.wipAtEnd === 0 && r.balance > 0)
    return { icon: '🏆', color: '#4ade80', title: 'Świetna intuicja!', body: `Trafiłeś w rytm pieca bez żadnych wskazówek. ${r.baked} pizz upieczone, zero straty.` };
  if (r.balance > 0 && r.wipAtEnd > 0)
    return { icon: '⚠️', color: '#facc15', title: 'Udało się — ale...', body: `${r.wipAtEnd} pizz przepadło podczas awarii. Zarobiłeś ${fmt(r.balance)}, ale mogło być więcej. Co by było gdybyś wiedział kiedy zwolnić?` };
  if (r.wipAtEnd > 5)
    return { icon: '💥', color: '#ef4444', title: 'Aż tyle na blacie!', body: `${r.wipAtEnd} pizz czekało. Piec robi max 6 w 20s — reszta to czysta strata. Awaria zabrała wszystko.` };
  return { icon: '📉', color: '#ef4444', title: 'Awaria zabrała zysk', body: `${r.wipAtEnd} × $${PENALTY_RATE} = $${r.wipAtEnd * PENALTY_RATE} kary. Piec nie nadążał za Twoim tempem klikania.` };
};

const getFeedbackE2 = (r, prev) => {
  if (!prev) return { icon: '👀', color: '#378ADD', title: 'Widziałeś sygnały?', body: 'Kolory WIP podpowiadały kiedy zwolnić. Piec i tak nie przyspiesza — wąskie gardło dyktuje tempo.' };
  const diff = r.balance - prev.balance;
  if (diff > 0)
    return { icon: '📈', color: '#4ade80', title: `+${fmt(diff)} vs etap 1!`, body: `Kolory pomogły — wynik wzrósł o ${fmt(diff)}. To właśnie Drum — piec wybija rytm całej produkcji.` };
  if (diff === 0)
    return { icon: '↔️', color: '#facc15', title: 'Taki sam wynik', body: 'Trudno zmienić nawyk klikania na podstawie koloru. W etapie 3 system zrobi to za Ciebie automatycznie.' };
  return { icon: '🤔', color: '#f97316', title: 'Tym razem gorzej', body: 'Czasem świadomość przeszkadza. Etap 3 pokaże jak zsynchronizować produkcję z piecem bez walki z własnymi nawykami.' };
};

const getFeedbackE3 = (r, history) => {
  const best = history.reduce((b, x) => x.balance > b.balance ? x : b, history[0]);
  const isBest = r.balance >= best.balance;
  const ropeInfo = r.ropeLimit ? `Limit WIP=${r.ropeLimit}` : 'Brak limitu';
  if (isBest && r.wipAtEnd === 0)
    return { icon: '🎯', color: '#4ade80', title: 'Idealna synchronizacja!', body: `${ropeInfo} — robot zsynchronizował produkcję z piecem. Zero straty, maksymalny przepływ. To DBR w praktyce.` };
  if (isBest)
    return { icon: '✅', color: '#4ade80', title: 'Najlepszy wynik!', body: `${ropeInfo} okazał się optymalny. Robot działał w rytmie pieca.` };
  if (r.wipAtEnd > 3)
    return { icon: '🔧', color: '#facc15', title: 'Limit za wysoki', body: `Przy WIP=${r.ropeLimit} blat był przeciążony. Spróbuj mniejszego limitu — bliżej rytmu pieca (1 pizza co 3s).` };
  return { icon: '⬇️', color: '#f97316', title: 'Limit za niski', body: `Piec czekał na pizze. Przy WIP=${r.ropeLimit} robot był za bardzo ograniczony. Spróbuj wyższego limitu.` };
};

// ─── ATTEMPT RESULT ───────────────────────────────────────────────────────────
const AttemptResult = ({ result, attempt, onNext, isLast, history, onRetry, onRepeatE3, onGoE4 }) => {
  const { chefOee, ovenOee } = calcOee(result);
  const prevResult = history.length >= 2 ? history[history.length - 2] : null;

  const feedback = attempt === 1 ? getFeedbackE1(result)
                 : attempt === 2 ? getFeedbackE2(result, prevResult)
                 : getFeedbackE3(result, history);

  const needsRetry = attempt === 2 && prevResult && result.balance <= prevResult.balance;

  const avail = 67;
  const perf  = Math.min(100, Math.round((result.baked / MAX_BY_OVEN) * 100));
  const total = result.baked + result.wipAtEnd;
  const qual  = total === 0 ? 100 : Math.round((result.baked / total) * 100);
  const oeePiz = Math.round(avail * perf * qual / 10000);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 pb-10 gap-4">

      <div className="text-center pt-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Wynik etapu {attempt}</p>
        <div className={`text-5xl font-black ${result.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>
          {fmt(result.balance)}
        </div>
      </div>

      {/* Liczby */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: '🍕 Upieczone', value: result.baked, color: 'text-orange-400' },
          { label: '🗑 WIP', value: result.wipAtEnd, color: result.wipAtEnd > 0 ? 'text-red-400' : 'text-slate-500' },
          { label: 'OEE Piec', value: `${ovenOee}%`, color: ovenOee >= 70 ? 'text-green-400' : 'text-orange-400' },
          { label: 'OEE 🍕', value: `${oeePiz}%`, color: oeePiz >= 50 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <p className="text-[8px] text-slate-500 uppercase mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Feedback dynamiczny */}
      <div className="rounded-2xl border p-4 flex flex-col gap-2"
        style={{ background: `${feedback.color}11`, borderColor: `${feedback.color}44` }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{feedback.icon}</span>
          <span className="font-black text-base" style={{ color: feedback.color }}>{feedback.title}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{feedback.body}</p>
      </div>

      {/* Wiedza etapowa */}
      {attempt === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[9px] text-orange-400 uppercase tracking-widest font-bold mb-2">🥁 Czym jest Drum?</p>
          <p className="text-sm text-slate-400 leading-relaxed">Piec piecze jedną pizzę co 3 sekundy — nie szybciej. To <strong className="text-white">wąskie gardło</strong> które dyktuje tempo całej produkcji. W etapie 2 zobaczysz sygnały które to pokazują.</p>
        </div>
      )}
      {attempt === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[9px] text-blue-400 uppercase tracking-widest font-bold mb-2">🛡️ Czym jest Buffer?</p>
          <p className="text-sm text-slate-400 leading-relaxed">Mały zapas przed piecem (WIP 1-2) to <strong className="text-white">buffer</strong> — gwarantuje że piec nigdy nie czeka. Za dużo WIP to nadprodukcja. Za mało — piec stoi. W etapie 3 robot znajdzie balans.</p>
        </div>
      )}
      {attempt === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[9px] text-green-400 uppercase tracking-widest font-bold mb-2">🪢 Czym jest Rope?</p>
          <p className="text-sm text-slate-400 leading-relaxed">Rope to sygnał który <strong className="text-white">hamuje produkcję</strong> gdy buffer jest pełny. Łączy tempo kuchni z rytmem pieca. Razem: <strong className="text-orange-400">Drum–Buffer–Rope</strong> = synchronizacja całego systemu.</p>
        </div>
      )}

      {/* Porównanie z poprzednią próbą */}
      {prevResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Porównanie z etapem {attempt - 1}</p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-[8px] text-slate-600">Etap {attempt - 1}</p>
              <p className={`text-lg font-black ${prevResult.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>{fmt(prevResult.balance)}</p>
            </div>
            <div className="text-2xl">
              {result.balance > prevResult.balance ? '📈' : result.balance < prevResult.balance ? '📉' : '↔️'}
            </div>
            <div className="text-center">
              <p className="text-[8px] text-slate-600">Etap {attempt}</p>
              <p className={`text-lg font-black ${result.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>{fmt(result.balance)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Kwalifikacja E2→E3 */}
      {needsRetry && (
        <div className="bg-yellow-950 border border-yellow-800 rounded-2xl p-4">
          <p className="text-[9px] text-yellow-400 uppercase tracking-widest font-bold mb-1">💡 Prawie!</p>
          <p className="text-sm text-yellow-200 leading-relaxed mb-3">Wynik etapu 2 nie przekroczył etapu 1. Spróbuj jeszcze raz obserwując kolory WIP — lub przejdź dalej mimo wszystko.</p>
          <div className="flex gap-2">
            <button onClick={onRetry}
              className="flex-1 py-3 rounded-full bg-yellow-600 hover:bg-yellow-500 font-black text-sm text-white transition-colors">
              ↺ Spróbuj jeszcze raz
            </button>
            <button onClick={onNext}
              className="flex-1 py-3 rounded-full bg-slate-700 hover:bg-slate-600 font-black text-sm text-slate-200 transition-colors">
              Przejdź dalej →
            </button>
          </div>
        </div>
      )}

      {/* Przycisk dalej */}
      <div className="flex flex-col gap-2 mt-4">
        {onRepeatE3 && (
          <button onClick={onRepeatE3}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-slate-200">
            <RotateCcw size={16} className="text-orange-400"/> Powtórz etap 3 (inny limit WIP)
          </button>
        )}
        {onGoE4 && (
          <button onClick={onGoE4}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
            ⚡ Etap 4 — tryb PRO
          </button>
        )}
        {!needsRetry && !onGoE4 && (
          <button onClick={onNext}
            className="flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-400 px-10 py-4 rounded-full font-black text-lg transition-colors">
            {isLast ? <><Trophy size={18}/> Podsumowanie</> : <><ChevronRight size={18}/> Etap {attempt + 1}</>}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── EDU SCREEN ───────────────────────────────────────────────────────────────
const EduScreen = ({ result, attempt, history, onNext }) => {
  const [simWip, setSimWip] = useState(2);
  const prevResult = history.length >= 2 ? history[history.length - 2] : null;
  const feedback = attempt === 1 ? getFeedbackE1(result)
                 : attempt === 2 ? getFeedbackE2(result, prevResult)
                 : attempt === 3 ? getFeedbackE3(result, history)
                 : getFeedbackE3(result, history);

  const simLt   = Math.max(3, (simWip + 1) * 3);
  const simRisk = simWip * 50;
  const ltCol   = simLt <= 3 ? '#4ade80' : simLt <= 9 ? '#eab308' : '#ef4444';

  const knowledge = {
    1: { icon: '🥁', color: '#f97316', title: 'Czym jest Drum?',
         body: 'Piec piecze jedną pizzę co 3 sekundy — nie szybciej. To wąskie gardło które dyktuje tempo całej produkcji. Kucharz może klepać ile chce — piec i tak bije własnym rytmem.',
         sim: true, simTitle: 'Co się dzieje gdy produkujesz bez limitu?' },
    2: { icon: '🛡️', color: '#378ADD', title: 'Czym jest Buffer?',
         body: 'Mały zapas przed piecem (WIP 1-2) gwarantuje że piec nigdy nie czeka. Za dużo WIP to nadprodukcja i ryzyko straty. Za mało — piec stoi i traci czas.',
         sim: false },
    3: { icon: '🪢', color: '#4ade80', title: 'Czym jest Rope?',
         body: 'Rope hamuje produkcję gdy buffer jest pełny. Synchronizuje tempo kuchni z rytmem pieca. Razem Drum–Buffer–Rope = zsynchronizowany system bez zbędnego WIP.',
         sim: true, simTitle: 'Rope vs brak limitu — co się dzieje z LT?' },
    4: { icon: '📊', color: '#7c3aed', title: 'OEE i Lead Time',
         body: 'OEE mierzy efektywność systemu — Dostępność × Wydajność × Jakość. Lead Time to czas od blatu do gotowego. Im więcej WIP → dłuższy LT → większe ryzyko podczas awarii.',
         sim: true, simTitle: 'Obserwuj jak WIP eksploduje LT' },
  };
  const k = knowledge[attempt] || knowledge[4];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 gap-4" onClick={onNext}
      style={{ cursor: 'pointer' }}>

      {/* Wynik */}
      <div className="text-center pt-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Wynik etapu {attempt}</p>
        <div className={`text-5xl font-black ${result.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>
          {fmt(result.balance)}
        </div>
        <div className="flex justify-center gap-4 mt-3 text-sm">
          <span className="text-orange-400 font-bold">🍕 {result.baked}</span>
          <span className={result.wipAtEnd > 0 ? 'text-red-400 font-bold' : 'text-slate-600'}>🗑 {result.wipAtEnd}</span>
          {result.avgLt && <span className="text-blue-400 font-bold">⏱ {result.avgLt}s</span>}
        </div>
      </div>

      {/* Feedback dynamiczny */}
      <div className="rounded-2xl border p-4 flex flex-col gap-2"
        style={{ background: `${feedback.color}11`, borderColor: `${feedback.color}44` }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{feedback.icon}</span>
          <span className="font-black text-base" style={{ color: feedback.color }}>{feedback.title}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{feedback.body}</p>
      </div>

      {/* Wiedza TOC */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{k.icon}</span>
          <span className="font-black text-sm" style={{ color: k.color }}>{k.title}</span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{k.body}</p>
      </div>

      {/* Symulacja WIP */}
      {k.sim && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3"
          onClick={e => e.stopPropagation()}>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{k.simTitle}</p>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">WIP:</span>
            <input type="range" min="0" max="12" value={simWip}
              onChange={e => setSimWip(Number(e.target.value))}
              className="flex-1"/>
            <span className="font-black text-lg text-orange-400 w-8 text-right">{simWip}</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-[8px] text-slate-500 uppercase mb-1">Lead Time</div>
              <div className="text-2xl font-black" style={{ color: ltCol }}>{simLt}s</div>
            </div>
            <div className="flex-1 bg-red-950 border border-red-900 rounded-xl p-3 text-center">
              <div className="text-[8px] text-red-700 uppercase mb-1">Ryzyko awarii</div>
              <div className="text-2xl font-black text-red-400">-${simRisk}</div>
            </div>
          </div>
          <div style={{ height: 6, background: '#1e293b', borderRadius: 3 }}>
            <div style={{ height: '100%', borderRadius: 3, background: ltCol, width: `${Math.min(simLt/30*100,100)}%`, transition: 'all 0.3s' }}/>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-1 mt-auto pb-2">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest animate-pulse">
          Dotknij ekran → podsumowanie
        </div>
      </div>
    </div>
  );
};

// ─── ROPE SETUP ───────────────────────────────────────────────────────────────
const RopeSetup = ({ initialRope, onStart }) => {
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pulse, setPulse] = useState(true);

  // Miganie przycisków dopóki nic nie wybrano
  useEffect(() => {
    if (selected !== null) { setPulse(false); return; }
    const id = setInterval(() => setPulse(p => !p), 600);
    return () => clearInterval(id);
  }, [selected]);

  const options = [null, 1, 2, 3, 4, 5];
  const labels  = { null: '∞', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };

  const desc = selected === null
    ? 'Brak limitu — robot klika bez przerwy. Duże ryzyko nadprodukcji podczas awarii.'
    : selected <= 2
    ? `Limit ${selected} — bardzo mały bufor. Piec może czekać na pizze.`
    : selected <= 3
    ? `Limit ${selected} — dobry balans. Piec ma ciągłą dostawę, nie za dużo WIP.`
    : `Limit ${selected} — spory bufor. Bezpieczniejszy, ale więcej straty podczas awarii.`;

  const descColor = selected === null ? '#ef4444'
    : selected <= 2 ? '#facc15'
    : selected <= 3 ? '#4ade80'
    : '#facc15';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 gap-6">

      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-3">🪢</div>
        <h1 className="text-2xl font-black text-white mb-1">Ustaw swój Rope</h1>
        <p className="text-slate-500 text-sm">Zanim ruszy timer — wybierz maksymalny poziom WIP</p>
      </div>

      {/* Wyjaśnienie */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Jak działa etap 3?</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Robot będzie klikał za Ciebie — ale tylko gdy WIP jest <strong className="text-green-400">poniżej Twojego limitu</strong>.
          Gdy blat jest pełny, robot zatrzymuje się i czeka aż piec opróżni kolejkę.
        </p>
        <div className="flex items-center gap-2 mt-1 p-2 rounded-xl" style={{ background: '#0d1520', border: '1px solid #1e3a5f' }}>
          <span className="text-base">🥁</span>
          <p className="text-xs text-blue-300">Piec piecze 1 pizzę co 3s. Ustaw limit tak, żeby zawsze miał co robić — ale nie za dużo!</p>
        </div>
      </div>

      {/* Przyciski ROPE */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">
          {selected === null ? '👇 Kliknij żeby wybrać limit WIP' : '✓ Wybrałeś limit'}
        </p>
        <div className="flex gap-2">
          {options.map(v => {
            const key = v === null ? 'inf' : v;
            const isSelected = selected === v;
            const shouldPulse = pulse && selected === null;
            return (
              <button key={key}
                onClick={() => { setSelected(v); setConfirmed(false); }}
                className="flex-1 py-3 rounded-xl font-black text-lg transition-all"
                style={{
                  background: isSelected ? '#f97316' : '#1e293b',
                  color: isSelected ? '#fff' : shouldPulse ? '#f97316' : '#475569',
                  border: isSelected
                    ? '2px solid #fb923c'
                    : shouldPulse
                    ? '2px solid #f9731688'
                    : '2px solid #334155',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(249,115,22,0.5)'
                    : shouldPulse
                    ? '0 0 10px rgba(249,115,22,0.2)'
                    : 'none',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}>
                {v === null ? '∞' : v}
              </button>
            );
          })}
        </div>

        {/* Opis wybranego limitu */}
        {selected !== null && (
          <div className="rounded-xl p-3 text-center transition-all"
            style={{ background: `${descColor}11`, border: `1px solid ${descColor}44` }}>
            <p className="text-sm font-bold" style={{ color: descColor }}>{desc}</p>
          </div>
        )}
      </div>

      {/* Wizualizacja sygnału */}
      {selected !== null && (
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-3 text-center">Jak będzie działał sygnał</p>
          <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '5%', right: '5%', height: 2, background: '#1e293b', borderRadius: 2 }}/>
            <div style={{ position: 'absolute', left: '5%', height: 2, width: '75%', background: '#4ade80', borderRadius: 2, boxShadow: '0 0 6px rgba(74,222,128,0.7)' }}/>
            <div style={{ position: 'absolute', left: '3%', width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.8)', transform: 'translateX(-50%)' }}/>
            <div style={{ position: 'absolute', left: '3%', bottom: '100%', fontSize: 7, color: '#475569', whiteSpace: 'nowrap' }}>WIP &lt; {selected ?? '∞'}</div>
            <div style={{ position: 'absolute', left: '78%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 20, animation: 'robotBounce 0.3s ease-in-out infinite alternate' }}>🤖</div>
            <div style={{ position: 'absolute', right: '3%', width: 10, height: 10, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 8px rgba(249,115,22,0.8)', transform: 'translateX(50%)' }}/>
          </div>
        </div>
      )}

      {/* START */}
      {selected !== null && (
        <button
          onClick={() => onStart(selected)}
          className="w-full max-w-sm py-4 rounded-full font-black text-xl text-white transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg,#f97316,#ea580c)',
            boxShadow: '0 0 30px rgba(249,115,22,0.5)',
          }}>
          🚀 START — Etap 3
        </button>
      )}

      <style>{`
        @keyframes robotBounce { from{transform:translate(-50%,-50%) translateY(0)} to{transform:translate(-50%,-50%) translateY(-5px)} }
      `}</style>
    </div>
  );
};

// ─── E4 SETUP ─────────────────────────────────────────────────────────────────
const E4Setup = ({ onStart }) => {
  const [selected, setSelected] = useState(null);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    if (selected !== null) { setPulse(false); return; }
    const id = setInterval(() => setPulse(p => !p), 600);
    return () => clearInterval(id);
  }, [selected]);

  const options = [null,1,2,3,4,5];

  const desc = selected === null ? null
    : selected === null ? 'Brak limitu — ryzyko maksymalne, LT rośnie bez ograniczeń.'
    : selected <= 2 ? `Limit ${selected} — krótki LT, minimalne ryzyko. Piec może czekać.`
    : selected <= 3 ? `Limit ${selected} — optymalny balans LT i przepływu.`
    : `Limit ${selected} — długi LT, wysokie ryzyko podczas awarii.`;

  const descColor = selected === null ? '#ef4444'
    : selected <= 2 ? '#facc15' : selected <= 3 ? '#4ade80' : '#facc15';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 gap-5">
      <div className="text-center pt-4">
        <div style={{ fontSize:40, marginBottom:8 }}>⚡</div>
        <h1 className="text-2xl font-black mb-1" style={{ background:'linear-gradient(135deg,#7c3aed,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Etap 4 — tryb PRO
        </h1>
        <p className="text-slate-500 text-sm">Teraz widzisz wszystko — ustaw Rope i obserwuj wskaźniki live</p>
      </div>

      {/* Przepływ pizzy */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">🔄 Przepływ pizzy</p>
        <div className="flex items-center gap-1 text-center">
          {[
            { icon:'👆', label:'Tapujesz', sub:'5 tapów', color:'#f97316' },
            { icon:'→', label:'', sub:'', color:'#475569' },
            { icon:'🫓', label:'Blat WIP', sub:'kolejka', color:'#facc15' },
            { icon:'→', label:'', sub:'', color:'#475569' },
            { icon:'🔥', label:'Piec', sub:'3s / pizza', color:'#ef4444' },
            { icon:'→', label:'', sub:'', color:'#475569' },
            { icon:'🍕', label:'Gotowe', sub:'+$100', color:'#4ade80' },
          ].map((s, i) => s.label === '' ? (
            <div key={i} style={{ fontSize:14, color:s.color, flexShrink:0 }}>→</div>
          ) : (
            <div key={i} style={{ flex:1, background:'#0d1520', border:`0.5px solid ${s.color}44`, borderRadius:8, padding:'6px 4px' }}>
              <div style={{ fontSize:16 }}>{s.icon}</div>
              <div style={{ fontSize:8, fontWeight:700, color:s.color }}>{s.label}</div>
              <div style={{ fontSize:7, color:'#475569' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Time */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">⏱ Lead Time — czas przejścia</p>
        <p className="text-sm text-slate-300 leading-relaxed">
          LT to czas od momentu gdy pizza trafia na blat do momentu gdy wychodzi z pieca.
          Każda pizza w kolejce dodaje <strong className="text-orange-400">+3 sekundy</strong> czekania.
        </p>
        <div className="flex gap-2 mt-1">
          {[[1,'3s','#4ade80','WIP=0'],[3,'9s','#eab308','WIP=2'],[6,'18s','#ef4444','WIP=5']].map(([w,lt,c,lbl]) => (
            <div key={w} style={{ flex:1, background:'#0d1520', border:`0.5px solid ${c}44`, borderRadius:8, padding:'6px 4px', textAlign:'center' }}>
              <div style={{ fontSize:13, fontWeight:700, color:c, fontFamily:'monospace' }}>{lt}</div>
              <div style={{ fontSize:7, color:'#475569' }}>{lbl}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">Im mniej WIP → krótszy LT → szybszy przepływ → mniejsze ryzyko podczas awarii.</p>
      </div>

      {/* Rope wybór */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">🪢 Ustaw limit WIP (Rope)</p>
        <div className="flex gap-2">
          {options.map(v => {
            const isSelected = selected === v;
            const shouldPulse = pulse && selected === null;
            return (
              <button key={v ?? 'inf'} onClick={() => setSelected(v)}
                className="flex-1 py-3 rounded-xl font-black text-lg transition-all"
                style={{
                  background: isSelected ? '#7c3aed' : '#1e293b',
                  color: isSelected ? '#fff' : shouldPulse ? '#7c3aed' : '#475569',
                  border: isSelected ? '2px solid #818cf8' : shouldPulse ? '2px solid #7c3aed88' : '2px solid #334155',
                  boxShadow: isSelected ? '0 0 16px rgba(124,58,237,0.5)' : 'none',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                }}>
                {v === null ? '∞' : v}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className="rounded-xl p-3 text-center" style={{ background:`${descColor}11`, border:`1px solid ${descColor}44` }}>
            <p className="text-sm font-bold" style={{ color:descColor }}>{desc}</p>
          </div>
        )}
      </div>

      {selected !== null && (
        <button onClick={() => onStart(selected)}
          className="w-full py-4 rounded-full font-black text-xl text-white transition-all active:scale-95"
          style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow:'0 0 30px rgba(124,58,237,0.5)' }}>
          🚀 START — Etap 4 PRO
        </button>
      )}

      <style>{`@keyframes robotBounce{from{transform:translateX(-50%) translateY(0)}to{transform:translateX(-50%) translateY(-5px)}}`}</style>
    </div>
  );
};

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
const GameScreen = ({ attempt, onFinish, showTrafficLight, initialRope }) => {
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
  const [ropeLimit,    setRopeLimit]   = useState(initialRope ?? 3);
  const [pizzaHistory, setPizzaHistory] = useState([]); // [{lt, id}] ostatnie 3 pizze
  const pizzaIdRef    = useRef(0);
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
          if (attempt >= 4) {
            const lt = (wip + 1) * (OVEN_MS / 1000);
            setPizzaHistory(h => [...h, { id: ++pizzaIdRef.current, lt, baked: nb }]);
          }
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
    const avgLt = pizzaHistory.length > 0 ? Math.round(pizzaHistory.reduce((s,p)=>s+p.lt,0)/pizzaHistory.length) : null;
    return onFinish({
      attempt, balance: finalBalance, maxCps: maxCpsRef.current,
      baked: bakedRef.current, wipAtEnd: finalWip, totalTaps: totalTapsRef.current,
      ropeLimit: attempt >= 3 ? ropeLimit : null,
      avgLt,
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
          <p className="text-[8px] text-slate-600 uppercase tracking-widest">Etap {attempt}/3</p>
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
              {attempt >= 2 && (
                <div className={`flex items-center justify-between px-2 py-1 rounded-lg transition-all duration-300
                  ${wip === 0 || wip > 4 ? 'bg-red-950 border border-red-800' : wip <= 2 ? 'bg-green-950 border border-green-800' : 'bg-yellow-950 border border-yellow-800'}`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                      ${wip === 0 || wip > 4 ? 'bg-red-500' : wip <= 2 ? 'bg-green-400' : 'bg-yellow-400'}`}
                      style={wip > 4 ? { animation: 'pulse 0.6s ease-in-out infinite' } : {}}/>
                    <span className={`text-[9px] font-bold uppercase tracking-wide
                      ${wip === 0 || wip > 4 ? 'text-red-400' : wip <= 2 ? 'text-green-400' : 'text-yellow-400'}`}>
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

          {attempt >= 3 ? (
            <div className="flex flex-col gap-2">
              {/* ROPE regulator — E3 i E4 */}
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

              <div style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '10%', right: '10%', height: 2, background: '#1e293b', borderRadius: 2 }}/>
                <div style={{
                  position: 'absolute', left: '10%', height: 2, borderRadius: 2,
                  width: ropeLimit !== null && wip >= ropeLimit ? '35%' : '80%',
                  background: ropeLimit !== null && wip >= ropeLimit ? '#ef4444' : '#4ade80',
                  boxShadow: ropeLimit !== null && wip >= ropeLimit ? '0 0 6px rgba(239,68,68,0.7)' : '0 0 6px rgba(74,222,128,0.7)',
                  transition: 'all 0.4s ease'
                }}/>
                <div style={{ position: 'absolute', left: '8%', width: 10, height: 10, borderRadius: '50%', background: ropeLimit !== null && wip >= ropeLimit ? '#ef4444' : '#4ade80', transform: 'translateX(-50%)' }}/>
                <div style={{ position: 'absolute', left: '10%', top: 0, fontSize: 7, color: '#475569', textTransform: 'uppercase' }}>WIP</div>
                <div style={{
                  position: 'absolute',
                  left: ropeLimit !== null && wip >= ropeLimit ? '40%' : '82%',
                  top: '50%', transform: 'translate(-50%, -50%)',
                  fontSize: 20,
                  transition: 'left 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                  animation: ropeLimit !== null && wip >= ropeLimit ? 'robotWarn 0.35s ease-in-out infinite alternate' : 'robotBounce 0.2s ease-in-out infinite alternate',
                  zIndex: 2,
                }}>🤖</div>
                <div style={{ position: 'absolute', right: '10%', top: 0, fontSize: 7, color: '#475569', textTransform: 'uppercase' }}>PRZYCISK</div>
                <div style={{ position: 'absolute', right: '8%', width: 10, height: 10, borderRadius: '50%', background: ropeLimit !== null && wip >= ropeLimit ? '#334155' : '#f97316', boxShadow: ropeLimit !== null && wip >= ropeLimit ? 'none' : '0 0 8px rgba(249,115,22,0.8)', transform: 'translateX(50%)' }}/>
              </div>
              {/* PRO wskaźniki — tylko E4 */}
              {attempt >= 4 && (() => {
                const chefOee = Math.min(Math.round((maxCpsRef.current||0)/WORLD_RECORD_CPS*100),100);
                const ovenOee = Math.min(Math.round(baked/Math.floor(PROD_TIME/(OVEN_MS/1000))*100),100);
                const qual    = (baked+wip)===0?100:Math.round(baked/(baked+wip)*100);
                const pizOee  = Math.round(0.67*(ovenOee/100)*(qual/100)*100);
                const estLt   = Math.max(3,(wip+1)*3);
                const ltCol   = estLt<=3?'#4ade80':estLt<=6?'#eab308':'#ef4444';
                const ARC = 85;
                const gauge = (pct) => `${ARC - ARC*Math.min(pct,100)/100}`;
                const ovenCol = ovenOee>=70?'#4ade80':'#f97316';
                const pizCol  = pizOee>=50?'#4ade80':pizOee>=25?'#facc15':'#ef4444';
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                    {/* OEE Zegary */}
                    <div style={{ display:'flex', gap:4 }}>
                      {[
                        { label:'OEE Kucharz', pct:chefOee, col:'#378ADD', sub:`${maxCpsRef.current||0} CPS` },
                        { label:'OEE Piec',    pct:ovenOee, col:ovenCol,   sub:`${baked} z ${Math.floor(PROD_TIME/(OVEN_MS/1000))}` },
                        { label:'OEE Pizz.',   pct:pizOee,  col:pizCol,    sub:'67%×P×J' },
                      ].map(({ label, pct, col, sub }) => (
                        <div key={label} style={{ flex:1, background:'#0d1520', border:'0.5px solid #1e3a5f', borderRadius:10, padding:'6px 4px', display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                          <div style={{ fontSize:6, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'center' }}>{label}</div>
                          <svg width="64" height="36" viewBox="0 0 70 40">
                            <path d="M 8 36 A 27 27 0 0 1 62 36" fill="none" stroke="#1e293b" strokeWidth="7" strokeLinecap="round"/>
                            <path d="M 8 36 A 27 27 0 0 1 62 36" fill="none" stroke={col} strokeWidth="7" strokeLinecap="round"
                              strokeDasharray={ARC} strokeDashoffset={gauge(pct)} style={{ transition:'stroke-dashoffset 0.6s ease' }}/>
                            <text x="35" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill={col} fontFamily="monospace">{pct}%</text>
                          </svg>
                          <div style={{ fontSize:6, color:'#475569' }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                    {/* Lead Time pasek */}
                    <div style={{ background:'#0d1520', border:'0.5px solid #1e3a5f', borderRadius:8, padding:'5px 8px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <span style={{ fontSize:7, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>⏱ Lead Time</span>
                        <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:ltCol }}>{estLt}s</span>
                      </div>
                      <div style={{ height:3, background:'#1e293b', borderRadius:2 }}>
                        <div style={{ height:'100%', borderRadius:2, background:ltCol, width:`${Math.min(estLt/15*100,100)}%`, transition:'all 0.4s' }}/>
                      </div>
                      <div style={{ fontSize:6, color:'#475569', marginTop:2 }}>WIP={wip} → ~{estLt}s czekania</div>
                    </div>
                    {/* Pizze — LT chart bez limitu */}
                    <div style={{ background:'#0d1520', border:'0.5px solid #1e3a5f', borderRadius:8, padding:'5px 8px', display:'flex', flexDirection:'column', gap:3 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:1 }}>
                        <span style={{ fontSize:6, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>LT per pizza</span>
                        <span style={{ fontSize:6, color:'#475569' }}>{pizzaHistory.length} szt.</span>
                      </div>
                      {pizzaHistory.length === 0 && (
                        <div style={{ fontSize:7, color:'#334155', textAlign:'center', padding:'4px 0' }}>czekam na pierwsze wypieczenie...</div>
                      )}
                      {/* LT pizzerii — gruba linia (3x) */}
                      {pizzaHistory.length > 0 && (() => {
                        const avgLt = Math.round(pizzaHistory.reduce((s,p)=>s+p.lt,0)/pizzaHistory.length);
                        const avgCol = avgLt<=3?'#4ade80':avgLt<=6?'#eab308':'#ef4444';
                        return (
                          <div style={{ marginBottom:3 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                              <span style={{ fontSize:6, color:'#475569' }}>avg LT pizzerii</span>
                              <span style={{ fontSize:10, fontWeight:700, fontFamily:'monospace', color:avgCol }}>{avgLt}s</span>
                            </div>
                            <div style={{ height:9, background:'#1e293b', borderRadius:3 }}>
                              <div style={{ height:'100%', borderRadius:3, background:avgCol, width:`${Math.min(avgLt/30*100,100)}%`, transition:'all 0.5s', opacity:0.9 }}/>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Indywidualne pizze */}
                      {pizzaHistory.map((p, idx) => {
                        const lc = p.lt<=3?'#4ade80':p.lt<=6?'#eab308':'#ef4444';
                        return (
                          <div key={p.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <span style={{ fontSize:9, minWidth:14, textAlign:'right', color:'#475569', fontFamily:'monospace' }}>{idx+1}</span>
                            <span style={{ fontSize:9 }}>🍕</span>
                            <div style={{ flex:1, height:3, background:'#1e293b', borderRadius:2 }}>
                              <div style={{ height:'100%', borderRadius:2, background:lc, width:`${Math.min(p.lt/30*100,100)}%`, animation:'proBarIn 0.5s ease-out' }}/>
                            </div>
                            <span style={{ fontSize:8, fontWeight:700, fontFamily:'monospace', color:lc, minWidth:22, textAlign:'right' }}>{p.lt}s</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
        @keyframes proBarIn     { from{width:0} to{width:var(--w)} }
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
  const [initialRope, setInitialRope] = useState(3);
  const MAX_ATTEMPTS = 4;

  const handleFinish = (result) => {
    const h = [...history, result];
    setHistory(h);
    setLastResult(result);
    setPhase('EDU');
  };

  const handleNext  = () => { setPhase('SUMMARY'); };
  const handleGoE4      = () => { setAttempt(4); setPhase('E4_SETUP'); };
  const handleContinue  = () => {
    if (attempt >= MAX_ATTEMPTS) return;
    const next = attempt + 1;
    setAttempt(next);
    if (next === 3) { setPhase('ROPE_SETUP'); }
    else { setPhase('PLAYING'); }
  };
  const handleRetry    = () => { setPhase('PLAYING'); };
  const handleRepeatE3  = () => { setAttempt(3); setPhase('ROPE_SETUP'); };
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
        [ START: ETAP 1 — SPRAWDŹ SIĘ ]
      </button>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  );

  if (phase === 'E4_SETUP') return (
    <E4Setup onStart={(rope) => { setInitialRope(rope); setPhase('PLAYING'); }}/>
  );

  if (phase === 'ROPE_SETUP') return (
    <RopeSetup
      initialRope={initialRope}
      onStart={(rope) => { setInitialRope(rope); setPhase('PLAYING'); }}
    />
  );

  if (phase === 'PLAYING') return (
    <GameScreen key={`${attempt}-${history.length}`} attempt={attempt} onFinish={handleFinish} showTrafficLight={attempt >= 2} initialRope={initialRope}/>
  );

  if (phase === 'EDU') return (
    <EduScreen
      result={lastResult}
      attempt={attempt}
      history={history}
      onNext={handleNext}
    />
  );

  if (phase === 'SUMMARY') return (
    <ResultsTable
      history={history}
      attempt={attempt}
      onRestart={handleRestart}
      onContinue={attempt < MAX_ATTEMPTS ? handleContinue : undefined}
      onRepeatE3={attempt >= 3 ? handleRepeatE3 : undefined}
      onRepeatE4={attempt >= 4 ? () => { setAttempt(4); setPhase('E4_SETUP'); } : undefined}
      onGoE4={attempt === 3 ? handleGoE4 : undefined}
    />
  );

  return null;
}
