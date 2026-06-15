# Workouty 🏋️

A personal workout planner and logger, inspired by the **Strong** app. Plan
your training, log every set, and see how you're progressing — all stored
locally in your browser.

## Features

- **Plans (templates)** — create programs like *Push Pull Legs* or
  *Upper/Lower*, each with its days and exercises (target sets × rep ranges).
- **Workout logging** — start a day from a plan and the app shows what you did
  **last time** (weights, reps, sets) and pre-fills your sets. Enter your first
  set and the weight/reps flow down to the remaining sets automatically. Tick
  sets off as you go, add/remove sets and exercises freely.
- **Rest timer** — ticking a set off starts a rest countdown; the app chimes
  and vibrates when it's time for your next set. Add/subtract 15s or skip on
  the fly, and set your default rest length (or turn it off) in Settings.
- **Progressive overload** — the app helps you add weight over time. Hit all
  your reps at the top of the range and it pre-fills a heavier weight next
  session (a per-exercise step you can tune), and you can set an explicit
  target weight to chase that clears itself once you reach it.
- **Exercise database** — 50+ built-in exercises, each explaining what it does
  and which muscles it targets (primary and secondary). Add your own custom
  exercises too.
- **Per-exercise notes** — pin a personal reminder to any exercise (e.g.
  *“machine weight excludes the bar”* or *“use the close grip”*). The note
  shows up right on the logging screen every time you train that exercise, and
  syncs across your devices.
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
- **Cloud sync (optional)** — sync plans and workout history across devices
  using your own free [Supabase](https://supabase.com) project. Devices merge
  on sync (union by id with tombstoned deletions), so workouts logged on two
  devices are never lost. The in-progress workout always stays local.
- kg / lb unit support.

## Cloud sync setup (one time, ~3 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) and run it (the app also has
   a copy-SQL button in Settings).
3. In **Authentication → Sign In / Providers → Email**, turn **off**
   “Confirm email”.
4. In the app: **Settings → Set up cloud sync**, paste your Project URL and
   anon public key (from **Project Settings → API**), then create an account
   with any email + password.
5. Repeat step 4 on your other devices and sign in with the same account.

Changes upload automatically (debounced); the app pulls and merges on launch
and via **Sync now**.

## Run it

```bash
npm install
npm run dev      # development server
npm run build    # production build (output in dist/)
npm test         # unit + UI smoke tests
```

Open the printed URL on your phone or computer. The app is mobile-first —
add it to your home screen for a native-like experience.

## Deploy (Railway or any Node host)

The repo is deploy-ready: the host just needs to run `npm install`,
`npm run build`, then `npm start` (Railway's Nixpacks does this
automatically). `npm start` serves the built `dist/` folder on `$PORT`.

> **Note:** data lives in the browser's localStorage on the device you use.
> Use *Settings → Export backup* to move data between devices.

## Tech

React 18 + TypeScript + Vite, Recharts for charts, no backend — everything is
local and private.
