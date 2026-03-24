import React, { useState } from 'react';
import { fmt } from '../config/constants';
import { getFeedbackE1, getFeedbackE2, getFeedbackE3 } from '../config/feedback';

// ─── KNOWLEDGE CONFIG ─────────────────────────────────────────────────────────
const KNOWLEDGE = {
  1: { icon: '🥁', color: '#f97316', title: 'Czym jest Drum (Bęben)?',
       body: 'To Twoje Wąskie Gardło — Piec. On „wybija takt" całej pizzerii. Nie zarobisz ani grosza więcej, niż pozwoli na to Piec. Jeśli kucharz pracuje szybciej niż bije bęben — tworzy się zator.',
       sim: true, simTitle: 'Chaos — produkcja bez żadnych limitów.' },
  2: { icon: '🛡️', color: '#378ADD', title: 'Czym jest Buffer (Bufor)?',
       body: 'To zapas przed piecem. Musi być „w sam raz" — na tyle duży, by piec miał co robić, i na tyle mały, by nie stracić majątku, gdy „zgaśnie światło" (awaria).',
       sim: false, simTitle: 'Świadomość — reaguj na sygnały z blatu.' },
  3: { icon: '🪢', color: '#4ade80', title: 'Czym jest Rope (Lina)?',
       body: 'To mechanizm, który mówi kucharzowi: „STOP, nie klep kolejnej pizzy, bufor jest pełny!". Lina łączy tempo kucharza z tempem pieca. Dzięki niej nie marnujesz energii na nadprodukcję.',
       sim: true, simTitle: 'Synchronizacja — Rope przejmuje kontrolę nad tempem.' },
  4: { icon: '📊', color: '#7c3aed', title: 'Lead Time (Czas Przelotu)',
       body: 'LT to czas, jaki pizza spędza w Twojej pizzerii. WIP (Zapas) to wróg Lead Time! Im więcej pizz na blacie, tym dłużej każda z nich czeka na swoją kolej. Krótki LT = błyskawiczna sprzedaż i brak strat.',
       sim: true, simTitle: 'Optymalizacja — jak WIP wpływa na czas realizacji (Lead Time)?' },
};

// ─── EDU SCREEN ───────────────────────────────────────────────────────────────
export const EduScreen = ({ result, attempt, history, onNext }) => {
  const [simWip, setSimWip] = useState(2);
  const prevResult = history.length >= 2 ? history[history.length - 2] : null;

  const feedback = attempt === 1 ? getFeedbackE1(result)
                 : attempt === 2 ? getFeedbackE2(result, prevResult)
                 : getFeedbackE3(result, history);

  const k      = KNOWLEDGE[attempt] || KNOWLEDGE[4];
  const simLt  = Math.max(3, (simWip + 1) * 3);
  const simRisk = simWip * 50;
  const ltCol  = simLt <= 3 ? '#4ade80' : simLt <= 9 ? '#eab308' : '#ef4444';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 gap-4"
      onClick={onNext} style={{ cursor: 'pointer' }}>

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
              onChange={e => setSimWip(Number(e.target.value))} className="flex-1"/>
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
