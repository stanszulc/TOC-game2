import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { E2Intro, RopeSetup, E4Setup } from './screens/IntroScreens';
import { EduScreen } from './screens/EduScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { GameScreen } from './screens/GameScreen';

const MAX_ATTEMPTS = 4;

// ─── START SCREEN ─────────────────────────────────────────────────────────────
const StartScreen = ({ onStart }) => (
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
    <button onClick={onStart}
      className="w-full max-w-xs font-black text-xl text-white py-4 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2"
      style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 0 24px rgba(249,115,22,0.4)' }}>
      <ChevronRight size={20}/> START — Etap 1
    </button>
    <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
  </div>
);

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function PizzaTOC() {
  const [phase,       setPhase]      = useState('START');
  const [attempt,     setAttempt]    = useState(1);
  const [history,     setHistory]    = useState([]);
  const [lastResult,  setLastResult] = useState(null);
  const [initialRope, setInitialRope] = useState(3);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFinish   = (result) => { setHistory(h => [...h, result]); setLastResult(result); setPhase('EDU'); };
  const handleNext     = () => { setPhase('SUMMARY'); };
  const handleRestart  = () => { setPhase('START'); setAttempt(1); setHistory([]); setLastResult(null); };
  const handleRepeatE3 = () => { setAttempt(3); setPhase('ROPE_SETUP'); };
  const handleGoE4     = () => { setAttempt(4); setPhase('E4_SETUP'); };

  const handleContinue = () => {
    if (attempt >= MAX_ATTEMPTS) return;
    const next = attempt + 1;
    setAttempt(next);
    if      (next === 2) setPhase('E2_INTRO');
    else if (next === 3) setPhase('ROPE_SETUP');
    else                 setPhase('PLAYING');
  };

  // ── Routing ───────────────────────────────────────────────────────────────
  switch (phase) {
    case 'START':
      return <StartScreen onStart={() => setPhase('PLAYING')}/>;

    case 'E2_INTRO':
      return <E2Intro onStart={() => setPhase('PLAYING')}/>;

    case 'ROPE_SETUP':
      return <RopeSetup initialRope={initialRope} onStart={(rope) => { setInitialRope(rope); setPhase('PLAYING'); }}/>;

    case 'E4_SETUP':
      return <E4Setup onStart={(rope) => { setInitialRope(rope); setPhase('PLAYING'); }}/>;

    case 'PLAYING':
      return (
        <GameScreen
          key={`${attempt}-${history.length}`}
          attempt={attempt}
          onFinish={handleFinish}
          showTrafficLight={attempt >= 2}
          initialRope={initialRope}
        />
      );

    case 'EDU':
      return (
        <EduScreen
          result={lastResult}
          attempt={attempt}
          history={history}
          onNext={handleNext}
        />
      );

    case 'SUMMARY':
      return (
        <SummaryScreen
          history={history}
          attempt={attempt}
          onRestart={handleRestart}
          onContinue={attempt < MAX_ATTEMPTS && attempt !== 3 ? handleContinue : undefined}
          onRepeatE3={attempt >= 3 ? handleRepeatE3 : undefined}
          onRepeatE4={attempt >= 4 ? () => { setAttempt(4); setPhase('E4_SETUP'); } : undefined}
          onGoE4={attempt === 3 ? handleGoE4 : undefined}
        />
      );

    default:
      return null;
  }
}
