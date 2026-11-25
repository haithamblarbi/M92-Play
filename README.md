# M92 PLAY — Streamer-first frontend prototype

## Scope
This project is a frontend-only prototype built on the supplied M92 PLAY v6 codebase. The streamer is the operator; viewers participate through live-chat commands. No viewer-facing room or website is required.

## Included
- Arabic RTL streamer-oriented landing/dashboard shell and searchable game library.
- Eight catalog games: Roulette, Chairs, Typing Race, Guess, Draw & Guess, Word Battle, World Capitals, and M92 Family Feud.
- `src/text.js`: shared Arabic/English text system (normalization, Arabic-Indic digits, Arabic command aliases like `!شارك`).
- Draw & Guess keeps the secret word off the streamer's visible screen (hold-to-reveal + separate secret window at `#secret-word`).
- Per-game local interaction logic and a simulated chat console that forwards sample viewer messages to the selected game's command handler.
- Existing M92 brand asset and responsive styling.

## Run locally
Requires Node.js 18+ (Node.js 20+ recommended).

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Explicit limitations
This is not connected to Kick, Twitch, TikTok, Jaco, OBS, or any live chat API. Chat messages, viewers, votes, and game state are local mock data in the browser. No backend, database, authentication, WebSocket, or real permissions are included in this phase.

## M92 PLAY V10

- Redesigned game cards with dedicated visual scenes.
- Added **M92 فيود** with hidden/revealable answers and team scoring.
- Added **M92 PLAY CONTROL** host dashboard for game selection, live controls, question bank, answer points, and audio settings.
- Reworked **الكراسي** into a 3D-style rotating arena with numbered seats revealed after the music stops.
- Viewers select seats through chat using `!sit <number>`.
- Added a music ON/OFF setting for the chairs experience.

> This release remains a frontend prototype: chat, audio playback, persistence, and real streaming-provider adapters still need backend/integration work.


## V15 — Frontend UX update

- The admin overview is now a short, game-aware setup flow instead of a generic panel with inactive round controls.
- Admin navigation and content tools are contextual: roulette gets its own option list; question-bank access is limited to games that use it.
- Game settings are stored per game in local browser storage and show game-specific controls (including musical-chair music and duration).
- Theme selection now offers named presets, a live preview, a custom color, and an optional game cover; the selected accent is applied to the game card and game detail view.
- Musical-chair seat labels no longer use ellipsis clipping; seat radius and sizing respond to participant count and screen width, and the arena/platform proportions have been revised.

Build note: source syntax was checked with the globally available TypeScript JSX transpiler. `npm run build` was not run because dependencies could not be installed in this environment (npm registry unavailable and no offline cache).


## V16 frontend updates
- Mobile layout refinements for game pages, host controls, chat simulator, and Family Feud board.
- Musical-chair seat availability labels now wrap and remain fully visible on narrow screens.
- Family Feud accepts chat answers prefixed with `!` (for example `!كرة القدم`) and `!answer <answer>`. Correct answers reveal automatically, award their points, and show the answering viewer's name below the answer.
- The local chat simulator remains a frontend simulation; real streaming chat connectivity is a later integration phase.


## V17 — Mobile UX and game-specific presentation

- Removed the second, duplicate "open game" action from the setup overview; the primary game launch action remains in the game header.
- Replaced every native HTML select in the app with a branded M92 dropdown menu, including the demo chat viewer selector.
- Reworked uploaded cover previews to use a dedicated image layer with `object-fit: contain`; uploaded images are resized and compressed before local storage to avoid oversized browser storage entries.
- Added per-game design profiles (layout/presentation styles, not only accent colors) and applied the selected design profile to each game's detail experience.
- Rebuilt the musical-chairs seats as grounded chair objects with visible legs, floor shadows, upright radial positioning, and compact available/reserved labels. The seat status no longer displays long usernames inside the chair ring.
- Added tablet/mobile control-panel breakpoints so the sidebar becomes a horizontal game switcher before the two-column layout becomes cramped.
- Preserved local/offline operation and existing game modules.
- Validation performed: TypeScript JSX transpilation/parsing for all source JS/JSX files and PostCSS parsing of `styles.css`.
- Full Vite production build was not run because package dependencies could not be installed in this environment.


## V18 — Interactive frontend wiring

- Roulette now reads its participant list and spin settings from the admin panel; added host `!start` support, configurable spin duration, and winner elimination mode. Participant additions/removals are saved locally.
- Family Feud now reads its question/answer bank from the admin panel (`m92_feud_questions`), supports per-question answer editing and points, configurable team names, strike limit, and double-points mode. Host commands `!start`, `!next`, and `!reset` are supported.
- Typing Race now consumes the language and round-duration settings configured in the host dashboard.
- Added keyboard focus and disabled-action states for more usable keyboard/touch interaction.
- The frontend exposes `window.M92Play.dispatch(user, text)` for a future chat adapter and emits an `m92:chat-result` browser event for local integrations.

### Important integration boundary
This release makes the website's local frontend interactions functional and testable, including the built-in chat simulator. It does **not** receive real Twitch/Kick/YouTube/TikTok chat messages: those providers require their supported APIs and a secure backend/connector, which are intentionally outside the current frontend-only phase.


## V19 — Game-aware host flow and responsive presentation

- Rebuilt the host overview as a four-stage path: game content/round, game-specific settings, a game-shaped design preview, then opening the actual play area. Removed the duplicate game-launch action from the header.
- Content tools are contextual: Roulette has its option list, Chairs has a saved participant roster, Guess has its real question bank, and Family Feud has its answer/point bank. The Guess editor now writes to the same `m92-guess-questions` key consumed by the game engine.
- Removed generic settings that were not connected to gameplay. Wired the visible settings to their respective local game engines: chair player cap, Guess/Capitals scoring, Word Battle score multiplier, Draw & Guess duration/language/hints/winner cap, Typing Race rounds, and existing Roulette/Family Feud settings.
- Replaced the generic theme icon mockup with a separate miniature preview for each game. Uploaded artwork is shown in its own `object-fit: contain` frame and is no longer stacked under preview typography or icons.
- Improved the branded select component with keyboard navigation, focus handling, and mobile-safe menu heights.
- Reworked Musical Chairs into one fixed floor arena with adaptive concentric seating rows for larger player counts. Chair geometry, legs, ground shadows, seat labels, and mobile/desktop radii are handled separately so the status text stays readable rather than being scaled down with the chair.
- Added real game-surface differences for Signature, Broadcast, and Minimal design profiles, not only accent-color changes.

### V19 validation

- Passed TypeScript JSX/JavaScript transpilation checks for all React source modules.
- Passed `node --check` for `src/text.js`.
- Passed `tinycss2` stylesheet parsing: zero top-level or declaration parse errors; CSS braces balanced.
- Confirmed the content-store keys used by the Guess editor and game engine match, and the chair roster key is shared by the host panel and game engine.
- `npm run build` could not run because dependencies are not installed. `npm install` was attempted, but npm registry DNS resolution failed (`EAI_AGAIN`).
- Full browser visual testing at mobile and desktop viewports was not completed in this environment because headless Chromium navigation was blocked by the execution environment. The responsive rules were statically checked, but they still need a real device/browser pass.

The project remains frontend-only and offline-capable. No backend, database, or real streaming-provider integrations were added.

## التحديثات
- إضافة ألعاب: روليت التحديات، فك الشيفرة، خمن، فك القنبلة، حماية، صيد سمك، وجولة M92 متعددة التحديات.
- إزالة محاكي الشات من الواجهة واستبداله بمكان شات جاهز للربط الخارجي.
- الموقع لا ينفذ أو يربط البوت؛ الربط الخارجي يمكنه استخدام `window.M92Play.dispatch(user, text)` للألعاب التي تحتوي منطق شات داخلي.


## V20 — إصلاح منطق الألعاب الجديدة

- إصلاح مراجع `main.jsx` المفقودة: `readStoredArray`, `DEFAULT_CHAIR_PLAYERS`, `DEFAULT_GUESS_QUESTIONS`, `getSavedContent`, و`DEFAULT_RULES`.
- إضافة `ErrorBoundary` حتى لا تتحول أي مشكلة React إلى شاشة بيضاء بدون تفسير.
- إضافة التصنيفين `تحديات` و`جولة M92`.
- ربط الألعاب الجديدة فعليًا بـ `RealGames`: روليت التحديات، فك الشيفرة، فك القنبلة، حماية، صيد السمك، وجولة M92.
- دمج روليت التحديات داخل مكوّن الروليت نفسه مع زر للتبديل بين الوضع العادي ووضع التحديات.
- إضافة تصميمات مخصصة للألعاب الجديدة بدل الاعتماد على البطاقة العامة.
- إزالة كود `FruitWars` غير الموجود في الكتالوج.
- إصلاح أيقونات الحماية/صيد السمك لتتعامل مع `size` بدل تمريره إلى `span`.
- جعل `window.M92Play.dispatch` موجودًا حتى خارج صفحة اللعبة؛ عند عدم وجود لعبة مفتوحة يعيد نتيجة واضحة بدل الفشل الصامت.
- تحديث مساحة الشات لتبقى مكانًا للربط الخارجي فقط، بدون محاكي رسائل.
- تحديث وصف المشروع ليعكس 14 لعبة موجودة فعليًا.

### V20 validation
- تم فحص parsing/JSX لجميع `main.jsx` و`games.jsx` باستخدام TypeScript compiler بدون أخطاء.
- لم تتم إضافة أي dependency جديدة.
- لم يتم ربط أو تنفيذ أي بوت خارجي.
