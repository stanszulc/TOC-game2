import React, { useState, useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';
import { PENALTY_RATE } from '../../config/constants';
import { audio } from '../../audio/audio';

// ─── OVEN SVG ─────────────────────────────────────────────────────────────────
export const OvenSVG = ({ active, progress, pizzaPhase }) => {
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
export const TrafficLightMini = ({ ovenActive }) => (
  <div style={{ display: 'flex', gap: 5, marginBottom: 4, justifyContent: 'center' }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: !ovenActive ? '#22c55e' : '#1e293b', boxShadow: !ovenActive ? '0 0 8px rgba(74,222,128,0.9)' : 'none', transition: 'all 0.3s' }}/>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: ovenActive ? '#ef4444' : '#1e293b', boxShadow: ovenActive ? '0 0 8px rgba(239,68,68,0.9)' : 'none', transition: 'all 0.3s' }}/>
  </div>
);

// ─── WIP PIZZA ITEM ───────────────────────────────────────────────────────────
export const WipPizzaItem = ({ index, onExplode }) => {
  const [phase, setPhase]     = useState('alive');
  const [showNum, setShowNum] = useState(false);
  const triggered             = useRef(false);

  useEffect(() => {
    if (onExplode) onExplode(index, () => {
      if (triggered.current) return;
      triggered.current = true;
      setPhase('dying');
      setShowNum(true);
      setTimeout(() => { setPhase('gone'); setShowNum(false); }, 400);
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
export const OutageScreen = ({ wip, onUnlock, timeLeft, onBalanceUpdate }) => {
  const [locked, setLocked]       = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [flash, setFlash]         = useState(true);
  const [totalLoss, setTotalLoss] = useState(0);
  const [exploded, setExploded]   = useState(0);
  const wipCount                  = useRef(wip);
  const triggers                  = useRef({});

  useEffect(() => {
    const flashTimers = [
      setTimeout(() => setFlash(false), 80),
      setTimeout(() => setFlash(true),  160),
      setTimeout(() => setFlash(false), 240),
      setTimeout(() => setFlash(true),  320),
      setTimeout(() => setFlash(false), 400),
    ];
    const beatTimers = Array.from({ length: wipCount.current }, (_, i) =>
      setTimeout(() => {
        audio.cash();
        const trigger = triggers.current[i];
        if (trigger) trigger();
        setTotalLoss(t => t + PENALTY_RATE);
        setExploded(e => e + 1);
        onBalanceUpdate && onBalanceUpdate(PENALTY_RATE);
      }, 300 + i * 200)
    );
    return () => { [...flashTimers, ...beatTimers].forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(id); setLocked(false); return 0; }
      return c - 1;
    }), 700);
    return () => clearInterval(id);
  }, []);

  const count = wipCount.current;

  return (
    <div onClick={!locked ? onUnlock : undefined}
      className="flex flex-col items-center justify-center py-4 gap-3 text-center"
      style={{ cursor: locked ? 'default' : 'pointer', animation: 'screenShake 0.4s ease-out' }}>
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
