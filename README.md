# Workouty 🏋️

A personal workout planner and logger, inspired by the **Strong** app. Plan
your training, log every set, and see how you're progressing — all stored
locally in your browser.

## Features

- **Plans (templates)** — create programs like *Push Pull Legs* or
  *Upper/Lower*, each with its days and exercises (target sets × rep ranges).
- **Workout logging** — start a day from a plan and the app shows what you did
  **last time** (weights, reps, sets) and pre-fills your sets. Tick sets off
  as you go, add/remove sets and exercises freely.
- **Exercise database** — 50+ built-in exercises, each explaining what it does
  and which muscles it targets (primary and secondary). Add your own custom
  exercises too.
- **How-to demos** — every built-in exercise has an animated demonstration
  (start/end position, played like a GIF) right inside the exercise view,
  plus a one-tap **Watch on YouTube** button for a full video. Demo images
  come from the public-domain
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db).
- **Muscle coverage analysis** — for any plan, see weekly sets per muscle
  group and instantly spot muscles you're under-training.
- **Analytics** — volume / sets / workouts per week, per-exercise progress
  (heaviest set, estimated 1RM, volume over time), personal records, and what
  muscles you actually trained in the last 7/30 days.
- **Three ways to make a new plan:**
  1. **Generate for me** — answer 3 questions (days/week, goal, experience)
     and get a complete balanced plan with a coverage preview.
  2. **Ask an AI / coach** — the app writes a prompt for you; paste it into
     Claude, ChatGPT or any assistant, paste the JSON answer back, and the
     plan is imported (unknown exercises are created automatically).
  3. **Import / paste JSON** — copy the plan format, give it to any AI
     ("give me the exercises in this format"), then paste the JSON back or
     upload it as a file.
  4. **Build manually** — full editor for days, exercises, sets and reps.
- **Backup** — export/import all your data as a JSON file (Settings tab).
- kg / lb unit support.

## Run it

```bash
npm install
npm run dev      # development server
npm run build    # production build (output in dist/)
npm test         # unit + UI smoke tests
```

Open the printed URL on your phone or computer. The app is mobile-first —
add it to your home screen for a native-like experience.

> **Note:** data lives in the browser's localStorage on the device you use.
> Use *Settings → Export backup* to move data between devices.

## Tech

React 18 + TypeScript + Vite, Recharts for charts, no backend — everything is
local and private.
