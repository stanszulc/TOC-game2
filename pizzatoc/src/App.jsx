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

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  pl: {
    startTitle: 'ZARÓB JAK NAJWIĘCEJ\nW 30 SEKUND!',
    startSubtitle: '(Ale uważaj na przerwy w dostawie prądu...)',
    tapFast: 'Tapuj szybko',
    tapDesc: ', by przygotować pizzę na blat. Piec nie może czekać!',
    ovenDesc: 'piecze jedną pizzę co 3 sekundy.',
    outageWarn: 'AWARYJNE WYŁĄCZENIE:',
    outageDesc: ' Gdy zgaśnie światło, każda pizza na blacie generuje potężne straty!',
    startBtn: 'START — Etap 1',
    tapsCount: (t, max) => `${t}/${max} tapów`,
    tapHint: '5 tapów = 1 pizza 🫓',
    // OutageScreen
    outagePowerTitle: 'AWARIA PRĄDU!',
    outageAttemptLabel: 'Awaria — straty',
    outageUnbaked: 'nieupieczone pizze × $50',
    outageDestroyed: 'Zniszczone',
    outageWait: 'poczekaj...',
    outageTouchResult: 'Dotknij → wyniki',
    outageRemaining: (t) => `pozostało: ${t}s`,
    // E2Intro
    e2Title: 'Obserwuj sygnały',
    e2Sub: 'Etap 2 — tym razem blat podpowie kiedy zwolnić',
    e2ColorHint: 'Co zobaczysz na blacie',
    e2Green: 'Zielony — bezpieczny poziom',
    e2GreenSub: 'WIP 1–2 → piec ma co robić, bufor OK',
    e2Yellow: 'Żółty — uwaga, wzrasta',
    e2YellowSub: 'WIP 3–4 → zwolnij, zanim awaria uderzy',
    e2Red: 'Czerwony — niebezpiecznie!',
    e2RedSub: 'WIP 5+ → każda pizza to ryzyko straty $50',
    e2ChefTip: (s) => `Piec piecze ${s}. Utrzymuj bufor nieupieczonych pizz (WIP) na odpowiednim poziomie — nie za mało, nie za dużo!`,
    e2ChefSpeed: '1 pizzę co 3s',
    e2StartBtn: 'START — Etap 2',
    // Rope Setup
    ropeTitle: 'Ustaw swój Rope',
    ropeSub: 'Zanim ruszy timer — wybierz maksymalny poziom WIP',
    ropeHowLabel: 'Jak działa etap 3?',
    ropeHowDesc: (s) => `Robot będzie klikał za Ciebie — ale tylko gdy ilość w buforze jest ${s}. Gdy blat jest pełny, robot zatrzymuje się i czeka aż piec opróżni kolejkę.`,
    ropeBelowLimit: 'poniżej Twojego limitu',
    ropeDrumTip: 'Piec piecze 1 pizzę co 3s. Ustaw limit tak, żeby zawsze miał co robić — ale nie za dużo!',
    ropeChooseLabel: 'Kliknij żeby wybrać limit WIP',
    ropeChosenLabel: '✓ Wybrałeś limit',
    ropeInf: 'Brak limitu — robot klika bez przerwy. Duże ryzyko nadprodukcji podczas awarii.',
    rope12: (v) => `Limit ${v} — bardzo mały bufor. Piec może czekać na pizze.`,
    rope3: (v) => `Limit ${v} — dobry balans. Piec ma ciągłą dostawę, nie za dużo WIP.`,
    rope45: (v) => `Limit ${v} — spory bufor. Bezpieczniejszy, ale więcej straty podczas awarii.`,
    ropeSignalLabel: 'Jak będzie działał sygnał',
    ropeStartBtn: '🚀 START — Etap 3',
    // Game
    wipDangerLow: '✕ niebezpiecznie niski poziom',
    wipOk: '✓ ok — bezpieczny poziom',
    wipWarn: '⚠ uwaga — poziom wzrasta',
    wipDangerHigh: '✕ niebezpiecznie wysoki',
    wipEmpty: 'pusty blat',
    wipReady: 'czeka...',
    wipRaw: '⬤ Surowe',
    wipDone: '⬤ Gotowe',
    ropeLimitLabel: '🪢 Rope — limit WIP',
    ropeNoLimit: 'brak limitu',
    ropeMax: (v) => `max ${v}`,
    tapBtn: 'KLEPIEMY!',
    tapBtnRope: 'ROPE',
    phase: (a, m) => `Etap ${a}/${m}`,
    // Results / Summary
    summaryTitle: 'PODSUMOWANIE',
    oeeTitle: 'Analiza OEE',
    oeeClose: 'Zamknij analizę',
    stageBest: (i) => ['', 'E1 — na maksa', 'E2 — z sygnałami', 'E3 — Rope + Auto'][i] || `Etap ${i}`,
    dbrTitle: 'Drum–Buffer–Rope',
    dbrSub: 'Theory of Constraints',
    dbrDrum: 'Drum', dbrDrumD: 'rytm pieca co 3s — etap 1',
    dbrBuffer: 'Buffer', dbrBufferD: 'zapas przed piecem — etap 2',
    dbrRope: 'Rope', dbrRopeD: 'limit WIP = synchronizacja — etap 3',
    btnContinue: (a) => `Etap ${a + 1}`,
    btnRepeatE3: 'Powtórz etap 3',
    btnRepeatE4: '⚡ Powtórz etap 4 PRO',
    btnGoE4: '⚡ Etap 4 — tryb PRO',
    btnOee: 'Analiza OEE',
    btnRestart: 'Zagraj ponownie',
    // AttemptResult
    resultStage: (a) => `Wynik etapu ${a}`,
    bakedLabel: '🍕 Upieczone',
    wipLabel: '🗑 WIP',
    oeOvenLabel: 'OEE Piec',
    oeePizLabel: 'OEE 🍕',
    drumKnow: '🥁 Czym jest Drum?',
    drumKnowBody: (b, w) => `Piec piecze jedną pizzę co 3 sekundy — nie szybciej. To wąskie gardło które dyktuje tempo całej produkcji. W etapie 2 zobaczysz sygnały które to pokazują.`,
    bufferKnow: '🛡️ Czym jest Buffer?',
    bufferKnowBody: 'Mały zapas przed piecem (WIP 1-2) to buffer — gwarantuje że piec nigdy nie czeka. Za dużo WIP to nadprodukcja. Za mało — piec stoi. W etapie 3 robot znajdzie balans.',
    ropeKnow: '🪢 Czym jest Rope?',
    ropeKnowBody: 'Rope to sygnał który hamuje produkcję gdy buffer jest pełny. Łączy tempo kuchni z rytmem pieca. Razem: Drum–Buffer–Rope = synchronizacja całego systemu.',
    compareWith: (a) => `Porównanie z etapem ${a}`,
    almostTitle: '💡 Prawie!',
    almostBody: 'Wynik etapu 2 nie przekroczył etapu 1. Spróbuj jeszcze raz obserwując kolory WIP — lub przejdź dalej mimo wszystko.',
    btnRetry: '↺ Spróbuj jeszcze raz',
    btnForward: 'Przejdź dalej →',
    btnRepeatE3Short: 'Powtórz etap 3 (inny limit WIP)',
    summaryBtn: 'Podsumowanie',
    nextStage: (a) => `Etap ${a + 1}`,
    touchSummary: 'Dotknij ekran → podsumowanie',
    // OEE Panel
    oeeAvail: 'Dostępność', oeePerf: 'Wydajność', oeeQual: 'Jakość',
    oeeAvailD1: '20s z 30s\npiec mógł pracować', oeeAvailD2: '10s = awaria prądu',
    oeePerfD2: (n) => `max = floor(20÷3) = ${n}`,
    oeeQualD2: (n) => `${n} WIP = NOK (scrap)`,
    oeeLabel: 'OEE Pizzerii',
    stageLabel: (a) => `Etap #${a}`,
    // E4
    e4Title: 'Tryb PRO — pełny wgląd',
    e4Sub: 'Etap 4 — zobaczysz jak WIP wpływa na czas i efektywność',
    e4LtTitle: '⏱ Czym jest Lead Time?',
    e4LtBody: 'Lead Time (LT) to czas od momentu gdy pizza trafia na blat do chwili gdy opuszcza piec. Im więcej pizz w kolejce — tym dłużej każda czeka.',
    e4LtNote: 'Im mniej WIP → krótszy LT → szybszy przepływ → mniejsze ryzyko podczas awarii.',
    e4ChartLabel: '📈 Co pojawi się na ekranie — Lead Time per pizza',
    e4ChartDesc: 'Każda upieczona pizza ma swój pasek LT. Obserwuj jak rosną gdy bufor się zapycha.',
    e4AvgLt: 'Avg LT pizzerii',
    e4ChartNote: 'Im większy WIP → dłuższe paski → większe ryzyko',
    e4RopeLabel: '🪢 Ustaw limit WIP (Rope)',
    e4Limit12: (v) => `Limit ${v} — krótki LT, minimalne ryzyko. Piec może czekać.`,
    e4Limit3: (v) => `Limit ${v} — optymalny balans LT i przepływu.`,
    e4Limit45: (v) => `Limit ${v} — długi LT, wysokie ryzyko podczas awarii.`,
    e4ChefTip: 'Piec piecze 1 pizzę co 3s. Obserwuj LT i OEE — znajdź limit WIP który maksymalizuje zysk i minimalizuje ryzyko awarii.',
    e4StartBtn: 'START — Etap 4 PRO',
    // PRO indicators
    proOeeChef: 'OEE Kucharz', proOeeOven: 'OEE Piec', proOeePiz: 'OEE Pizz.',
    proRobotStop: '⛔ stoi',
    proLtLabel: '⏱ Lead Time',
    proLtPer: 'LT per pizza',
    proLtWaiting: (w, lt) => `WIP=${w} → ~${lt}s czekania`,
    proLtFirst: 'czekam na pierwsze wypieczenie...',
    proAvgLt: 'avg LT pizzerii',
  },
  en: {
    startTitle: 'EARN AS MUCH AS POSSIBLE\nIN 30 SECONDS!',
    startSubtitle: '(But watch out for power outages...)',
    tapFast: 'Tap fast',
    tapDesc: ' to prepare a pizza for the oven. The oven can\'t wait!',
    ovenDesc: 'bakes one pizza every 3 seconds.',
    outageWarn: 'POWER OUTAGE:',
    outageDesc: ' When the lights go out, every pizza on the counter generates massive losses!',
    startBtn: 'START — Stage 1',
    tapsCount: (t, max) => `${t}/${max} taps`,
    tapHint: '5 taps = 1 pizza 🫓',
    // OutageScreen
    outagePowerTitle: 'POWER OUTAGE!',
    outageAttemptLabel: 'Outage — losses',
    outageUnbaked: 'unbaked pizzas × $50',
    outageDestroyed: 'Destroyed',
    outageWait: 'wait...',
    outageTouchResult: 'Tap → results',
    outageRemaining: (t) => `remaining: ${t}s`,
    // E2Intro
    e2Title: 'Watch the signals',
    e2Sub: 'Stage 2 — this time the counter will tell you when to slow down',
    e2ColorHint: 'What you\'ll see on the counter',
    e2Green: 'Green — safe level',
    e2GreenSub: 'WIP 1–2 → oven has work, buffer OK',
    e2Yellow: 'Yellow — caution, rising',
    e2YellowSub: 'WIP 3–4 → slow down before the outage hits',
    e2Red: 'Red — dangerous!',
    e2RedSub: 'WIP 5+ → every pizza risks a $50 loss',
    e2ChefTip: (s) => `The oven bakes ${s}. Keep the raw pizza buffer (WIP) at the right level — not too little, not too much!`,
    e2ChefSpeed: '1 pizza every 3s',
    e2StartBtn: 'START — Stage 2',
    // Rope Setup
    ropeTitle: 'Set your Rope',
    ropeSub: 'Before the timer starts — choose the max WIP level',
    ropeHowLabel: 'How does Stage 3 work?',
    ropeHowDesc: (s) => `The robot will tap for you — but only when the buffer is ${s}. When the counter is full, the robot stops and waits for the oven to clear the queue.`,
    ropeBelowLimit: 'below your limit',
    ropeDrumTip: 'The oven bakes 1 pizza every 3s. Set a limit so it always has work — but not too much!',
    ropeChooseLabel: 'Click to choose WIP limit',
    ropeChosenLabel: '✓ Limit selected',
    ropeInf: 'No limit — robot taps non-stop. High risk of overproduction during outage.',
    rope12: (v) => `Limit ${v} — very small buffer. Oven may wait for pizzas.`,
    rope3: (v) => `Limit ${v} — good balance. Oven has steady supply, not too much WIP.`,
    rope45: (v) => `Limit ${v} — large buffer. Safer, but more loss during outage.`,
    ropeSignalLabel: 'How the signal will work',
    ropeStartBtn: '🚀 START — Stage 3',
    // Game
    wipDangerLow: '✕ dangerously low level',
    wipOk: '✓ ok — safe level',
    wipWarn: '⚠ caution — level rising',
    wipDangerHigh: '✕ dangerously high',
    wipEmpty: 'empty counter',
    wipReady: 'waiting...',
    wipRaw: '⬤ Raw',
    wipDone: '⬤ Done',
    ropeLimitLabel: '🪢 Rope — WIP limit',
    ropeNoLimit: 'no limit',
    ropeMax: (v) => `max ${v}`,
    tapBtn: 'TAP IT!',
    tapBtnRope: 'ROPE',
    phase: (a, m) => `Stage ${a}/${m}`,
    // Results / Summary
    summaryTitle: 'SUMMARY',
    oeeTitle: 'OEE Analysis',
    oeeClose: 'Close analysis',
    stageBest: (i) => ['', 'S1 — full speed', 'S2 — with signals', 'S3 — Rope + Auto'][i] || `Stage ${i}`,
    dbrTitle: 'Drum–Buffer–Rope',
    dbrSub: 'Theory of Constraints',
    dbrDrum: 'Drum', dbrDrumD: 'oven rhythm every 3s — stage 1',
    dbrBuffer: 'Buffer', dbrBufferD: 'supply before oven — stage 2',
    dbrRope: 'Rope', dbrRopeD: 'WIP limit = synchronization — stage 3',
    btnContinue: (a) => `Stage ${a + 1}`,
    btnRepeatE3: 'Repeat stage 3',
    btnRepeatE4: '⚡ Repeat stage 4 PRO',
    btnGoE4: '⚡ Stage 4 — PRO mode',
    btnOee: 'OEE Analysis',
    btnRestart: 'Play again',
    // AttemptResult
    resultStage: (a) => `Stage ${a} result`,
    bakedLabel: '🍕 Baked',
    wipLabel: '🗑 WIP',
    oeOvenLabel: 'OEE Oven',
    oeePizLabel: 'OEE 🍕',
    drumKnow: '🥁 What is the Drum?',
    drumKnowBody: () => `The oven bakes one pizza every 3 seconds — no faster. It's the bottleneck that sets the pace for the entire pizzeria. In Stage 2 you'll see signals that show this.`,
    bufferKnow: '🛡️ What is the Buffer?',
    bufferKnowBody: 'A small stock before the oven (WIP 1-2) is the buffer — it ensures the oven never waits. Too much WIP is overproduction. Too little — the oven sits idle. In Stage 3, the robot finds the balance.',
    ropeKnow: '🪢 What is the Rope?',
    ropeKnowBody: 'The Rope is a signal that stops production when the buffer is full. It ties the chef\'s pace to the oven\'s rhythm. Together: Drum–Buffer–Rope = full system synchronization.',
    compareWith: (a) => `Comparison with stage ${a}`,
    almostTitle: '💡 Almost!',
    almostBody: 'Stage 2 result didn\'t beat Stage 1. Try again watching the WIP colors — or continue anyway.',
    btnRetry: '↺ Try again',
    btnForward: 'Continue →',
    btnRepeatE3Short: 'Repeat Stage 3 (different WIP limit)',
    summaryBtn: 'Summary',
    nextStage: (a) => `Stage ${a + 1}`,
    touchSummary: 'Tap screen → summary',
    // OEE Panel
    oeeAvail: 'Availability', oeePerf: 'Performance', oeeQual: 'Quality',
    oeeAvailD1: '20s of 30s\noven could work', oeeAvailD2: '10s = power outage',
    oeePerfD2: (n) => `max = floor(20÷3) = ${n}`,
    oeeQualD2: (n) => `${n} WIP = NOK (scrap)`,
    oeeLabel: 'Pizzeria OEE',
    stageLabel: (a) => `Stage #${a}`,
    // E4
    e4Title: 'PRO Mode — full visibility',
    e4Sub: 'Stage 4 — see how WIP affects time and efficiency',
    e4LtTitle: '⏱ What is Lead Time?',
    e4LtBody: 'Lead Time (LT) is the time from when a pizza hits the counter to when it leaves the oven. More pizzas in queue = longer wait for each.',
    e4LtNote: 'Less WIP → shorter LT → faster flow → less risk during outage.',
    e4ChartLabel: '📈 What you\'ll see — Lead Time per pizza',
    e4ChartDesc: 'Each baked pizza has its own LT bar. Watch them grow as the buffer fills up.',
    e4AvgLt: 'Avg pizzeria LT',
    e4ChartNote: 'More WIP → longer bars → more risk',
    e4RopeLabel: '🪢 Set WIP limit (Rope)',
    e4Limit12: (v) => `Limit ${v} — short LT, minimal risk. Oven may wait.`,
    e4Limit3: (v) => `Limit ${v} — optimal balance of LT and flow.`,
    e4Limit45: (v) => `Limit ${v} — long LT, high risk during outage.`,
    e4ChefTip: 'The oven bakes 1 pizza every 3s. Watch LT and OEE — find the WIP limit that maximizes profit and minimizes outage risk.',
    e4StartBtn: 'START — Stage 4 PRO',
    // PRO indicators
    proOeeChef: 'OEE Chef', proOeeOven: 'OEE Oven', proOeePiz: 'OEE Piz.',
    proRobotStop: '⛔ stopped',
    proLtLabel: '⏱ Lead Time',
    proLtPer: 'LT per pizza',
    proLtWaiting: (w, lt) => `WIP=${w} → ~${lt}s wait`,
    proLtFirst: 'waiting for first bake...',
    proAvgLt: 'avg pizzeria LT',
  },
};

// Feedback strings (language-dependent)
const getFeedbackE1 = (r, t) => {
  const maxPossible = r.baked * PIZZA_VAL;
  const lostPct = maxPossible > 0 ? Math.round((r.wipAtEnd * PENALTY_RATE) / maxPossible * 100) : 0;
  if (t === 'en') {
    if (r.wipAtEnd === 0 && r.balance > 0)
      return { icon: '🏆', color: '#4ade80', title: 'Great intuition!', body: `You felt the machine's rhythm. Baked ${r.baked} pizzas without cluttering the counter. Zero losses, clean profit!` };
    if (r.balance > 0 && r.wipAtEnd > 0)
      return { icon: '⚠️', color: '#facc15', title: 'Got away with it, but...', body: `You earned ${fmt(r.balance)}, but ${r.wipAtEnd} pizzas ended up in the bin during the outage. If you'd slowed down, your profit would be ${lostPct}% higher.` };
    if (r.wipAtEnd > 5)
      return { icon: '💥', color: '#ef4444', title: 'Counter jammed!', body: `The oven can bake max 6 pizzas in this time, yet you had ${r.wipAtEnd} raw ones waiting. The rest is just "frozen cash" taken by the outage.` };
    return { icon: '📉', color: '#ef4444', title: 'Outage ate the profit', body: `You lost $${r.wipAtEnd * PENALTY_RATE} through overproduction. You were tapping for the joy of it, but the oven did its own thing.` };
  }
  if (r.wipAtEnd === 0 && r.balance > 0)
    return { icon: '🏆', color: '#4ade80', title: 'Świetna intuicja!', body: `Wyczułeś tempo maszyny. Upiekłeś ${r.baked} pizz bez robienia bałaganu na blacie. Zero strat, czysty zysk!` };
  if (r.balance > 0 && r.wipAtEnd > 0)
    return { icon: '⚠️', color: '#facc15', title: 'Udało się, ale...', body: `Zarobiłeś ${fmt(r.balance)}, ale ${r.wipAtEnd} pizz wylądowało w koszu przez awarię. Gdybyś zwolnił, Twój zysk byłby o ${lostPct}% wyższy.` };
  if (r.wipAtEnd > 5)
    return { icon: '💥', color: '#ef4444', title: 'Zapchany blat!', body: `Piec robi max 6 pizz w tym czasie, a Ty uklepałeś ich ${r.wipAtEnd} na blacie. Reszta to tylko „mrożenie gotówki", którą zabrała awaria.` };
  return { icon: '📉', color: '#ef4444', title: 'Awaria zjadła zysk', body: `Straciłeś $${r.wipAtEnd * PENALTY_RATE} przez nadprodukcję. Klikałeś dla samej frajdy klikania, a piec i tak robił swoje.` };
};

const getFeedbackE2 = (r, prev, t) => {
  if (t === 'en') {
    if (!prev) return { icon: '👀', color: '#378ADD', title: 'Did you see the colors?', body: 'You reacted to the red alert on the counter. You understood that producing "just in case" doesn\'t pay off.' };
    const diff = r.balance - prev.balance;
    if (diff > 0) return { icon: '📈', color: '#4ade80', title: `+${fmt(diff)} vs Stage 1!`, body: `Watching the counter raised your profit. That\'s Buffer in practice — protect the oven, but don\'t overdo it.` };
    if (diff === 0) return { icon: '↔️', color: '#facc15', title: 'Habit stronger than knowledge', body: 'Similar result to S1. Hard to stop tapping when your fingers itch, right? In S3 the system will handle it.' };
    return { icon: '🤔', color: '#f97316', title: 'Chaos won', body: 'Sometimes focusing on colors is distracting. In the next stage, the Rope automatically syncs your pace.' };
  }
  if (!prev) return { icon: '👀', color: '#378ADD', title: 'Widziałeś kolory?', body: 'Reagowałeś na czerwony alert na blacie. Zrozumiałeś, że nie opłaca się „produkować na zapas".' };
  const diff = r.balance - prev.balance;
  if (diff > 0) return { icon: '📈', color: '#4ade80', title: `+${fmt(diff)} względem Etapu 1!`, body: `Uważne patrzenie na blat podniosło Twój zysk. To jest Buffer w praktyce — chronisz piec, ale nie przeginasz.` };
  if (diff === 0) return { icon: '↔️', color: '#facc15', title: 'Nawyk silniejszy niż wiedza', body: 'Wynik podobny do E1. Trudno przestać klikać, gdy palce same rwą się do roboty, prawda? W E3 system Cię wyręczy.' };
  return { icon: '🤔', color: '#f97316', title: 'Chaos wygrał', body: 'Czasem skupienie na kolorach rozprasza. Spokojnie, w następnym etapie „Lina" (Rope) automatycznie zsynchronizuje Twoje tempo.' };
};

const getFeedbackE3 = (r, history, t) => {
  const best = history.reduce((b, x) => x.balance > b.balance ? x : b, history[0]);
  const isBest = r.balance >= best.balance;
  if (t === 'en') {
    if (isBest && r.wipAtEnd === 0) return { icon: '🎯', color: '#4ade80', title: 'Perfect sync!', body: `WIP limit=${r.ropeLimit} made the pizzeria run like clockwork. Zero loss, maximum flow.` };
    if (isBest) return { icon: '✅', color: '#4ade80', title: 'Record result!', body: `Thanks to the button lock (Rope), the oven ran non-stop and you lost nothing during the outage.` };
    if (r.wipAtEnd > 3) return { icon: '🔧', color: '#facc15', title: 'Buffer too large', body: `At WIP=${r.ropeLimit} there was still too much on the counter. During outage you still risk loss. Try WIP=1 or 2.` };
    return { icon: '⬇️', color: '#f97316', title: 'Buffer too small', body: `Oven stood idle! WIP limit=${r.ropeLimit} was too cautious. The bottleneck must always have a small buffer to keep earning.` };
  }
  if (isBest && r.wipAtEnd === 0) return { icon: '🎯', color: '#4ade80', title: 'Idealna synchronizacja!', body: `Limit WIP=${r.ropeLimit} sprawił, że pizzeria działała jak szwajcarski zegarek. Zero straty, maksymalny przepływ.` };
  if (isBest) return { icon: '✅', color: '#4ade80', title: 'Rekordowy wynik!', body: `Dzięki blokadzie przycisku (Rope), piec pracował non-stop, a Ty nie straciłeś ani centa podczas awarii.` };
  if (r.wipAtEnd > 3) return { icon: '🔧', color: '#facc15', title: 'Bufor zbyt duży', body: `Przy WIP=${r.ropeLimit} na blacie wciąż było za ciasno. Podczas awarii wciąż ryzykujesz stratę. Spróbuj WIP=1 lub 2.` };
  return { icon: '⬇️', color: '#f97316', title: 'Bufor zbyt mały', body: `Piec stał pusty! Limit WIP=${r.ropeLimit} był zbyt ostrożny. Wąskie gardło musi mieć zawsze mały zapas, by nigdy nie przestało zarabiać.` };
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
const OvenSVG = ({ active, progress, pizzaPhase, lang }) => {
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
  const emptyLabel = lang === 'en' ? 'EMPTY' : 'PUSTY';
  const bottleneck = lang === 'en' ? 'BOTTLENECK' : 'WĄSKIE GARDŁO';

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
      {!active && <text x="55" y="56" textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#334155" fontWeight="600">{emptyLabel}</text>}
      <text x="55" y="101" textAnchor="middle" fontFamily="sans-serif" fontSize="7.5" fontWeight="700" fill={lblColor} letterSpacing="0.5">{bottleneck}</text>
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
const OutageScreen = ({ wip, onUnlock, timeLeft, onBalanceUpdate, lang }) => {
  const tr = T[lang];
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
      <h2 className="text-3xl font-black text-red-500">{tr.outagePowerTitle}</h2>
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
          <span className="text-[10px] text-red-700 uppercase tracking-widest font-bold">{tr.outageAttemptLabel}</span>
        </div>
        <div className="text-4xl font-black text-red-400 text-center">-{totalLoss}$</div>
        <div className="text-xs text-red-800 text-center">{exploded} {tr.outageUnbaked}</div>
        <div className="w-full h-2 bg-red-900 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 rounded-full transition-all duration-700"
            style={{ width: `${100 - (exploded / Math.max(count, 1)) * 100}%` }}/>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-red-800">{tr.outageDestroyed}</span>
          <span className="text-red-400 font-bold">{exploded} / {wipCount.current}</span>
        </div>
      </div>
      <div className="mt-2">
        {locked
          ? <div className="flex flex-col items-center gap-1">
              <span className="text-5xl font-black text-slate-700">{countdown}</span>
              <p className="text-slate-700 text-[10px] uppercase tracking-widest">{tr.outageWait}</p>
            </div>
          : <div className="flex flex-col items-center gap-2 animate-pulse">
              <div className="w-14 h-14 rounded-full border-4 border-orange-500 flex items-center justify-center text-2xl">👆</div>
              <p className="text-orange-400 text-xs font-bold uppercase tracking-widest">{tr.outageTouchResult}</p>
            </div>
        }
      </div>
      <p className="text-[9px] text-slate-800 uppercase mt-1">{tr.outageRemaining(timeLeft)}</p>
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
const OeePanel = ({ r, lang }) => {
  const tr = T[lang];
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
        <span style={{ fontWeight: 600, fontSize: 15 }}>{tr.stageLabel(r.attempt)}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: r.balance >= 0 ? '#4ade80' : '#f87171' }}>{fmt(r.balance)}</span>
      </div>
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { label: tr.oeeAvail, val: `${avail}%`, c: ca, d1: tr.oeeAvailD1, d2: tr.oeeAvailD2, d2c: '#f87171' },
            { label: tr.oeePerf,  val: `${perf}%`,  c: cp, d1: `${r.baked} ${lang==='en'?'of':'z'} ${MAX_BY_OVEN} ${lang==='en'?'possible\noven cycles':'możliwych\ncykli pieca'}`, d2: tr.oeePerfD2(MAX_BY_OVEN), d2c: cp.sub },
            { label: tr.oeeQual,  val: `${qual}%`,  c: cq, d1: `${r.baked} ${lang==='en'?'good of':'dobrych z'} ${total}\n${lang==='en'?'produced':'wyprodukowanych'}`, d2: tr.oeeQualD2(r.wipAtEnd), d2c: '#f87171' },
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
            <div style={{ fontSize: 10, color: '#8890aa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{tr.oeeLabel}</div>
            <div style={{ fontSize: 11, color: '#3a4260' }}>{avail}% × {perf}% × {qual}%</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, color: cr.text }}>{oee}%</div>
        </div>
      </div>
    </div>
  );
};

// ─── OEE ANALYSIS ────────────────────────────────────────────────────────────
const OeeAnalysis = ({ history, onClose, lang }) => {
  const tr = T[lang];
  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
      <div className="min-h-screen p-5 flex flex-col">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-black text-white">{tr.oeeTitle}</h2>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Overall Equipment Effectiveness · Pizzeria</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700">
            <X size={18} className="text-slate-400"/>
          </button>
        </div>
        {history.map(r => <OeePanel key={r.attempt} r={r} lang={lang}/>)}
        <button onClick={onClose} className="mt-4 bg-orange-500 hover:bg-orange-400 px-8 py-4 rounded-full font-black text-base transition-colors self-center">
          {tr.oeeClose}
        </button>
      </div>
    </div>
  );
};

// ─── RESULTS TABLE ────────────────────────────────────────────────────────────
const ResultsTable = ({ history, attempt, onRestart, onContinue, onRepeatE3, onRepeatE4, onGoE4, lang }) => {
  const tr = T[lang];
  const [showOee, setShowOee] = useState(false);
  const best = [...history].sort((a, b) => b.balance - a.balance)[0];
  const bestAttempt = best?.attempt;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-5 pb-12 gap-6">
      {showOee && <OeeAnalysis history={history} onClose={() => setShowOee(false)} lang={lang}/>}

      <div className="text-center pt-4">
        <Trophy size={44} className="text-yellow-400 mx-auto mb-3"/>
        <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">{tr.summaryTitle}</h1>
        <p className="text-slate-600 text-[10px] uppercase tracking-widest">Drum · Buffer · Rope</p>
      </div>

      <div className="w-full max-w-lg space-y-3">
        {history.map((r, i) => {
          const isBest = r.attempt === bestAttempt;
          const { ovenOee } = calcOee(r);
          const avail = 67;
          const perf  = Math.min(100, Math.round((r.baked / MAX_BY_OVEN) * 100));
          const total = r.baked + r.wipAtEnd;
          const qual  = total === 0 ? 100 : Math.round((r.baked / total) * 100);
          const oeePiz = Math.round(avail * perf * qual / 10000);
          return (
            <div key={i} className={`rounded-2xl border overflow-hidden ${isBest ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-slate-800'}`}>
              <div className={`flex items-center justify-between px-4 py-2.5 ${isBest ? 'bg-orange-500/10' : 'bg-slate-900'}`}>
                <span className="font-bold text-sm flex items-center gap-2">
                  {isBest && <Trophy size={12} className="text-yellow-400"/>}
                  {tr.stageBest(r.attempt)}
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

      <div className="w-full max-w-lg rounded-3xl overflow-hidden border border-orange-900">
        <div className="bg-gradient-to-r from-orange-950 to-red-950 px-5 py-3 flex items-center gap-3">
          <span className="text-2xl">🥁</span>
          <div>
            <p className="font-black text-orange-400 text-base">{tr.dbrTitle}</p>
            <p className="text-orange-800 text-[9px] uppercase tracking-widest">{tr.dbrSub}</p>
          </div>
        </div>
        <div className="bg-slate-900 px-5 py-4">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[['🥁',tr.dbrDrum,'text-orange-400',tr.dbrDrumD],['🛡️',tr.dbrBuffer,'text-blue-400',tr.dbrBufferD],['🪢',tr.dbrRope,'text-green-400',tr.dbrRopeD]].map(([e,n,c,d]) => (
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
            <ChevronRight size={18}/> {tr.btnContinue(attempt)}
          </button>
        )}
        {onRepeatE3 && (
          <button onClick={onRepeatE3}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-slate-200">
            <RotateCcw size={16} className="text-orange-400"/> {tr.btnRepeatE3}
          </button>
        )}
        {onRepeatE4 && (
          <button onClick={onRepeatE4}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-white"
            style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            {tr.btnRepeatE4}
          </button>
        )}
        {onGoE4 && !onRepeatE4 && (
          <button onClick={onGoE4}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-white"
            style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow:'0 0 20px rgba(124,58,237,0.4)' }}>
            {tr.btnGoE4}
          </button>
        )}
        <button onClick={() => setShowOee(true)}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-slate-200">
          <BarChart2 size={18} className="text-orange-400"/> {tr.btnOee}
        </button>
        <button onClick={onRestart}
          className="flex items-center justify-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-black text-base hover:bg-orange-400 transition-colors">
          <RotateCcw size={16}/> {tr.btnRestart}
        </button>
      </div>
    </div>
  );
};

// ─── ATTEMPT RESULT ───────────────────────────────────────────────────────────
const AttemptResult = ({ result, attempt, onNext, isLast, history, onRetry, onRepeatE3, onGoE4, lang }) => {
  const tr = T[lang];
  const { ovenOee } = calcOee(result);
  const prevResult = history.length >= 2 ? history[history.length - 2] : null;

  const feedback = attempt === 1 ? getFeedbackE1(result, lang)
                 : attempt === 2 ? getFeedbackE2(result, prevResult, lang)
                 : getFeedbackE3(result, history, lang);

  const needsRetry = attempt === 2 && prevResult && result.balance <= prevResult.balance;

  const avail = 67;
  const perf  = Math.min(100, Math.round((result.baked / MAX_BY_OVEN) * 100));
  const total = result.baked + result.wipAtEnd;
  const qual  = total === 0 ? 100 : Math.round((result.baked / total) * 100);
  const oeePiz = Math.round(avail * perf * qual / 10000);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 pb-10 gap-4">
      <div className="text-center pt-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{tr.resultStage(attempt)}</p>
        <div className={`text-5xl font-black ${result.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>
          {fmt(result.balance)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: tr.bakedLabel, value: result.baked, color: 'text-orange-400' },
          { label: tr.wipLabel, value: result.wipAtEnd, color: result.wipAtEnd > 0 ? 'text-red-400' : 'text-slate-500' },
          { label: tr.oeOvenLabel, value: `${ovenOee}%`, color: ovenOee >= 70 ? 'text-green-400' : 'text-orange-400' },
          { label: tr.oeePizLabel, value: `${oeePiz}%`, color: oeePiz >= 50 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <p className="text-[8px] text-slate-500 uppercase mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4 flex flex-col gap-2"
        style={{ background: `${feedback.color}11`, borderColor: `${feedback.color}44` }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{feedback.icon}</span>
          <span className="font-black text-base" style={{ color: feedback.color }}>{feedback.title}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{feedback.body}</p>
      </div>

      {attempt === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[9px] text-orange-400 uppercase tracking-widest font-bold mb-2">{tr.drumKnow}</p>
          <p className="text-sm text-slate-400 leading-relaxed">{tr.drumKnowBody()}</p>
        </div>
      )}
      {attempt === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[9px] text-blue-400 uppercase tracking-widest font-bold mb-2">{tr.bufferKnow}</p>
          <p className="text-sm text-slate-400 leading-relaxed">{tr.bufferKnowBody}</p>
        </div>
      )}
      {attempt === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-[9px] text-green-400 uppercase tracking-widest font-bold mb-2">{tr.ropeKnow}</p>
          <p className="text-sm text-slate-400 leading-relaxed">{tr.ropeKnowBody}</p>
        </div>
      )}

      {prevResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">{tr.compareWith(attempt - 1)}</p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-[8px] text-slate-600">{lang === 'en' ? 'Stage' : 'Etap'} {attempt - 1}</p>
              <p className={`text-lg font-black ${prevResult.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>{fmt(prevResult.balance)}</p>
            </div>
            <div className="text-2xl">
              {result.balance > prevResult.balance ? '📈' : result.balance < prevResult.balance ? '📉' : '↔️'}
            </div>
            <div className="text-center">
              <p className="text-[8px] text-slate-600">{lang === 'en' ? 'Stage' : 'Etap'} {attempt}</p>
              <p className={`text-lg font-black ${result.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>{fmt(result.balance)}</p>
            </div>
          </div>
        </div>
      )}

      {needsRetry && (
        <div className="bg-yellow-950 border border-yellow-800 rounded-2xl p-4">
          <p className="text-[9px] text-yellow-400 uppercase tracking-widest font-bold mb-1">{tr.almostTitle}</p>
          <p className="text-sm text-yellow-200 leading-relaxed mb-3">{tr.almostBody}</p>
          <div className="flex gap-2">
            <button onClick={onRetry}
              className="flex-1 py-3 rounded-full bg-yellow-600 hover:bg-yellow-500 font-black text-sm text-white transition-colors">
              {tr.btnRetry}
            </button>
            <button onClick={onNext}
              className="flex-1 py-3 rounded-full bg-slate-700 hover:bg-slate-600 font-black text-sm text-slate-200 transition-colors">
              {tr.btnForward}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-4">
        {onRepeatE3 && (
          <button onClick={onRepeatE3}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-slate-200">
            <RotateCcw size={16} className="text-orange-400"/> {tr.btnRepeatE3Short}
          </button>
        )}
        {onGoE4 && (
          <button onClick={onGoE4}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-base transition-colors text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
            {tr.btnGoE4}
          </button>
        )}
        {!needsRetry && !onGoE4 && (
          <button onClick={onNext}
            className="flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-400 px-10 py-4 rounded-full font-black text-lg transition-colors">
            {isLast ? <><Trophy size={18}/> {tr.summaryBtn}</> : <><ChevronRight size={18}/> {tr.nextStage(attempt)}</>}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── EDU SCREEN ───────────────────────────────────────────────────────────────
const EduScreen = ({ result, attempt, history, onNext, lang }) => {
  const tr = T[lang];
  const [simWip, setSimWip] = useState(2);
  const prevResult = history.length >= 2 ? history[history.length - 2] : null;
  const feedback = attempt === 1 ? getFeedbackE1(result, lang)
                 : attempt === 2 ? getFeedbackE2(result, prevResult, lang)
                 : getFeedbackE3(result, history, lang);

  const simLt   = Math.max(3, (simWip + 1) * 3);
  const simRisk = simWip * 50;
  const ltCol   = simLt <= 3 ? '#4ade80' : simLt <= 9 ? '#eab308' : '#ef4444';

  const knowledge = lang === 'en' ? {
    1: { icon: '🥁', color: '#f97316', title: 'What is the Drum?',
         body: 'Your Bottleneck — the Oven. It "beats the tempo" of the entire pizzeria. You can\'t earn more than the Oven allows. If the chef works faster than the drum — a jam builds up.',
         sim: true, simTitle: 'Chaos — production with no limits.' },
    2: { icon: '🛡️', color: '#378ADD', title: 'What is the Buffer?',
         body: 'Stock before the oven. Must be "just right" — big enough for the oven to always have work, small enough not to lose a fortune when the lights go out.',
         sim: false, simTitle: 'Awareness — react to signals from the counter.' },
    3: { icon: '🪢', color: '#4ade80', title: 'What is the Rope?',
         body: 'The mechanism that tells the chef: "STOP, don\'t make another pizza, the buffer is full!" The Rope ties the chef\'s pace to the oven\'s pace. It eliminates wasteful overproduction.',
         sim: true, simTitle: 'Synchronization — Rope takes control of the pace.' },
    4: { icon: '📊', color: '#7c3aed', title: 'Lead Time',
         body: 'LT is the time a pizza spends in your pizzeria. WIP is the enemy of Lead Time! More pizzas on the counter = longer wait for each. Short LT = fast sales and no losses.',
         sim: true, simTitle: 'Optimization — how WIP affects Lead Time.' },
  } : {
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
  const k = knowledge[attempt] || knowledge[4];
  const riskLabel = lang === 'en' ? 'Outage risk' : 'Ryzyko awarii';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-5 gap-4" onClick={onNext}
      style={{ cursor: 'pointer' }}>
      <div className="text-center pt-4">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{tr.resultStage(attempt)}</p>
        <div className={`text-5xl font-black ${result.balance >= 0 ? 'text-green-400' : 'text-red-500'}`}>
          {fmt(result.balance)}
        </div>
        <div className="flex justify-center gap-4 mt-3 text-sm">
          <span className="text-orange-400 font-bold">🍕 {result.baked}</span>
          <span className={result.wipAtEnd > 0 ? 'text-red-400 font-bold' : 'text-slate-600'}>🗑 {result.wipAtEnd}</span>
          {result.avgLt && <span className="text-blue-400 font-bold">⏱ {result.avgLt}s</span>}
        </div>
      </div>

      <div className="rounded-2xl border p-4 flex flex-col gap-2"
        style={{ background: `${feedback.color}11`, borderColor: `${feedback.color}44` }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{feedback.icon}</span>
          <span className="font-black text-base" style={{ color: feedback.color }}>{feedback.title}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{feedback.body}</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{k.icon}</span>
          <span className="font-black text-sm" style={{ color: k.color }}>{k.title}</span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{k.body}</p>
      </div>

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
              <div className="text-[8px] text-red-700 uppercase mb-1">{riskLabel}</div>
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
          {tr.touchSummary}
        </div>
      </div>
    </div>
  );
};

// ─── ROPE SETUP ───────────────────────────────────────────────────────────────
const RopeSetup = ({ initialRope, onStart, lang }) => {
  const tr = T[lang];
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    if (selected !== null) { setPulse(false); return; }
    const id = setInterval(() => setPulse(p => !p), 600);
    return () => clearInterval(id);
  }, [selected]);

  const options = [null, 1, 2, 3, 4, 5];

  const desc = selected === null
    ? tr.ropeInf
    : selected <= 2 ? tr.rope12(selected)
    : selected <= 3 ? tr.rope3(selected)
    : tr.rope45(selected);

  const descColor = selected === null ? '#ef4444'
    : selected <= 2 ? '#facc15'
    : selected <= 3 ? '#4ade80'
    : '#facc15';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🪢</div>
        <h1 className="text-2xl font-black text-white mb-1">{tr.ropeTitle}</h1>
        <p className="text-slate-500 text-sm">{tr.ropeSub}</p>
      </div>

      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{tr.ropeHowLabel}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          {tr.ropeHowDesc(<strong className="text-green-400">{tr.ropeBelowLimit}</strong>)}
        </p>
        <div className="flex items-center gap-2 mt-1 p-2 rounded-xl" style={{ background: '#0d1520', border: '1px solid #1e3a5f' }}>
          <span className="text-base">🥁</span>
          <p className="text-xs text-blue-300">{tr.ropeDrumTip}</p>
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">
          {selected === null ? `👇 ${tr.ropeChooseLabel}` : tr.ropeChosenLabel}
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
                  border: isSelected ? '2px solid #fb923c' : shouldPulse ? '2px solid #f9731688' : '2px solid #334155',
                  boxShadow: isSelected ? '0 0 20px rgba(249,115,22,0.5)' : shouldPulse ? '0 0 10px rgba(249,115,22,0.2)' : 'none',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}>
                {v === null ? '∞' : v}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="rounded-xl p-3 text-center transition-all"
            style={{ background: `${descColor}11`, border: `1px solid ${descColor}44` }}>
            <p className="text-sm font-bold" style={{ color: descColor }}>{desc}</p>
          </div>
        )}
      </div>

      {selected !== null && (
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-3 text-center">{tr.ropeSignalLabel}</p>
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

      {selected !== null && (
        <button onClick={() => onStart(selected)}
          className="w-full max-w-sm py-4 rounded-full font-black text-xl text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 0 30px rgba(249,115,22,0.5)' }}>
          {tr.ropeStartBtn}
        </button>
      )}

      <style>{`
        @keyframes robotBounce { from{transform:translate(-50%,-50%) translateY(0)} to{transform:translate(-50%,-50%) translateY(-5px)} }
      `}</style>
    </div>
  );
};

// ─── E2 INTRO ─────────────────────────────────────────────────────────────────
const E2Intro = ({ onStart, lang }) => {
  const tr = T[lang];
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 gap-5">
      <div className="text-center pt-6">
        <div style={{ fontSize: 44, marginBottom: 12 }}>👀</div>
        <h1 className="text-2xl font-black mb-2">{tr.e2Title}</h1>
        <p className="text-slate-500 text-sm">{tr.e2Sub}</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
          🎨 {tr.e2ColorHint}
        </p>
        {[
          { dot: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', title: tr.e2Green, sub: tr.e2GreenSub, tc: '#4ade80', sc: '#16a34a' },
          { dot: '#eab308', bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.3)',  title: tr.e2Yellow, sub: tr.e2YellowSub, tc: '#facc15', sc: '#a16207' },
          { dot: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  title: tr.e2Red, sub: tr.e2RedSub, tc: '#f87171', sc: '#991b1b', blink: true },
        ].map(({ dot, bg, border, title, sub, tc, sc, blink }) => (
          <div key={title} style={{ background: bg, border: `0.5px solid ${border}`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flexShrink: 0,
              boxShadow: `0 0 8px ${dot}`, animation: blink ? 'pulse 0.6s ease-in-out infinite' : 'none' }}/>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: tc }}>{title}</div>
              <div style={{ fontSize: 11, color: sc, marginTop: 1 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#071428', border: '1px solid #1e3a5f', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>👨‍🍳</span>
        <p style={{ fontSize: 13, color: '#93c5fd', lineHeight: 1.6 }}>
          {tr.e2ChefTip(<strong style={{ color: '#60a5fa' }}>{tr.e2ChefSpeed}</strong>)}
        </p>
      </div>

      <button onClick={onStart}
        className="w-full py-4 rounded-full font-black text-xl text-white mt-auto transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 0 24px rgba(249,115,22,0.4)' }}>
        <ChevronRight size={20}/> {tr.e2StartBtn}
      </button>
    </div>
  );
};

// ─── E4 SETUP ─────────────────────────────────────────────────────────────────
const E4Setup = ({ onStart, lang }) => {
  const tr = T[lang];
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
    : selected <= 2 ? tr.e4Limit12(selected)
    : selected <= 3 ? tr.e4Limit3(selected)
    : tr.e4Limit45(selected);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 gap-5">
      <div className="text-center pt-4">
        <div style={{ fontSize:40, marginBottom:8 }}>📊</div>
        <h1 className="text-2xl font-black mb-1" style={{ background:'linear-gradient(135deg,#7c3aed,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          {tr.e4Title}
        </h1>
        <p className="text-slate-500 text-sm">{tr.e4Sub}</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">{tr.e4LtTitle}</p>
        <p className="text-sm text-slate-300 leading-relaxed">{tr.e4LtBody}</p>
        <div className="flex gap-2">
          {[['WIP=1','6s','#4ade80'],['WIP=3','12s','#eab308'],['WIP=8','27s','#ef4444']].map(([lbl,lt,c]) => (
            <div key={lbl} style={{ flex:1, background:'#0d1520', border:`0.5px solid ${c}44`, borderRadius:8, padding:'6px 4px', textAlign:'center' }}>
              <div style={{ fontSize:13, fontWeight:700, color:c, fontFamily:'monospace' }}>{lt}</div>
              <div style={{ fontSize:7, color:'#475569' }}>{lbl}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">{tr.e4LtNote}</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">{tr.e4ChartLabel}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{tr.e4ChartDesc}</p>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ background:'#0d1520', border:'0.5px solid #7c3aed44', borderRadius:8, padding:'6px 10px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:8, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700 }}>{tr.e4AvgLt}</span>
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
          <p style={{ fontSize:9, color:'#334155', textAlign:'center', marginTop:2 }}>{tr.e4ChartNote}</p>
        </div>
      </div>

      <div style={{ background:'#071428', border:'1px solid #1e3a5f', borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
        <span style={{ fontSize:22, flexShrink:0 }}>👨‍🍳</span>
        <p style={{ fontSize:13, color:'#93c5fd', lineHeight:1.6 }}>{tr.e4ChefTip}</p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-[9px] text-purple-400 uppercase tracking-widest font-bold">{tr.e4RopeLabel}</p>
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
          className="w-full py-4 rounded-full font-black text-xl text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background:'linear-gradient(135deg,#f97316,#ea580c)', boxShadow:'0 0 24px rgba(249,115,22,0.4)' }}>
          <ChevronRight size={20}/> {tr.e4StartBtn}
        </button>
      )}
    </div>
  );
};

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
const GameScreen = ({ attempt, onFinish, showTrafficLight, initialRope, lang }) => {
  const tr = T[lang];
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
  const [pizzaHistory, setPizzaHistory] = useState([]);
  const pizzaIdRef      = useRef(0);
  const autoIntervalRef = useRef(null);
  const robotTapsRef    = useRef(0);
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
          <p className="text-[8px] text-slate-600 uppercase tracking-widest">{tr.phase(attempt, 3)}</p>
          <div className={`text-4xl font-black font-mono tabular-nums leading-none ${isOutage ? 'text-red-500 animate-pulse' : timeLeft <= 15 ? 'text-orange-400' : 'text-white'}`}>
            {timeLeft}<span className="text-sm text-slate-500">s</span>
          </div>
        </div>
      </div>

      {showOutage ? (
        <div className="flex-1 flex items-start justify-center pt-2">
          <OutageScreen wip={wip} onUnlock={handleOutageUnlock} timeLeft={timeLeft} onBalanceUpdate={(penalty) => updBalance(balanceRef.current - penalty)} lang={lang}/>
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
                      {wip === 0 ? tr.wipDangerLow : wip <= 2 ? tr.wipOk : wip <= 4 ? tr.wipWarn : tr.wipDangerHigh}
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
                <span className="text-[7px] text-orange-800 uppercase tracking-widest font-bold">{tr.wipRaw}</span>
                <div className="flex flex-wrap gap-1 flex-1 items-start content-start">
                  {wip === 0 && <span className="text-orange-900 text-[9px] italic">{tr.wipEmpty}</span>}
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
              <OvenSVG active={ovenActive} progress={ovenProgress} pizzaPhase={pizzaPhase} lang={lang}/>
            </div>

            <div className="flex-1 bg-green-950 border border-green-900 rounded-2xl p-2 min-h-[100px] flex flex-col gap-1">
              <span className="text-[7px] text-green-800 uppercase tracking-widest font-bold">{tr.wipDone}</span>
              <div className="flex flex-wrap gap-1 flex-1 items-start content-start">
                {baked === 0 && <span className="text-green-900 text-[9px] italic">{tr.wipReady}</span>}
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
              <div className="bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{tr.ropeLimitLabel}</span>
                  <span className="text-[9px] text-slate-600">{ropeLimit === null ? tr.ropeNoLimit : tr.ropeMax(ropeLimit)}</span>
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
                <div style={{ position: 'absolute', right: '10%', top: 0, fontSize: 7, color: '#475569', textTransform: 'uppercase' }}>{lang === 'en' ? 'BUTTON' : 'PRZYCISK'}</div>
                <div style={{ position: 'absolute', right: '8%', width: 10, height: 10, borderRadius: '50%', background: ropeLimit !== null && wip >= ropeLimit ? '#334155' : '#f97316', boxShadow: ropeLimit !== null && wip >= ropeLimit ? 'none' : '0 0 8px rgba(249,115,22,0.8)', transform: 'translateX(50%)' }}/>
              </div>

              {attempt >= 4 && (() => {
                const elapsed = Math.max(1, GAME_DURATION - timeLeft);
                const maxPossibleTaps = elapsed * WORLD_RECORD_CPS;
                const chefOee = Math.min(Math.round(robotTapsRef.current / maxPossibleTaps * 100), 100);
                const prodElapsed = Math.min(elapsed, PROD_TIME);
                const maxByOvenSoFar = Math.max(1, Math.floor(prodElapsed / (OVEN_MS/1000)));
                const ovenOee = Math.min(Math.round(baked / maxByOvenSoFar * 100), 100);
                const availOee = Math.round(Math.min(prodElapsed, PROD_TIME) / GAME_DURATION * 100);
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
                    <div style={{ display:'flex', gap:4 }}>
                      {[
                        { label: tr.proOeeChef, pct:chefOee, col:robotBlockedRef.current?'#ef4444':'#378ADD', sub:robotBlockedRef.current?tr.proRobotStop:`${robotTapsRef.current} taps` },
                        { label: tr.proOeeOven, pct:ovenOee, col:ovenCol, sub:`${baked} ${lang==='en'?'of':'z'} ${Math.floor(PROD_TIME/(OVEN_MS/1000))}` },
                        { label: tr.proOeePiz,  pct:pizOee,  col:pizCol,  sub:`${availOee}%×${ovenOee}%×${qualOee}%` },
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
                    <div style={{ background:'#0d1520', border:'0.5px solid #1e3a5f', borderRadius:8, padding:'5px 8px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <span style={{ fontSize:7, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>{tr.proLtLabel}</span>
                        <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:ltCol }}>{estLt}s</span>
                      </div>
                      <div style={{ height:3, background:'#1e293b', borderRadius:2 }}>
                        <div style={{ height:'100%', borderRadius:2, background:ltCol, width:`${Math.min(estLt/15*100,100)}%`, transition:'all 0.4s' }}/>
                      </div>
                      <div style={{ fontSize:6, color:'#475569', marginTop:2 }}>{tr.proLtWaiting(wip, estLt)}</div>
                    </div>
                    <div style={{ background:'#0d1520', border:'0.5px solid #1e3a5f', borderRadius:8, padding:'5px 8px', display:'flex', flexDirection:'column', gap:3 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:1 }}>
                        <span style={{ fontSize:6, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>{tr.proLtPer}</span>
                        <span style={{ fontSize:6, color:'#475569' }}>{pizzaHistory.length} szt.</span>
                      </div>
                      {pizzaHistory.length === 0 && (
                        <div style={{ fontSize:7, color:'#334155', textAlign:'center', padding:'4px 0' }}>{tr.proLtFirst}</div>
                      )}
                      {pizzaHistory.length > 0 && (() => {
                        const avgLt = Math.round(pizzaHistory.reduce((s,p)=>s+p.lt,0)/pizzaHistory.length);
                        const avgCol = avgLt<=3?'#4ade80':avgLt<=6?'#eab308':'#ef4444';
                        return (
                          <div style={{ marginBottom:3 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                              <span style={{ fontSize:6, color:'#475569' }}>{tr.proAvgLt}</span>
                              <span style={{ fontSize:10, fontWeight:700, fontFamily:'monospace', color:avgCol }}>{avgLt}s</span>
                            </div>
                            <div style={{ height:9, background:'#1e293b', borderRadius:3 }}>
                              <div style={{ height:'100%', borderRadius:3, background:avgCol, width:`${Math.min(avgLt/30*100,100)}%`, transition:'all 0.5s', opacity:0.9 }}/>
                            </div>
                          </div>
                        );
                      })()}
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
                  {attempt >= 3 && ropeLimit !== null && wip >= ropeLimit ? tr.tapBtnRope : tr.tapBtn}
                </span>
              </button>
            </div>
            <p className="text-[8px] text-slate-700 uppercase tracking-widest">{tr.tapsCount(taps, TAPS_PER_PIZZA)}</p>
            <p className="text-[9px] text-orange-600 font-bold">{tr.tapHint}</p>
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

// ─── LANGUAGE SELECTOR ────────────────────────────────────────────────────────
const LangSelector = ({ onSelect }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8"
    style={{ background: 'radial-gradient(ellipse at top, #1a1040 0%, #020617 60%)' }}>
    <div className="text-7xl" style={{ animation: 'bounce 1s infinite' }}>🍕</div>
    <div className="text-center">
      <h1 className="text-3xl font-black text-white mb-1">PizzaTOC</h1>
      <p className="text-slate-500 text-sm">Theory of Constraints · Game</p>
    </div>
    <div className="flex flex-col gap-4 w-full max-w-xs">
      <button
        onClick={() => onSelect('pl')}
        className="flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xl text-white transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e4080)', border: '2px solid #2a5090', boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}>
        <span className="text-2xl">🇵🇱</span> Polski
      </button>
      <button
        onClick={() => onSelect('en')}
        className="flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xl text-white transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg,#1a3020,#1a4030)', border: '2px solid #2a6040', boxShadow: '0 0 20px rgba(74,222,128,0.15)' }}>
        <span className="text-2xl">🇬🇧</span> English
      </button>
    </div>
    <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
  </div>
);

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang,       setLang]       = useState(null); // null = lang selection screen
  const [phase,      setPhase]      = useState('START');
  const [attempt,    setAttempt]    = useState(1);
  const [history,    setHistory]    = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [initialRope, setInitialRope] = useState(3);
  const MAX_ATTEMPTS = 4;

  // Language selection screen
  if (!lang) return <LangSelector onSelect={(l) => setLang(l)}/>;

  const tr = T[lang];

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
    if (next === 2) { setPhase('E2_INTRO'); }
    else if (next === 3) { setPhase('ROPE_SETUP'); }
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
        {tr.startTitle.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br/>}</span>)}
      </h1>
      <p className="text-slate-400 mb-6 text-sm italic">{tr.startSubtitle}</p>
      <div className="w-full max-w-xs mb-8 text-left space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">👨‍🍳</span>
          <p className="text-sm text-slate-200 leading-relaxed"><strong className="text-white">{tr.tapFast}</strong>{tr.tapDesc}</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🔥</span>
          <p className="text-sm text-slate-200 leading-relaxed"><strong className="text-white">{lang === 'en' ? 'Oven' : 'Piec'}</strong> {tr.ovenDesc}</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">👆</span>
          <p className="text-sm text-slate-200 leading-relaxed">
            <strong className="text-orange-400">{lang === 'en' ? '5 taps' : '5 tapów'}</strong>
            {lang === 'en' ? ' = 1 raw pizza on the counter.' : ' = 1 surowa pizza na blacie.'}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">⚡</span>
          <p className="text-sm text-slate-200 leading-relaxed"><strong className="text-yellow-400">{tr.outageWarn}</strong>{tr.outageDesc}</p>
        </div>
      </div>
      <button onClick={() => setPhase('PLAYING')}
        className="w-full max-w-xs font-black text-xl text-white py-4 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', boxShadow: '0 0 24px rgba(249,115,22,0.4)' }}>
        <ChevronRight size={20}/> {tr.startBtn}
      </button>
      {/* Language switcher */}
      <button onClick={() => setLang(null)}
        className="mt-4 text-slate-600 text-xs underline hover:text-slate-400 transition-colors">
        {lang === 'en' ? '🌐 Zmień język / Change language' : '🌐 Change language / Zmień język'}
      </button>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  );

  if (phase === 'E2_INTRO') return <E2Intro onStart={() => setPhase('PLAYING')} lang={lang}/>;
  if (phase === 'E4_SETUP') return <E4Setup onStart={(rope) => { setInitialRope(rope); setPhase('PLAYING'); }} lang={lang}/>;
  if (phase === 'ROPE_SETUP') return <RopeSetup initialRope={initialRope} onStart={(rope) => { setInitialRope(rope); setPhase('PLAYING'); }} lang={lang}/>;
  if (phase === 'PLAYING') return <GameScreen key={`${attempt}-${history.length}`} attempt={attempt} onFinish={handleFinish} showTrafficLight={attempt >= 2} initialRope={initialRope} lang={lang}/>;
  if (phase === 'EDU') return <EduScreen result={lastResult} attempt={attempt} history={history} onNext={handleNext} lang={lang}/>;
  if (phase === 'SUMMARY') return (
    <ResultsTable
      history={history}
      attempt={attempt}
      onRestart={handleRestart}
      onContinue={attempt < MAX_ATTEMPTS && attempt !== 3 ? handleContinue : undefined}
      onRepeatE3={attempt >= 3 ? handleRepeatE3 : undefined}
      onRepeatE4={attempt >= 4 ? () => { setAttempt(4); setPhase('E4_SETUP'); } : undefined}
      onGoE4={attempt === 3 ? handleGoE4 : undefined}
      lang={lang}
    />
  );

  return null;
}
