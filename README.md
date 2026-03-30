# 🍕 PizzaTOC — Theory of Constraints Game

> **Interaktywna gra mobilna ucząca Theory of Constraints (TOC) przez produkcję pizzy.**  
> *An interactive mobile game teaching Theory of Constraints through pizza production.*

🌐 **[Play / Zagraj →](https://your-netlify-url.netlify.app)**  
*(zastąp URL po deploymencie / replace with your deployment URL)*

---

## 🇵🇱 Polski

### Czym jest gra?

PizzaTOC to gra edukacyjna w przeglądarce (React + Vite) na urządzenia mobilne. Uczysz się koncepcji **Drum–Buffer–Rope** z Theory of Constraints, prowadząc pizzerię przez 30 sekund — z niespodziewaną awarią prądu pośrodku.

### Etapy gry

| Etap | Nazwa | Mechanika |
|------|-------|-----------|
| 1 | **Na maksa** | Tapuj ile wlezie — brak limitów, brak podpowiedzi |
| 2 | **Z sygnałami** | Kolorowy wskaźnik WIP (zielony/żółty/czerwony) |
| 3 | **Rope + Auto** | Robot klika za Ciebie, Ty ustawiasz limit WIP |
| 4 | **Tryb PRO** | Pełny wgląd: OEE, Lead Time per pizza, wykresy |

### Mechanika

- **5 tapów** = 1 surowa pizza na blacie
- **Piec** piecze 1 pizzę co **3 sekundy** (wąskie gardło)
- **Po 20s** — awaria prądu: każda pizza na blacie = **-$50**
- **Upieczona pizza** = **+$100**

### Czego uczysz się grając?

- 🥁 **Drum** — wąskie gardło dyktuje tempo całego systemu
- 🛡️ **Buffer** — mały zapas przed piecem chroni przepływ
- 🪢 **Rope** — sygnał hamujący nadprodukcję
- 📊 **OEE** — Overall Equipment Effectiveness
- ⏱️ **Lead Time** — jak WIP wydłuża czas realizacji (prawo Little'a)

---

## 🇬🇧 English

### What is this game?

PizzaTOC is a browser-based educational game (React + Vite) for mobile devices. You learn **Drum–Buffer–Rope** from Theory of Constraints by running a pizzeria for 30 seconds — with an unexpected power outage in the middle.

### Game Stages

| Stage | Name | Mechanic |
|-------|------|----------|
| 1 | **Full speed** | Tap as fast as you can — no limits, no hints |
| 2 | **With signals** | Color WIP indicator (green/yellow/red) |
| 3 | **Rope + Auto** | Robot taps for you, you set the WIP limit |
| 4 | **PRO mode** | Full visibility: OEE, Lead Time per pizza, charts |

### Game Mechanics

- **5 taps** = 1 raw pizza on the counter
- **Oven** bakes 1 pizza every **3 seconds** (bottleneck)
- **After 20s** — power outage: every pizza on counter = **-$50**
- **Baked pizza** = **+$100**

### What you learn

- 🥁 **Drum** — the bottleneck sets the pace for the whole system
- 🛡️ **Buffer** — small stock before the oven protects flow
- 🪢 **Rope** — signal that stops overproduction
- 📊 **OEE** — Overall Equipment Effectiveness
- ⏱️ **Lead Time** — how WIP extends cycle time (Little's Law)

---

## 🛠️ Tech Stack

- **React 18** + **Vite**
- **Tailwind CSS**
- **Lucide React** (icons)
- Web Audio API (sound effects)
- Navigator Vibration API (haptics)
- Monte Carlo / OEE calculations in-browser

## 🚀 Run locally
```bash
cd pizzatoc
npm install
npm run dev
```

## 📁 Structure
```
pizzatoc/src/
├── App.jsx              # Main component (full game)
├── audio/audio.js       # Web Audio API sound engine
├── components/game/     # Shared UI components
├── config/
│   ├── constants.js     # Game parameters (TAPS_PER_PIZZA, OVEN_MS...)
│   └── feedback.js      # Dynamic feedback messages
└── screens/             # Game screens (GameScreen, EduScreen, etc.)
```

## 🎓 Based on

- **Theory of Constraints** — Eliyahu M. Goldratt, *The Goal*
- **Drum–Buffer–Rope** scheduling methodology
- **OEE** (Overall Equipment Effectiveness) — manufacturing KPI

---

*Made for learning, not for profit. 🍕*
