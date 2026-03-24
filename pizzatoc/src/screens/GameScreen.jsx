import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  GAME_DURATION, OUTAGE_START, PROD_TIME, PIZZA_VAL, PENALTY_RATE,
  OVEN_MS, TAPS_PER_PIZZA, WORLD_RECORD_CPS, MAX_BY_OVEN, fmt, vibrate
} from '../config/constants';
import { audio } from '../audio/audio';
import { OvenSVG, TrafficLightMini, OutageScreen } from '../components/game/GameComponents';

export const GameScreen = ({ attempt, onFinish, showTrafficLight, initialRope }) => {
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
  const pizzaIdRef      = useRef(0);
  const autoIntervalRef = useRef(null);
  const robotTapsRef    = useRef(0); // taps wykonane przez robota
  const robotBlockedRef = useRef(false);

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
      robotBlockedRef.current = !withinLimit;
      if (withinLimit && !outageRef.current && !finishedRef.current) {
        handleTap();
        robotTapsRef.current += 1;
      }
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
                const elapsed = Math.max(1, GAME_DURATION - timeLeft);
                // OEE Kucharz: taps robota vs max możliwe w czasie gry
                const maxPossibleTaps = elapsed * WORLD_RECORD_CPS;
                const chefOee = Math.min(Math.round(robotTapsRef.current / maxPossibleTaps * 100), 100);
                // OEE Piec: upieczone vs max możliwe w czasie produkcji (nie całej gry)
                const prodElapsed = Math.min(elapsed, PROD_TIME);
                const maxByOvenSoFar = Math.max(1, Math.floor(prodElapsed / (OVEN_MS/1000)));
                const ovenOee = Math.min(Math.round(baked / maxByOvenSoFar * 100), 100);
                // OEE Pizzeria: Dostępność × Wydajność × Jakość
                // Dostępność live = czas produkcji / czas całkowity (awaria obniża)
                const availOee = Math.round(Math.min(prodElapsed, PROD_TIME) / GAME_DURATION * 100);
                // Jakość live = 100% dopóki nie było awarii (WIP jeszcze nie przepadł)
                const qualOee = powerOutage ? Math.round(baked / Math.max(1, baked + wip) * 100) : 100;
                const pizOee  = Math.round((availOee/100) * (ovenOee/100) * (qualOee/100) * 100);
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
                        { label:'OEE Kucharz', pct:chefOee, col:robotBlockedRef.current?'#ef4444':'#378ADD', sub:robotBlockedRef.current?'⛔ stoi':`${robotTapsRef.current} tapów` },
                        { label:'OEE Piec',    pct:ovenOee, col:ovenCol,   sub:`${baked} z ${Math.floor(PROD_TIME/(OVEN_MS/1000))}` },
                        { label:'OEE Pizz.',   pct:pizOee,  col:pizCol,    sub:`${availOee}%×${ovenOee}%×${qualOee}%` },
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
        @keyframes screenShake  { 0%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(8px)} 45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 75%{transform:translateX(-3px)} 100%{transform:translateX(0)} }
        @keyframes floatPenalty { 0%{transform:translateX(-50%) translateY(0);opacity:1} 100%{transform:translateX(-50%) translateY(-28px);opacity:0} }
        @keyframes autoPress    { from{transform:scale(1)} to{transform:scale(0.88)} }
        @keyframes robotBounce  { from{transform:translateX(-50%) translateY(0)} to{transform:translateX(-50%) translateY(-6px)} }
        @keyframes robotWarn    { from{transform:translateX(-50%) translateY(0) rotate(-10deg)} to{transform:translateX(-50%) translateY(-8px) rotate(10deg)} }
        @keyframes proBarIn     { from{width:0} to{width:var(--w)} }
      `}</style>
    </div>
  );
};