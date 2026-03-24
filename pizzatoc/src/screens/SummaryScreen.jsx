import React, { useState } from 'react';
import { Trophy, RotateCcw, ChevronRight, BarChart2, X } from 'lucide-react';
import { fmt, calcOee, oeeGrade, MAX_BY_OVEN } from '../config/constants';

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

// ─── SUMMARY SCREEN ───────────────────────────────────────────────────────────
export const SummaryScreen = ({ history, attempt, onRestart, onContinue, onRepeatE3, onRepeatE4, onGoE4 }) => {
  const [showOee, setShowOee] = useState(false);
  const best = [...history].sort((a, b) => b.balance - a.balance)[0];
  const bestAttempt = best?.attempt;
  const LABELS = ['', 'E1 — na maksa', 'E2 — z sygnałami', 'E3 — Rope + Auto', 'E4 — tryb PRO'];

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
          const { ovenOee } = calcOee(r);
          const perf   = Math.min(100, Math.round((r.baked / MAX_BY_OVEN) * 100));
          const total  = r.baked + r.wipAtEnd;
          const qual   = total === 0 ? 100 : Math.round((r.baked / total) * 100);
          const oeePiz = Math.round(67 * perf * qual / 10000);
          return (
            <div key={i} className={`rounded-2xl border overflow-hidden ${isBest ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-slate-800'}`}>
              <div className={`flex items-center justify-between px-4 py-2.5 ${isBest ? 'bg-orange-500/10' : 'bg-slate-900'}`}>
                <span className="font-bold text-sm flex items-center gap-2">
                  {isBest && <Trophy size={12} className="text-yellow-400"/>}
                  {LABELS[r.attempt] || `Etap ${r.attempt}`}
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

      {/* Przyciski */}
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
