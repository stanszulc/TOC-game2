import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

// ─── SHARED START BUTTON ──────────────────────────────────────────────────────
export const StartButton = ({ onClick, label }) => (
  <button onClick={onClick}
    className="w-full py-4 rounded-full font-black text-xl text-white transition-all active:scale-95 flex items-center justify-center gap-2"
    style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 0 24px rgba(249,115,22,0.4)' }}>
    <ChevronRight size={20}/> {label}
  </button>
);

// ─── CHEF TIP ─────────────────────────────────────────────────────────────────
export const ChefTip = ({ children }) => (
  <div style={{ background: '#071428', border: '1px solid #1e3a5f', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
    <span style={{ fontSize: 22, flexShrink: 0 }}>👨‍🍳</span>
    <p style={{ fontSize: 13, color: '#93c5fd', lineHeight: 1.6 }}>{children}</p>
  </div>
);

// ─── E2 INTRO ─────────────────────────────────────────────────────────────────
export const E2Intro = ({ onStart }) => (
  <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 gap-5">
    <div className="text-center pt-6">
      <div style={{ fontSize: 44, marginBottom: 12 }}>👀</div>
      <h1 className="text-2xl font-black mb-2">Obserwuj sygnały</h1>
      <p className="text-slate-500 text-sm">Etap 2 — tym razem blat podpowie kiedy zwolnić</p>
    </div>

    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">🎨 Co zobaczysz na blacie</p>
      {[
        { dot: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  title: 'Zielony — bezpieczny poziom',   sub: 'WIP 1–2 → piec ma co robić, bufor OK',        tc: '#4ade80', sc: '#16a34a' },
        { dot: '#eab308', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.3)',  title: 'Żółty — uwaga, wzrasta',        sub: 'WIP 3–4 → zwolnij, zanim awaria uderzy',      tc: '#facc15', sc: '#a16207' },
        { dot: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  title: 'Czerwony — niebezpiecznie!',    sub: 'WIP 5+ → każda pizza to ryzyko straty $50',   tc: '#f87171', sc: '#991b1b', blink: true },
      ].map(({ dot, bg, border, title, sub, tc, sc, blink }) => (
        <div key={title} style={{ background: bg, border: `0.5px solid ${border}`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: `0 0 8px ${dot}`, animation: blink ? 'pulse 0.6s ease-in-out infinite' : 'none' }}/>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tc }}>{title}</div>
            <div style={{ fontSize: 11, color: sc, marginTop: 1 }}>{sub}</div>
          </div>
        </div>
      ))}
    </div>

    <ChefTip>
      Piec piecze <strong style={{ color: '#60a5fa' }}>1 pizzę co 3s</strong>. Utrzymuj bufor nieupieczonych pizz (WIP) na odpowiednim poziomie — nie za mało, nie za dużo!
    </ChefTip>

    <StartButton onClick={onStart} label="START — Etap 2"/>
  </div>
);

// ─── ROPE SETUP (E3) ──────────────────────────────────────────────────────────
export const RopeSetup = ({ initialRope, onStart }) => {
  const [selected, setSelected] = useState(null);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    if (selected !== null) { setPulse(false); return; }
    const id = setInterval(() => setPulse(p => !p), 600);
    return () => clearInterval(id);
  }, [selected]);

  const options = [null,1,2,3,4,5];
  const descColor = selected === null ? '#ef4444' : selected <= 2 ? '#facc15' : selected <= 3 ? '#4ade80' : '#facc15';
  const desc = selected === null ? null
    : selected === null ? 'Brak limitu — ryzyko maksymalne, LT rośnie bez ograniczeń.'
    : selected <= 2 ? `Limit ${selected} — krótki LT, minimalne ryzyko. Piec może czekać.`
    : selected <= 3 ? `Limit ${selected} — optymalny balans LT i przepływu.`
    : `Limit ${selected} — długi LT, wysokie ryzyko podczas awarii.`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <div style={{ fontSize: 40, marginBottom: 8 }}>🪢</div>
        <h1 className="text-2xl font-black text-white mb-1">Ustaw swój Rope</h1>
        <p className="text-slate-500 text-sm">Zanim ruszy timer — wybierz maksymalny poziom WIP</p>
      </div>

      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Jak działa etap 3?</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Robot będzie klikał za Ciebie — ale tylko gdy ilość w buforze jest <strong className="text-green-400">poniżej Twojego limitu</strong>. Gdy blat jest pełny, robot zatrzymuje się i czeka aż piec opróżni kolejkę.
        </p>
        <div style={{ background: '#0d1520', border: '1px solid #1e3a5f', borderRadius: 10, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 14 }}>🥁</span>
          <p style={{ fontSize: 11, color: '#93c5fd' }}>Piec piecze 1 pizzę co 3s. Ustaw limit tak, żeby zawsze miał co robić — ale nie za dużo!</p>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">
          {selected === null ? '👇 Kliknij żeby wybrać limit WIP' : '✓ Wybrałeś limit'}
        </p>
        <div className="flex gap-2">
          {options.map(v => {
            const isSelected = selected === v;
            const shouldPulse = pulse && selected === null;
            return (
              <button key={v ?? 'inf'} onClick={() => setSelected(v)}
                className="flex-1 py-3 rounded-xl font-black text-lg transition-all"
                style={{
                  background: isSelected ? '#f97316' : '#1e293b',
                  color: isSelected ? '#fff' : shouldPulse ? '#f97316' : '#475569',
                  border: isSelected ? '2px solid #fb923c' : shouldPulse ? '2px solid #f9731688' : '2px solid #334155',
                  boxShadow: isSelected ? '0 0 20px rgba(249,115,22,0.5)' : 'none',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}>
                {v === null ? '∞' : v}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className="rounded-xl p-3 text-center" style={{ background: `${descColor}11`, border: `1px solid ${descColor}44` }}>
            <p className="text-sm font-bold" style={{ color: descColor }}>{desc}</p>
          </div>
        )}
      </div>

      {selected !== null && (
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-3 text-center">Jak będzie działał sygnał</p>
          <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '5%', right: '5%', height: 2, background: '#1e293b', borderRadius: 2 }}/>
            <div style={{ position: 'absolute', left: '5%', height: 2, width: '75%', background: '#4ade80', borderRadius: 2, boxShadow: '0 0 6px rgba(74,222,128,0.7)' }}/>
            <div style={{ position: 'absolute', left: '3%', width: 10, height: 10, borderRadius: '50%', background: '#4ade80', transform: 'translateX(-50%)' }}/>
            <div style={{ position: 'absolute', left: '78%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 20, animation: 'robotBounce 0.3s ease-in-out infinite alternate' }}>🤖</div>
            <div style={{ position: 'absolute', right: '3%', width: 10, height: 10, borderRadius: '50%', background: '#f97316', transform: 'translateX(50%)' }}/>
          </div>
        </div>
      )}

      {selected !== null && (
        <div className="w-full max-w-sm">
          <StartButton onClick={() => onStart(selected)} label="START — Etap 3"/>
        </div>
      )}

      <style>{`@keyframes robotBounce{from{transform:translate(-50%,-50%) translateY(0)}to{transform:translate(-50%,-50%) translateY(-5px)}}`}</style>
    </div>
  );
};

// ─── E4 SETUP ─────────────────────────────────────────────────────────────────
export const E4Setup = ({ onStart }) => {
  const [selected, setSelected] = useState(null);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    if (selected !== null) { setPulse(false); return; }
    const id = setInterval(() => setPulse(p => !p), 600);
    return () => clearInterval(id);
  }, [selected]);

  const options = [null,1,2,3,4,5];
  const descColor = selected === null ? '#ef4444' : selected <= 2 ? '#facc15' : selected <= 3 ? '#4ade80' : '#facc15';
  const desc = selected === null ? null
    : selected <= 2 ? `Limit ${selected} — krótki LT, minimalne ryzyko. Piec może czekać.`
    : selected <= 3 ? `Limit ${selected} — optymalny balans LT i przepływu.`
    : `Limit ${selected} — długi LT, wysokie ryzyko podczas awarii.`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 gap-5">
      <div className="text-center pt-4">
        <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
        <h1 className="text-2xl font-black mb-1" style={{ background: 'linear-gradient(135deg,#7c3aed,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Tryb PRO — pełny wgląd
        </h1>
        <p className="text-slate-500 text-sm">Etap 4 — zobaczysz jak WIP wpływa na czas i efektywność</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">⏱ Czym jest Lead Time?</p>
        <p className="text-sm text-slate-300 leading-relaxed">
          <strong className="text-purple-300">Lead Time (LT)</strong> to czas od momentu gdy pizza trafia na blat do chwili gdy opuszcza piec. Im więcej pizz w kolejce — tym dłużej każda czeka.
        </p>
        <div className="flex gap-2">
          {[['WIP=1','6s','#4ade80'],['WIP=3','12s','#eab308'],['WIP=8','27s','#ef4444']].map(([lbl,lt,c]) => (
            <div key={lbl} style={{ flex:1, background:'#0d1520', border:`0.5px solid ${c}44`, borderRadius:8, padding:'6px 4px', textAlign:'center' }}>
              <div style={{ fontSize:13, fontWeight:700, color:c, fontFamily:'monospace' }}>{lt}</div>
              <div style={{ fontSize:7, color:'#475569' }}>{lbl}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">Im mniej WIP → krótszy LT → szybszy przepływ → mniejsze ryzyko podczas awarii.</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">📈 Lead Time per pizza — co zobaczysz</p>
        <p className="text-xs text-slate-400 leading-relaxed">Każda upieczona pizza ma swój pasek LT. Obserwuj jak rosną gdy bufor się zapycha.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ background:'#0d1520', border:'0.5px solid #7c3aed44', borderRadius:8, padding:'6px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:8, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700 }}>Avg LT pizzerii</span>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:'#eab308' }}>9s</span>
            </div>
            <div style={{ height:9, background:'#1e293b', borderRadius:3 }}>
              <div style={{ height:'100%', borderRadius:3, background:'#eab308', width:'33%' }}/>
            </div>
          </div>
          {[['#1','6s','20%','#4ade80'],['#2','9s','33%','#eab308'],['#3','15s','55%','#ef4444']].map(([n,lt,w,c]) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:9, color:'#475569', fontFamily:'monospace', minWidth:16 }}>{n}</span>
              <span style={{ fontSize:10 }}>🍕</span>
              <div style={{ flex:1, height:3, background:'#1e293b', borderRadius:2 }}>
                <div style={{ height:'100%', borderRadius:2, background:c, width:w }}/>
              </div>
              <span style={{ fontSize:9, fontWeight:700, fontFamily:'monospace', color:c, minWidth:24, textAlign:'right' }}>{lt}</span>
            </div>
          ))}
        </div>
      </div>

      <ChefTip>
        Piec piecze <strong style={{ color:'#60a5fa' }}>1 pizzę co 3s</strong>. Obserwuj LT i OEE — znajdź limit WIP który maksymalizuje zysk i minimalizuje ryzyko awarii.
      </ChefTip>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[9px] text-purple-400 uppercase tracking-widest font-bold">🪢 Ustaw limit WIP (Rope)</p>
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

      {selected !== null && <StartButton onClick={() => onStart(selected)} label="START — Etap 4 PRO"/>}
    </div>
  );
};
