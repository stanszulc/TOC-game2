import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pizza, RotateCcw, Trophy, Zap, TrendingDown, ChevronRight, BarChart2, X } from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GAME_DURATION   = 30;
const OUTAGE_START    = 10;
const PROD_TIME       = GAME_DURATION - OUTAGE_START;
const PIZZA_VAL       = 100;
const PENALTY_RATE    = 30;
const OVEN_MS         = 3000;
const TAPS_PER_PIZZA  = 10;
const WORLD_RECORD_CPS = 10;

const fmt  = (n) => (n < 0 ? `-$${Math.abs(n)}` : `$${n}`);
const pct  = (v, max) => Math.round(Math.min(v / max, 1) * 100);
const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

const calcOee = (r) => {
  const chefOee    = pct(r.maxCps, WORLD_RECORD_CPS);
  const ovenOee    = pct(r.baked * (OVEN_MS / 1000), PROD_TIME);
  const maxByChef  = Math.floor((r.totalTaps || 0) / TAPS_PER_PIZZA);
  const maxByOven  = Math.floor(PROD_TIME / (OVEN_MS / 1000));
  const lost       = maxByOven - r.baked;
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

// ─── DUAL GAUGE ───────────────────────────────────────────────────────────────
const DualGauge = ({ label, unit, value, maxValue, sessionBest, worldMax, colorFn, size = 120 }) => {
  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.42;
  const rInner = size * 0.30;
  const circ   = (r) => 2 * Math.PI * r;
  const ARC    = 0.75;
  const offset = (r) => circ(r) * (1 - ARC) / 2;
  const curPct  = Math.min(value / worldMax, 1);
  const bestPct = Math.min((sessionBest || 0) / worldMax, 1);
  const color   = colorFn(curPct);
  const arc = (r, p) => p * circ(r) * ARC;
  const pctNum   = Math.round(curPct * 100);
  const bestPctN = Math.round(bestPct * 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(135deg)' }}>
          <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#1e293b" strokeWidth={size * 0.055}
            strokeDasharray={`${circ(rOuter) * ARC} ${circ(rOuter)}`} strokeDashoffset={-offset(rOuter)} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="#1e293b" strokeWidth={size * 0.07}
            strokeDasharray={`${circ(rInner) * ARC} ${circ(rInner)}`} strokeDashoffset={-offset(rInner)} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#475569" strokeWidth={size * 0.045}
            strokeDasharray={`${arc(rOuter, bestPct)} ${circ(rOuter)}`} strokeDashoffset={-offset(rOuter)} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.3s' }} />
          <circle cx={cx} cy={cy} r={rInner} fill="none" stroke={color} strokeWidth={size * 0.07}
            strokeDasharray={`${arc(rInner, curPct)} ${circ(rInner)}`} strokeDashoffset={-offset(rInner)} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.12s, stroke 0.3s' }} />
        </svg>
        <div className="absolute flex flex-col items-center leading-none text-center">
          <span className="font-black leading-none" style={{ fontSize: size * 0.19, color }}>{pctNum}%</span>
          <span style={{ fontSize: size * 0.09 }} className="text-slate-500 mt-0.5">{value}{unit}</span>
          {bestPctN > 0 && bestPctN !== pctNum && (
            <span style={{ fontSize: size * 0.08 }} className="text-slate-600 mt-0.5">↑{bestPctN}%</span>
          )}
        </div>
      </div>
      <p className="text-[9px] text-slate-500 uppercase tracking-widest">{label}</p>
    </div>
  );
};

// ─── TRAFFIC LIGHT ────────────────────────────────────────────────────────────
const TrafficLight = ({ ovenActive, powerOutage }) => (
  <div className="flex flex-col items-center gap-2 bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-xl flex-shrink-0">
    <div className={`w-7 h-7 rounded-full border-2 transition-all duration-300 ${
      !powerOutage && !ovenActive ? 'bg-green-400 border-green-300 shadow-[0_0_14px_3px_rgba(74,222,128,0.7)]' : 'bg-slate-800 border-slate-700 opacity-20'}`} />
    <div className={`w-7 h-7 rounded-full border-2 transition-all duration-300 ${
      powerOutage || ovenActive ? 'bg-red-500 border-red-300 shadow-[0_0_14px_3px_rgba(239,68,68,0.8)]' : 'bg-slate-800 border-slate-700 opacity-20'}`} />
    <span className="text-[7px] text-slate-700 uppercase tracking-widest mt-0.5">PIEC</span>
  </div>
);

// ─── OUTAGE SCREEN ────────────────────────────────────────────────────────────
const OutageScreen = ({ wip, onUnlock, timeLeft }) => {
  const [locked, setLocked]       = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [flash, setFlash]         = useState(true);

  useEffect(() => {
    const timers = [
      setTimeout(() => setFlash(false), 160),
      setTimeout(() => setFlash(true),  320),
      setTimeout(() => setFlash(false), 480),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(id); setLocked(false); return 0; }
      return c - 1;
    }), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <div onClick={!locked ? onUnlock : undefined}
      className="flex flex-col items-center justify-center py-6 gap-4 text-center"
      style={{ cursor: locked ? 'default' : 'pointer' }}>
      {flash && <div className="fixed inset-0 bg-red-600 opacity-50 pointer-events-none z-50" />}
      <Zap size={60} className="text-red-500" style={{ animation: 'pulse 0.6s ease-in-out infinite' }} />
      <h2 className="text-4xl font-black text-red-500">AWARIA PRĄDU!</h2>
      {wip > 0 && (
        <div className="bg-red-950 border border-red-800 rounded-2xl px-6 py-3">
          <div className="flex items-center gap-2 text-red-400 text-xl font-black animate-pulse">
            <TrendingDown size={20} /> ${wip * PENALTY_RATE} / sek
          </div>
          <p className="text-red-700 text-xs mt-1">{wip} WIP × ${PENALTY_RATE}</p>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
        {[...Array(Math.min(wip, 16))].map((_, i) => (
          <div key={i} className="w-8 h-8 rounded-full bg-red-900 border-2 border-red-600 flex items-center justify-center text-sm animate-bounce"
            style={{ animationDelay: `${i * 55}ms` }}>🍕</div>
        ))}
      </div>
      <div className="mt-4">
        {locked
          ? <div className="flex flex-col items-center gap-1">
              <span className="text-6xl font-black text-slate-700">{countdown}</span>
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
          <div style={tileStyle(ca)}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: ca.text, marginBottom: 6 }}>Dostępność</div>
            <div style={{ fontSize: 30, fontWeight: 500, color: ca.text, lineHeight: 1, marginBottom: 6 }}>{avail}%</div>
            <div style={{ fontSize: 11, color: ca.desc, lineHeight: 1.4 }}>20s z 30s<br/>piec mógł pracować</div>
            <div style={{ fontSize: 10, color: '#f87171', marginTop: 4 }}>10s = awaria prądu</div>
          </div>
          <div style={tileStyle(cp)}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: cp.text, marginBottom: 6 }}>Wydajność</div>
            <div style={{ fontSize: 30, fontWeight: 500, color: cp.text, lineHeight: 1, marginBottom: 6 }}>{perf}%</div>
            <div style={{ fontSize: 11, color: cp.desc, lineHeight: 1.4 }}>{r.baked} z {MAX_BY_OVEN} możliwych<br/>cykli pieca</div>
            <div style={{ fontSize: 10, color: cp.sub, marginTop: 4 }}>max = floor(20÷3) = {MAX_BY_OVEN}</div>
          </div>
          <div style={tileStyle(cq)}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: cq.text, marginBottom: 6 }}>Jakość</div>
            <div style={{ fontSize: 30, fontWeight: 500, color: cq.text, lineHeight: 1, marginBottom: 6 }}>{qual}%</div>
            <div style={{ fontSize: 11, color: cq.desc, lineHeight: 1.4 }}>{r.baked} dobrych z {total}<br/>wyprodukowanych</div>
            <div style={{ fontSize: 10, color: '#f87171', marginTop: 4 }}>{r.wipAtEnd} WIP = NOK (scrap)</div>
          </div>
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
          <div style={{ height: 1, background: '#2a3150', marginBottom: 12 }} />
          <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#378ADD', marginBottom: 10 }}>Trzy pytania = trzy składniki</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { icon: '⚡', name: 'Czy działał?', c: ca, lines: [`Czas pracy ÷ czas całkowity`, `20 ÷ 30 = ${avail}%`, 'awaria zabrała 33%'], lc: ['#8890aa', ca.text, '#f87171'] },
              { icon: '⏱️', name: 'Czy piekł w rytmie?', c: cp, lines: [`Upieczone ÷ max możliwe`, `${r.baked} ÷ ${MAX_BY_OVEN} = ${perf}%`, 'piec bił równo co 3s'], lc: ['#8890aa', cp.text, '#4ade80'] },
              { icon: '✅', name: 'Czy trafiło do klienta?', c: cq, lines: [`Sprzedane ÷ wszystkie wytworzone`, `${r.baked} ÷ ${total} = ${qual}%`, `${r.wipAtEnd} WIP = scrap`], lc: ['#8890aa', cq.text, '#f87171'] },
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
              <span style={{ color: ca.text }}>{avail}%</span>
              <span style={{ color: '#4a5270' }}>×</span>
              <span style={{ color: cp.text }}>{perf}%</span>
              <span style={{ color: '#4a5270' }}>×</span>
              <span style={{ color: cq.text }}>{qual}%</span>
              <span style={{ color: '#4a5270' }}>=</span>
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

// ─── OEE ANALYSIS MODAL ───────────────────────────────────────────────────────
const OeeAnalysis = ({ history, onClose }) => (
  <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
    <div className="min-h-screen p-5 flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-2xl font-black text-white">Analiza OEE</h2>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Overall Equipment Effectiveness · Pizzeria</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700">
          <X size={18} className="text-slate-400" />
        </button>
      </div>
      <div className="space-y-0">
        {history.map(r => <OeePanel key={r.attempt} r={r} />)}
      </div>
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
      {showOee && <OeeAnalysis history={history} onClose={() => setShowOee(false)} />}
      <Trophy size={44} className="text-yellow-400 mb-3" />
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
                <span className="font-bold text-sm flex items-center gap-1">
                  {isBest && <Trophy size={10} className="text-yellow-400" />}#{r.attempt}
                </span>
                <span className={`text-center font-black text-sm ${r.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>{fmt(r.balance)}</span>
                <span className="text-center text-blue-400 font-bold text-sm">{r.maxCps}</span>
                <span className="text-center text-slate-200 text-sm">{r.baked}</span>
                <span className={`text-center text-sm font-bold ${r.wipAtEnd > 0 ? 'text-red-400' : 'text-slate-500'}`}>{r.wipAtEnd}</span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-800">
                <div className="bg-slate-950 px-3 py-1 flex items-center gap-2">
                  <span className="text-[9px] text-slate-600">Kucharz</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${chefOee}%` }} />
                  </div>
                  <span className="text-[9px] text-blue-400 font-bold">{chefOee}%</span>
                </div>
                <div className="bg-slate-950 px-3 py-1 flex items-center gap-2">
                  <span className="text-[9px] text-slate-600">Piec</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${ovenOee}%` }} />
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
          <BarChart2 size={18} className="text-orange-400" /> Analiza OEE
        </button>
        <button onClick={onRestart}
          className="flex items-center justify-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-black text-base hover:bg-orange-400 transition-colors">
          <RotateCcw size={16} /> Zagraj ponownie
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
        {isLast ? <><Trophy size={18} /> Wyniki końcowe</> : <><ChevronRight size={18} /> Próba {attempt + 1}</>}
      </button>
    </div>
  );
};

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
const GameScreen = ({ attempt, onFinish, showTrafficLight, sessionBestCps }) => {
  const [timeLeft,    setTimeLeft]    = useState(GAME_DURATION);
  const [balance,     setBalance]     = useState(0);
  const [taps,        setTaps]        = useState(0);
  const [wip,         setWip]         = useState(0);
  const [ovenActive,  setOvenActive]  = useState(false);
  const [cps,         setCps]         = useState(0);
  const [maxCps,      setMaxCps]      = useState(0);
  const [ovenOeePct,  setOvenOeePct]  = useState(0);
  const [baked,       setBaked]       = useState(0);
  const [powerOutage, setPowerOutage] = useState(false);
  const [showOutage,  setShowOutage]  = useState(false);

  const balanceRef   = useRef(0);
  const wipRef       = useRef(0);
  const ovenRef      = useRef(false);
  const bakedRef     = useRef(0);
  const maxCpsRef    = useRef(0);
  const totalTapsRef = useRef(0);
  const ovenWorkMs   = useRef(0);
  const tapTimes     = useRef([]);
  const finishedRef  = useRef(false);
  const outageRef    = useRef(false);
  const gameStartRef = useRef(Date.now());

  const updBalance = (v) => { balanceRef.current = v; setBalance(v); };
  const updWip     = (v) => { wipRef.current = v;     setWip(v); };
  const updOven    = (v) => { ovenRef.current = v;    setOvenActive(v); };
  const updBaked   = (v) => { bakedRef.current = v;   setBaked(v); };

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      tapTimes.current = tapTimes.current.filter(t => now - t < 1000);
      const c = tapTimes.current.length;
      setCps(c);
      if (c > maxCpsRef.current) { maxCpsRef.current = c; setMaxCps(c); }
      const elapsed = Math.min((now - gameStartRef.current) / 1000, PROD_TIME);
      if (elapsed > 0) {
        const workSec = bakedRef.current * (OVEN_MS / 1000);
        setOvenOeePct(Math.round(Math.min(workSec / elapsed, 1) * 100));
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const ovenTimerRef = useRef(null);
  const runOven = useRef(null);
  runOven.current = () => {
    if (outageRef.current || finishedRef.current) return;
    if (wipRef.current > 0) {
      updWip(wipRef.current - 1);
      updOven(true);
      ovenTimerRef.current = setTimeout(() => {
        updOven(false);
        const nb = bakedRef.current + 1;
        updBaked(nb);
        updBalance(balanceRef.current + PIZZA_VAL);
        ovenWorkMs.current += OVEN_MS;
        audio.baked();
        runOven.current();
      }, OVEN_MS);
    } else {
      ovenTimerRef.current = setTimeout(() => runOven.current(), 100);
    }
  };

  useEffect(() => {
    if (outageRef.current) return;
    runOven.current();
    return () => { if (ovenTimerRef.current) clearTimeout(ovenTimerRef.current); };
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
        }
        if (next <= OUTAGE_START && outageRef.current && wipRef.current > 0) {
          updBalance(balanceRef.current - wipRef.current * PENALTY_RATE);
          vibrate(80);
        }
        if (next <= 0 && !finishedRef.current) {
          finishedRef.current = true;
          clearInterval(id);
          doFinish();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const doFinish = () => onFinish({
    attempt, balance: balanceRef.current, maxCps: maxCpsRef.current,
    baked: bakedRef.current, wipAtEnd: wipRef.current, totalTaps: totalTapsRef.current,
  });

  const handleOutageUnlock = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    doFinish();
  };

  const handleTap = useCallback(() => {
    if (outageRef.current || finishedRef.current) return;
    audio.tap();
    totalTapsRef.current += 1;
    tapTimes.current.push(Date.now());
    setTaps(t => {
      const next = t + 1;
      if (next >= TAPS_PER_PIZZA) {
        updWip(wipRef.current + 1);
        audio.pizza();
        vibrate(35);
        return 0;
      }
      return next;
    });
  }, []);

  const isOutage = timeLeft <= OUTAGE_START;
  const timePct  = timeLeft / GAME_DURATION;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 font-sans select-none">
      <div className="flex items-center justify-between mb-4 gap-2">
        <DualGauge label="Kucharz OEE" unit=" CPS" value={cps} maxValue={WORLD_RECORD_CPS}
          sessionBest={maxCps} worldMax={WORLD_RECORD_CPS} size={110}
          colorFn={(p) => p > 0.75 ? '#22c55e' : p > 0.45 ? '#f97316' : '#ef4444'} />
        <div className="flex flex-col items-center flex-1 gap-1 min-w-0">
          <p className="text-[8px] text-slate-600 uppercase tracking-widest">Próba {attempt}/3</p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${isOutage ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${timePct * 100}%` }} />
          </div>
          <div className={`text-5xl font-black font-mono tabular-nums leading-none mt-1
            ${isOutage ? 'text-red-500 animate-pulse' : timeLeft <= 15 ? 'text-orange-400' : 'text-white'}`}>
            {timeLeft}<span className="text-base text-slate-500">s</span>
          </div>
          {isOutage && <div className="flex items-center gap-1 text-red-500 text-[9px]"><Zap size={9} /> AWARIA</div>}
          <div className="text-right w-full mt-1">
            <p className={`text-xl font-black ${balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>{fmt(balance)}</p>
            <p className="text-[9px] text-slate-600">🍕 {baked}</p>
          </div>
        </div>
        <DualGauge label="Piec OEE" unit="%" value={ovenOeePct} maxValue={100}
          sessionBest={null} worldMax={100} size={110}
          colorFn={(p) => p > 0.7 ? '#22c55e' : p > 0.4 ? '#f97316' : '#ef4444'} />
      </div>

      {showOutage ? (
        <OutageScreen wip={wip} onUnlock={handleOutageUnlock} timeLeft={timeLeft} />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 mt-1">
            {showTrafficLight && <TrafficLight ovenActive={ovenActive} powerOutage={powerOutage} />}
            <div className={`w-28 h-40 rounded-t-full border-8 flex flex-col items-center justify-center relative
              transition-all duration-300 shadow-2xl
              ${ovenActive ? 'border-orange-500 bg-gradient-to-t from-red-950 to-slate-900 scale-105' : 'border-slate-700 bg-slate-900'}`}>
              {ovenActive
                ? <Pizza size={46} className="text-orange-400" style={{ animation: 'spin 3s linear infinite' }} />
                : <span className="text-slate-800 font-black text-[9px] uppercase">Idle</span>}
              <div className="absolute -bottom-4 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full text-[8px] font-bold text-slate-500 whitespace-nowrap">
                WĄSKIE GARDŁO · 3s
              </div>
            </div>
          </div>
          <div className="w-full max-w-xs mt-1">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest text-center mb-1">
              WIP: {wip} · tap: {taps}/{TAPS_PER_PIZZA}
            </p>
            <div className="bg-black/40 border border-slate-800 rounded-xl p-2 min-h-9 flex flex-wrap gap-1 justify-center items-center">
              {wip === 0 && <span className="text-slate-800 text-xs italic">pusty blat</span>}
              {[...Array(Math.min(wip, 20))].map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-orange-900 border border-orange-700 flex items-center justify-center text-[10px]">🍕</div>
              ))}
            </div>
            <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-75"
                style={{ width: `${(taps / TAPS_PER_PIZZA) * 100}%` }} />
            </div>
          </div>

          {/* ── TAP BUTTON — onTouchStart dla natychmiastowej reakcji na mobile ── */}
          <button
            onMouseDown={handleTap}
            onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-red-700
              border-8 border-orange-300 shadow-2xl active:scale-90 transition-transform duration-75
              flex flex-col items-center justify-center">
            <span className="text-4xl">🍕</span>
            <span className="font-black text-sm text-white">KLEPIEMY!</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </div>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function PizzaTOC() {
  const [phase,          setPhase]          = useState('START');
  const [attempt,        setAttempt]        = useState(1);
  const [history,        setHistory]        = useState([]);
  const [lastResult,     setLastResult]     = useState(null);
  const [sessionBestCps, setSessionBestCps] = useState(0);
  const MAX_ATTEMPTS = 3;

  const handleFinish = (result) => {
    const h = [...history, result];
    setHistory(h);
    setLastResult(result);
    if (result.maxCps > sessionBestCps) setSessionBestCps(result.maxCps);
    setPhase(attempt >= MAX_ATTEMPTS ? 'FINAL' : 'ATTEMPT_RESULT');
  };

  const handleNext    = () => { setAttempt(a => a + 1); setPhase('PLAYING'); };
  const handleRestart = () => { setPhase('START'); setAttempt(1); setHistory([]); setLastResult(null); setSessionBestCps(0); };

  if (phase === 'START') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
      <div className="text-7xl mb-4 animate-bounce">🍕</div>
      <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">PIZZERIA TOC</h1>
      <p className="text-slate-400 max-w-sm mb-3 leading-relaxed text-sm">
        <strong className="text-white">3 próby</strong> × 30 sekund.<br/>
        20s produkcja · 10s <span className="text-red-400 font-bold">awaria prądu</span><br/>
        WIP podczas awarii = strata!
      </p>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-xs mb-7 text-xs text-slate-500 text-left space-y-1.5">
        <p>• 10 tapów → 1 pizza na blat (WIP)</p>
        <p>• Piec: 1 pizza co 3s → <strong className="text-orange-400">+$100</strong></p>
        <p>• Awaria: WIP = <strong className="text-red-400">-${PENALTY_RATE}/szt/s</strong></p>
        <p>• OEE kucharza: Twój CPS vs rekord świata (10 CPS)</p>
        <p>• OEE pieca: ile czasu faktycznie pracował</p>
        <p>• Próba 3: sygnalizator pieca 🚦</p>
      </div>
      <button onClick={() => setPhase('PLAYING')}
        className="bg-orange-500 hover:bg-orange-400 px-12 py-4 rounded-full font-black text-xl transition-colors">
        START PRÓBA 1
      </button>
    </div>
  );

  if (phase === 'PLAYING') return (
    <GameScreen key={attempt} attempt={attempt} onFinish={handleFinish}
      showTrafficLight={attempt >= 3} sessionBestCps={sessionBestCps} />
  );

  if (phase === 'ATTEMPT_RESULT') return (
    <AttemptResult result={lastResult} attempt={attempt} onNext={handleNext} isLast={attempt >= MAX_ATTEMPTS} />
  );

  if (phase === 'FINAL') return (
    <ResultsTable history={history} onRestart={handleRestart} />
  );

  return null;
}
