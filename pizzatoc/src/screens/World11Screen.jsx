import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OvenSVG } from '../components/game/GameComponents';
import { audio } from '../audio/audio';
import { OVEN_MS, PIZZA_VAL, TAPS_PER_PIZZA, vibrate, fmt } from '../config/constants';

const GAME_DURATION = 20;
const MAX_BAKED = 6;
const COLORS = ['#60a5fa','#38bdf8','#34d399','#4ade80','#a3e635','#facc15','#ef4444'];

// ─── TERMOMETR ────────────────────────────────────────────────────────────────
const ThermometerInline = ({ balance, maxBalance }) => {
  const [segs, setSegs] = useState([]);
  const [fall, setFall] = useState(false);
  const prevRef = useRef(0);
  const idRef   = useRef(0);

  useEffect(() => {
    if (balance > prevRef.current) {
      setFall(true);
      setTimeout(() => {
        setFall(false);
        setSegs(s => [...s, { id: ++idRef.current, color: COLORS[Math.min(s.length, COLORS.length - 1)] }]);
      }, 600);
    }
    prevRef.current = balance;
  }, [balance]);

  const curColor = segs.length > 0 ? segs[segs.length - 1].color : '#1e3a5f';
  const segH = Math.floor(110 / MAX_BAKED);

  return (
    <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 8, color: '#475569' }}>${maxBalance}</span>
      <div style={{ width: 28, height: 110, background: '#0f172a', borderRadius: 14, border: '1px solid #1e293b', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column-reverse' }}>
          {segs.map(s => (
            <div key={s.id} style={{ width: '100%', height: segH, background: s.color, borderTop: '1px solid #020617' }}/>
          ))}
        </div>
        {fall && (
          <div style={{ position: 'absolute', left: '50%', top: 0, fontSize: 12, transform: 'translateX(-50%)', animation: 'pizzaDrop 0.6s ease-in forwards' }}>🍕</div>
        )}
      </div>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: curColor, border: '1.5px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'background 0.4s' }}>🌡️</div>
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: curColor }}>{fmt(balance)}</span>
      <style>{`
        @keyframes pizzaDrop { 0%{top:0;opacity:1;transform:translateX(-50%)} 100%{top:100%;opacity:0;transform:translateX(-50%)} }
      `}</style>
    </div>
  );
};

// ─── WORLD 1.1 SCREEN ─────────────────────────────────────────────────────────
export const World11Screen = ({ onFinish }) => {
  const [timeLeft,     setTimeLeft]     = useState(GAME_DURATION);
  const [balance,      setBalance]      = useState(0);
  const [taps,         setTaps]         = useState(0);
  const [wip,          setWip]          = useState(0);
  const [baked,        setBaked]        = useState(0);
  const [ovenActive,   setOvenActive]   = useState(false);
  const [ovenProgress, setOvenProgress] = useState(0);
  const [pizzaPhase,   setPizzaPhase]   = useState('hidden');

  const balanceRef      = useRef(0);
  const wipRef          = useRef(0);
  const bakedRef        = useRef(0);
  const finishedRef     = useRef(false);
  const lastTapRef      = useRef(0);
  const ovenRef         = useRef(false);
  const ovenTimerRef    = useRef(null);
  const progIntervalRef = useRef(null);

  const updBalance = v => { balanceRef.current = v; setBalance(v); };
  const updWip     = v => { wipRef.current = v;     setWip(v); };
  const updBaked   = v => { bakedRef.current = v;   setBaked(v); };

  const runOven = useRef(null);
  runOven.current = () => {
    if (finishedRef.current) return;
    if (wipRef.current > 0) {
      updWip(wipRef.current - 1);
      setOvenActive(true);
      ovenRef.current = true;
      setPizzaPhase('enter');
      audio.whoosh?.();
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
        audio.ching?.();
        setTimeout(() => {
          setPizzaPhase('hidden');
          setOvenActive(false);
          ovenRef.current = false;
          setOvenProgress(0);
          updBaked(bakedRef.current + 1);
          updBalance(balanceRef.current + PIZZA_VAL);
          audio.plop?.();
          vibrate([50, 30, 50]);
          setTimeout(() => runOven.current(), 300);
        }, 500);
      }, OVEN_MS);
    } else {
      ovenTimerRef.current = setTimeout(() => runOven.current(), 100);
    }
  };

  useEffect(() => {
    runOven.current();
    return () => {
      if (ovenTimerRef.current)    clearTimeout(ovenTimerRef.current);
      if (progIntervalRef.current) clearInterval(progIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next <= 0 && !finishedRef.current) {
          finishedRef.current = true;
          clearInterval(id);
          if (ovenTimerRef.current)    clearTimeout(ovenTimerRef.current);
          if (progIntervalRef.current) clearInterval(progIntervalRef.current);
          onFinish({
            attempt: 0,
            balance: balanceRef.current,
            baked:   bakedRef.current,
            wipAtEnd: wipRef.current,
            maxCps: 0, totalTaps: 0, ropeLimit: null, avgLt: null,
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleTap = useCallback(() => {
    if (finishedRef.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < 20) return;
    lastTapRef.current = now;
    audio.tap?.();
    setTaps(t => {
      const next = t + 1;
      if (next >= TAPS_PER_PIZZA) {
        updWip(wipRef.current + 1);
        audio.pizza?.();
        return 0;
      }
      return next;
    });
  }, []);

  const ringSegs = Array.from({ length: 4 }, (_, i) => {
    const r = 68, ri = 52, gap = 4;
    const a1 = (i * 90 - 90) * Math.PI / 180;
    const a2 = ((i + 1) * 90 - 90 - gap) * Math.PI / 180;
    const x1 = r*Math.cos(a1),   y1 = r*Math.sin(a1);
    const x2 = r*Math.cos(a2),   y2 = r*Math.sin(a2);
    const xi1 = ri*Math.cos(a1), yi1 = ri*Math.sin(a1);
    const xi2 = ri*Math.cos(a2), yi2 = ri*Math.sin(a2);
    return (
      <path key={i}
        d={`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 0 0 ${xi1} ${yi1} Z`}
        fill={i < taps ? '#f97316' : '#1e293b'}
        opacity={i < taps ? 1 : 0.5}
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
          <p className="text-[8px] text-slate-600 uppercase tracking-widest">Świat 1.1</p>
          <div className={`text-4xl font-black font-mono tabular-nums leading-none ${timeLeft <= 10 ? 'text-orange-400' : 'text-white'}`}>
            {timeLeft}<span className="text-sm text-slate-500">s</span>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex-1 bg-orange-950 border border-orange-900 rounded-2xl p-2 min-h-[110px] flex flex-col gap-1">
          <span className="text-[7px] text-orange-800 uppercase tracking-widest font-bold">⬤ Surowe</span>
          <div className="flex flex-wrap gap-1 flex-1 items-start content-start">
            {wip === 0 && <span className="text-orange-900 text-[9px] italic">pusty blat</span>}
            {[...Array(Math.min(wip, 12))].map((_, i) => (
              <div key={i} className="w-5 h-5 rounded-full border border-orange-700 bg-orange-950 flex items-center justify-center text-[10px]">🫓</div>
            ))}
            {wip > 12 && <span className="text-orange-400 text-[9px] font-bold">+{wip - 12}</span>}
          </div>
          <span className="text-[8px] text-orange-800">{wip} szt.</span>
        </div>

        <div className="flex flex-col items-center flex-shrink-0">
          <OvenSVG active={ovenActive} progress={ovenProgress} pizzaPhase={pizzaPhase}/>
        </div>

        <ThermometerInline balance={balance} maxBalance={MAX_BAKED * PIZZA_VAL}/>
      </div>

      <div style={{ flex: 1 }}/>

      <div className="flex flex-col items-center gap-1">
        <div className="relative w-36 h-36">
          <svg width="144" height="144" style={{ position: 'absolute', top: 0, left: 0 }}>
            <g transform="translate(72,72)">{ringSegs}</g>
          </svg>
          <button
            onMouseDown={handleTap}
            onTouchStart={e => { e.preventDefault(); handleTap(); }}
            className="absolute inset-3 rounded-full border-4 border-orange-300 shadow-2xl bg-gradient-to-br from-orange-500 to-red-700 flex flex-col items-center justify-center active:scale-95 transition-transform">
            <span className="text-3xl">🍕</span>
            <span className="font-black text-xs text-white">KLEPIEMY!</span>
          </button>
        </div>
        <p className="text-[8px] text-slate-700 uppercase tracking-widest">{taps}/{TAPS_PER_PIZZA} tapów</p>
        <p className="text-[8px] text-slate-400 uppercase tracking-widest">World11Screen</p>
      </div>

    </div>
  );
};
