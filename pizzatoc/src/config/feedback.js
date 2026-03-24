import { fmt, PENALTY_RATE, PIZZA_VAL } from '../config/constants';

export const getFeedbackE1 = (r) => {
  const maxPossible = r.baked * PIZZA_VAL;
  const lostPct = maxPossible > 0 ? Math.round((r.wipAtEnd * PENALTY_RATE) / maxPossible * 100) : 0;
  if (r.wipAtEnd === 0 && r.balance > 0)
    return { icon: '🏆', color: '#4ade80', title: 'Świetna intuicja!', body: `Wyczułeś tempo maszyny. Upiekłeś ${r.baked} pizz bez robienia bałaganu na blacie. Zero strat, czysty zysk!` };
  if (r.balance > 0 && r.wipAtEnd > 0)
    return { icon: '⚠️', color: '#facc15', title: 'Udało się, ale...', body: `Zarobiłeś ${fmt(r.balance)}, ale ${r.wipAtEnd} pizz wylądowało w koszu przez awarię. Gdybyś zwolnił, Twój zysk byłby o ${lostPct}% wyższy.` };
  if (r.wipAtEnd > 5)
    return { icon: '💥', color: '#ef4444', title: 'Zapchany blat!', body: `Piec robi max 6 pizz w tym czasie, a Ty uklepałeś ich ${r.wipAtEnd} na blacie. Reszta to tylko "mrożenie gotówki", którą zabrała awaria.` };
  return { icon: '📉', color: '#ef4444', title: 'Awaria zjadła zysk', body: `Straciłeś $${r.wipAtEnd * PENALTY_RATE} przez nadprodukcję. Klikałeś dla samej frajdy klikania, a piec i tak robił swoje.` };
};

export const getFeedbackE2 = (r, prev) => {
  if (!prev) return { icon: '👀', color: '#378ADD', title: 'Widziałeś kolory?', body: 'Reagowałeś na czerwony alert na blacie. Zrozumiałeś, że nie opłaca się "produkować na zapas".' };
  const diff = r.balance - prev.balance;
  if (diff > 0)
    return { icon: '📈', color: '#4ade80', title: `+${fmt(diff)} względem Etapu 1!`, body: `Uważne patrzenie na blat podniosło Twój zysk. To jest Buffer w praktyce — chronisz piec, ale nie przeginasz.` };
  if (diff === 0)
    return { icon: '↔️', color: '#facc15', title: 'Nawyk silniejszy niż wiedza', body: 'Wynik podobny do E1. Trudno przestać klikać, gdy palce same rwą się do roboty, prawda? W E3 system Cię wyręczy.' };
  return { icon: '🤔', color: '#f97316', title: 'Chaos wygrał', body: 'Czasem skupienie na kolorach rozprasza. Spokojnie, w następnym etapie "Lina" (Rope) automatycznie zsynchronizuje Twoje tempo.' };
};

export const getFeedbackE3 = (r, history) => {
  const best = history.reduce((b, x) => x.balance > b.balance ? x : b, history[0]);
  const isBest = r.balance >= best.balance;
  if (isBest && r.wipAtEnd === 0)
    return { icon: '🎯', color: '#4ade80', title: 'Idealna synchronizacja!', body: `Limit WIP=${r.ropeLimit} sprawił, że pizzeria działała jak szwajcarski zegarek. Zero straty, maksymalny przepływ.` };
  if (isBest)
    return { icon: '✅', color: '#4ade80', title: 'Rekordowy wynik!', body: `Dzięki blokadzie przycisku (Rope), piec pracował non-stop, a Ty nie straciłeś ani centa podczas awarii.` };
  if (r.wipAtEnd > 3)
    return { icon: '🔧', color: '#facc15', title: 'Bufor zbyt duży', body: `Przy WIP=${r.ropeLimit} na blacie wciąż było za ciasno. Spróbuj WIP=1 lub 2.` };
  return { icon: '⬇️', color: '#f97316', title: 'Bufor zbyt mały', body: `Piec stał pusty! Limit WIP=${r.ropeLimit} był zbyt ostrożny. Wąskie gardło musi mieć zawsze mały zapas.` };
};
