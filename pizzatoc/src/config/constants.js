// ─── GAME CONSTANTS ───────────────────────────────────────────────────────────
export const GAME_DURATION    = 30;
export const OUTAGE_START     = 10;
export const PROD_TIME        = GAME_DURATION - OUTAGE_START;
export const PIZZA_VAL        = 100;
export const PENALTY_RATE     = 50;
export const OVEN_MS          = 3000;
export const TAPS_PER_PIZZA   = 5;
export const WORLD_RECORD_CPS = 10;
export const MAX_BY_OVEN      = Math.floor(PROD_TIME / (OVEN_MS / 1000));

// ─── HELPERS ──────────────────────────────────────────────────────────────────
export const fmt     = (n) => (n < 0 ? `-$${Math.abs(n)}` : `$${n}`);
export const pct     = (v, max) => Math.round(Math.min(v / max, 1) * 100);
export const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

export const calcOee = (r) => {
  const chefOee   = pct(r.maxCps, WORLD_RECORD_CPS);
  const ovenOee   = pct(r.baked * (OVEN_MS / 1000), PROD_TIME);
  const maxByChef = Math.floor((r.totalTaps || 0) / TAPS_PER_PIZZA);
  const lost      = MAX_BY_OVEN - r.baked;
  return { chefOee, ovenOee, maxByChef, maxByOven: MAX_BY_OVEN, lost };
};

export const oeeGrade = (p) => {
  if (p >= 85) return { bg: '#0a1f10', border: '#1a4a25', text: '#4ade80', desc: '#86c898', sub: '#4ade8088' };
  if (p >= 60) return { bg: '#1a1800', border: '#3a3500', text: '#facc15', desc: '#c4a832', sub: '#facc1588' };
  return             { bg: '#1f0a0a', border: '#4a1515', text: '#f87171', desc: '#c06060', sub: '#f8717188' };
};
