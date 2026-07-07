# Scrollytelling & Parallax: A Masterclass

> A teaching document for AI models (and humans) who want to build scroll-driven
> narrative pages that are smooth, accessible, and genuinely story-shaped — not
> decoration bolted onto a settings page.
>
> Reference implementations in this repo:
> - `pages/designs/scrollytelling.html` + `css/scrolly.css` — the teaching lab (small, annotated)
> - `showcase.html` + `css/showcase.css` + `scripts/showcase.js` — a production-scale build
>   (parallax hero, particle canvas, scroll-scrubbed marquee, progress-driven props)
>
> **Reading this without the repo, or new to the domain entirely?** Start with
> the appendices: A (glossary), B (how browsers render), C (the math toolkit),
> and E (a complete single-file build you can paste into any editor). Then
> return to §0 and read straight through.

---

## 0. The One-Sentence Theory

**Scrollytelling binds narrative state to scroll position; parallax fakes depth
by making layers inherit different fractions of camera motion.** Everything
else in this document is engineering those two sentences without jank.

The reader's scroll is the most universal gesture on the web. Scrollytelling
does not invent a new interaction — it gives an existing one *a plot*. The
author controls pacing (when each idea arrives); the reader controls tempo
(how fast). Never confuse the two: take pacing, never take tempo. The moment
you hijack the wheel (scroll-jacking), you've broken the contract.

---

## 1. The Physics of Parallax

### 1.1 Depth is a speed ratio, nothing more

When a real camera pans, objects at distance `d` shift across the image plane
proportionally to `1/d`. The eye reads *relative speed difference* as depth.
So the entire illusion is:

```text
layerOffset = -cameraPosition × layerSpeed

where layerSpeed ∈ [0..1]:
  1.0  = locked to the camera (foreground, "right in front of you")
  0.5  = half speed (middle distance)
  0.1  = barely moves (far horizon)
  0.0  = infinitely far (sky, stars)
```

Rules derived from optics that you must respect:

1. **All layers move the same direction.** Negative speeds (layer moves
   *against* the camera) read as disorienting, not deep. The Parallax Lab in
   `scrollytelling.html` exposes a -1..1 slider precisely so learners can feel
   this break.
2. **Speed must be monotonic with visual size/blur.** Far layers: smaller
   texture scale, lower contrast/opacity, cooler/darker color. Near layers:
   bigger, sharper, darker silhouettes. If a "far" layer moves fast, the brain
   rejects the scene. See the hero in `css/scrolly.css`:
   far = `background-size: auto 30%`, `opacity: .55`;
   near = `auto 62%`, full black silhouette.
3. **Two layers minimum, three is the sweet spot.** One layer is a static
   background. Two reads as depth. Three (far/mid/near) reads as a *world*.
   Past five, returns diminish and paint cost climbs.
4. **The vertical case is identical.** For scroll parallax, "camera" is
   `window.scrollY` and offsets are `translateY`. For mouse parallax (see
   `showcase.js` cursor glow), camera is pointer position and offsets are tiny.

### 1.2 Two parallax reference frames — pick deliberately

- **Viewport-locked (hero parallax):** layers live inside a `100vh` section,
  offsets derived from raw `scrollY` while the section is on screen. Simple,
  used by the scrollytelling hero:

```js
if (y <= heroHeight) {
  layer.style.transform = `translate3d(0, ${y * speed}px, 0)`;
}
```

- **Section-centered:** offset derived from how far the section's center is
  from the viewport's center. This works for layers *anywhere* in a long page,
  not just at the top, and is what `showcase.js` does:

```js
const rect = section.getBoundingClientRect();
const delta = rect.top + rect.height / 2 - viewportHeight / 2;
layer.style.transform = `translate3d(0, ${delta * speed}px, 0)`;
```

The second form is symmetric: the layer is at rest when its section is
centered, displaced above/below otherwise. Use it for mid-page scenes.

### 1.3 Off-stage real estate

Any layer that translates must be **larger than its viewport** or you'll show
its edges. Budget the overflow from your maximum offset:

```text
maxOffset = maxCamera × maxSpeed
layerWidth = viewportWidth + 2 × maxOffset   (horizontal pan)
```

`css/scrolly.css` does this explicitly — the lab layers are
`left: -460px; width: calc(100% + 920px)` because the camera slider maxes at
420px at speed 1.0. Props are then positioned at `calc(460px + N%)` so they
start on stage. For vertical hero parallax, bleed the layer with
`bottom: -6%; left: -2%; right: -2%` like the hero treelines.

---

## 2. The Non-Negotiable Performance Architecture

This is where scrollytelling pages live or die. Memorize this pipeline:

### 2.1 One listener → one rAF → batched writes

```js
let ticking = false;

function update() {
  ticking = false;
  const y = window.scrollY;
  // ... ALL reads first, then ALL writes ...
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
}, { passive: true });
```

Why each piece matters:

- **`{ passive: true }`** tells the browser the handler will never call
  `preventDefault()`, so scrolling never waits on your JS. Omitting it can
  add a full frame of input latency on touch devices.
- **The `ticking` flag** collapses the scroll event flood (which can fire far
  more often than 60 Hz) into at most one `update()` per painted frame.
  Without it you do redundant work between paints.
- **One loop owns all scroll effects.** Progress bar, hero layers, walker gif,
  rotation items, marquee scrub — all in a single `update()`
  (see `scrollytelling.html` lines ~256–288 and the master `tick()` in
  `showcase.js`). Ten independent scroll listeners each forcing layout is the
  #1 cause of janky scrollytelling.
- **Read-then-write discipline.** Group every `getBoundingClientRect`/
  `offsetHeight` read before every `style.transform` write inside the frame.
  Interleaving reads and writes forces synchronous layout ("layout
  thrashing") — each write invalidates layout, each subsequent read recomputes
  it.

A constantly-animating page (particles, custom cursor) can instead run a
permanent rAF loop and just *sample* `scrollY` each frame — `showcase.js`
does this because it's already paying for a per-frame canvas draw. A page
that only reacts to scroll should use the ticking pattern and go idle.

### 2.2 Animate only `transform` and `opacity`

These two properties are handled by the compositor thread — the GPU slides
pre-painted textures around without re-running layout or paint. Everything
else (`top`, `left`, `width`, `height`, `margin`, `box-shadow`, `filter` on
large areas, `background-position`) triggers paint or layout *every frame*.

```css
/* ✅ compositor-only */
transform: translate3d(0, 120px, 0);
opacity: 0.6;

/* ❌ layout per frame */
top: 120px;

/* ⚠️ paint per frame — fine on small elements, deadly full-screen */
filter: blur(8px);
```

Corollaries:

- Use `translate3d(...)` / `scale(...)` even for 2D moves — the `3d` form
  reliably promotes the element to its own compositor layer.
- A progress bar should be `transform: scaleX(progress)` with
  `transform-origin: left`, never `width: N%`. (See `.sc-progress__bar`.)
- `will-change: transform` on the handful of elements you move every frame —
  and **only** those. Every `will-change` allocates GPU memory; spraying it
  everywhere causes the exact jank it's meant to prevent.

### 2.3 IntersectionObserver for triggers, rAF for continuous motion

Two different jobs, two different tools:

| Job | Tool | Why |
|---|---|---|
| "Did this element cross a line?" (reveals, steppers, chapter changes) | `IntersectionObserver` | Fires only at the crossing; zero per-frame cost; the intersection math runs off the main thread (your callback still runs on it — keep it tiny) |
| "Where exactly is the scroll right now?" (parallax, scrubbing, progress) | scroll → rAF | You need a fresh value every frame |

Never poll positions with `getBoundingClientRect` on every scroll event for
things that are actually one-shot triggers. That's what observers are for.

### 2.4 Let CSS do the animating; let JS announce state

The single most elegant pattern in this codebase is the pinned scene in
`scrollytelling.html`: **JavaScript never animates anything — it sets
`scene.dataset.phase = "dusk"` and walks away.** CSS owns every transition:

```css
.sc-pin__scene[data-phase="dusk"] { --sky-top: #3a2547; --sky-low: #ff7a2f; }
.sc-pin__scene[data-phase="dusk"] .sc-pin__orb {
  transform: translate3d(40px, 200px, 0) scale(1.15);  /* sun sets */
}
.sc-pin__scene[data-phase="night"] .sc-pin__stars { opacity: 1; }
```

Benefits: transitions are interruptible and reversible for free (scroll up —
the day politely un-sets), timing lives next to styling, reduced-motion can
neutralize everything with one media query, and the JS stays ~10 lines.

Bonus technique: **CSS gradients can't transition** — unless their stops are
registered custom properties. `css/scrolly.css` registers them:

```css
@property --sky-top { syntax: '<color>'; inherits: true; initial-value: #7ec8e8; }
/* now this actually tweens: */
.sc-pin__sky { background: linear-gradient(180deg, var(--sky-top), var(--sky-low));
               transition: --sky-top 1.1s ease, --sky-low 1.1s ease; }
```

Without `@property`, the sky would snap between phases instead of melting
through dusk.

---

## 3. The Core Patterns (Recipes)

### 3.1 The Pinned Scene + Stepper — *the* scrollytelling pattern

This powered NYT's "Snow Fall" (2012) and nearly every data-journalism piece
since. Anatomy:

1. **A sticky visual.** `position: sticky` pins it — zero JavaScript:

```css
.sc-pin__layout { display: grid; grid-template-columns: 1.1fr 1fr; }
.sc-pin__sticky { position: sticky; top: calc(50vh - 210px); } /* centers a 420px scene */
```

   `sticky` needs room to travel: the parent column must be taller than the
   pinned element. The steps column provides that height.

2. **Text steps with generous spacing.** Each step carries its target state:

```html
<div class="sc-step" data-phase="dusk"> ... </div>
```

```css
.sc-pin__steps { display: flex; flex-direction: column; gap: 40vh; padding: 18vh 0 24vh; }
```

   The `40vh` gap is a *pacing* decision: it guarantees only one step is near
   viewport-center at a time and gives each phase room to breathe.

3. **A center-band observer.** The trick is `rootMargin` shrinking the
   intersection root to a thin horizontal band across the middle of the
   viewport:

```js
new IntersectionObserver(onStep, {
  rootMargin: '-42% 0px -42% 0px',  // only the middle 16% of the screen counts
  threshold: 0
});
```

   A step "fires" exactly when it crosses the reader's eye line. The callback
   copies `data-phase` to the scene and highlights the active step. Because
   the observer fires in both directions, scrolling up rewinds the story
   automatically — **you get reversibility for free, never special-case it.**

4. **Mobile: stack, keep sticky.** Below ~880px, collapse to one column and
   pin the scene to the top while steps scroll beneath it
   (`.sc-pin__sticky { top: 3.2rem; }`). The pattern survives; only the
   geometry changes.

### 3.2 The Layered Parallax Hero

See §1 for physics. Implementation checklist:

- Stack: sky gradient (speed ~0) → far silhouette (~0.1–0.25) → mid (~0.3–0.5)
  → headline copy (~0.4–0.6, so it floats *between* layers) → near silhouette
  (~0–0.15, nearly locked). Note the scrollytelling hero deliberately gives the
  *copy* a speed too — text drifting slightly faster than the near trees makes
  the type feel physically placed in the world.
- One source image can play every layer. The treelines are all the same
  `treeline.png` at different `background-size`, recolored with `filter`
  chains (`brightness(0)` for silhouette, then `invert/sepia/saturate/
  hue-rotate` to tint). Cheap, cohesive, zero extra requests.
- Fade the hero copy out as the user leaves:
  `opacity = max(1 - y / (heroHeight × 0.6), 0)` — by 60% through the hero
  it's gone, signalling "the story has moved on."
- Add a scroll cue (bobbing chevron). A parallax hero with no cue strands
  users who think the page *is* the page.

### 3.3 The Scroll Progress Bar (and progress-driven props)

```js
const progress = scrollY / (document.documentElement.scrollHeight - innerHeight);
bar.style.transform = `scaleX(${progress})`;
```

Once you have normalized progress (0..1), you can drive *anything* from it —
this is the cheapest scrollytelling there is. Both reference pages walk a
character across the screen with it:

```js
walker.style.transform = `translate3d(${progress * (innerWidth - walkerWidth)}px, 0, 0)`;
```

The showcase goes further and publishes progress as a CSS custom property
(`--scroll-progress`), letting pure CSS position a flame on the progress
track. Publishing scroll state as custom properties is a great decoupler:
JS measures once, any number of stylesheets can react.

### 3.4 Reveal Choreography (staggered entrances)

Reveals are a *pacing* tool: a stagger decides the reader's eye path.

```css
.rv-card { opacity: 0; transform: translateY(26px); transition: opacity .5s, transform .5s; }
.rv-card.is-shown { opacity: 1; transform: none; }
.mode-staggered .rv-card:nth-child(2) { transition-delay: 90ms; }
.mode-staggered .rv-card:nth-child(3) { transition-delay: 180ms; }
/* ... */
```

Craft constants worth memorizing:

- **Stagger step: 60–120ms.** Below 50ms it reads as simultaneous; above
  150ms the tail feels laggy. 90ms is the lab's choice.
- **Travel distance: 20–50px.** Enough to read as motion, not enough to feel
  like teleportation.
- **Duration: 0.4–0.9s with an ease-out** (decelerating arrivals feel like
  objects settling; `cubic-bezier(.16, 1, .3, 1)` in the showcase is a
  beautiful long-tail ease-out).
- **Trigger early:** `rootMargin: '0px 0px -40px 0px'` with
  `threshold: ~0.15–0.3`, and **unobserve after firing** — reveals should
  happen once; re-triggering on every scroll-past is noise.
- **The double-rAF replay trick.** To replay a CSS transition you must let the
  removal *paint* before re-adding the class:

```js
cards.forEach(c => c.classList.remove('is-shown'));
requestAnimationFrame(() => requestAnimationFrame(() => {
  cards.forEach(c => c.classList.add('is-shown'));
}));
```

  One rAF schedules before the next style recalc; two guarantees a painted
  frame in between. Without this, the browser coalesces remove+add into
  nothing.

### 3.5 Scroll-Scrubbed Motion (velocity coupling)

A marquee that always crawls but *sprints* while you scroll couples page
energy to reader energy (`showcase.js`):

```js
const delta = scrollY - lastScrollY;  lastScrollY = scrollY;
marqueeX -= baseSpeed + Math.min(maxBoost, Math.abs(delta) * 0.45);
if (-marqueeX > track.scrollWidth / 2) marqueeX += track.scrollWidth / 2;  // seamless loop
```

Notes: duplicate the marquee content twice in the DOM and wrap at half the
scroll width for a perfect loop; clamp the boost (`Math.min`) so a flick
doesn't teleport the strip; take `Math.abs` so both scroll directions add
energy.

### 3.6 Scroll-Linked Rotation / Tilt

Map an element's distance-from-viewport-center to a small rotation
(`showcase.js` gallery):

```js
const t = (viewportCenter - elementCenter) / (viewportHeight / 2); // -1..1
el.style.transform = `rotate(${t * maxDeg}deg) translateY(${t * -12}px)`;
```

Keep `maxDeg` in the 3–8° range — the effect should be felt, not seen.
Skip elements that are off screen (`rect.bottom < -100 || rect.top > vh + 100`)
to avoid wasted writes.

### 3.7 Atmosphere Layers (the production garnish)

The showcase build layers ambience *behind* the scroll mechanics; these are
optional but they're what makes a build feel expensive:

- **Particle canvas** (embers rising, motes drifting): one `<canvas>` fixed
  behind content, one draw loop inside the master rAF, particle count scaled
  down on touch devices, zero particles under reduced motion.
- **Cursor-reactive elements**: a glow that lerps toward the pointer at
  `0.07`/frame (laggy, dreamy) and a ring at `0.55` (snappy). Two lerp rates
  on one input = parallax for the cursor.
- **Film grain / scanlines**: a fixed overlay with a stepped `transform`
  animation. Pure texture, costs almost nothing.

The rule: atmosphere must *never* intercept input (`pointer-events: none`)
and must never compete with the narrative triggers for the main thread.

---

## 4. Accessibility & Respect — Non-Optional

### 4.1 `prefers-reduced-motion` is a hard requirement

Vestibular disorders make parallax physically sickening for some users. Both
reference pages implement a **full kill switch**, in both languages:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .sc-hero__layer, .sc-hero__copy { transform: none !important; opacity: 1 !important; }
  .rv-card { transition: none; opacity: 1; transform: none; }
  .sc-walker { display: none; }
}
```

```js
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function update() {
  drawProgressBar();              // information: keep
  if (reducedMotion.matches) return;  // motion: skip
  doParallax(); moveWalker();
}
```

The design principle: **reduced-motion users get the content and the end
states, minus the ride.** The pinned scene still changes phase (it's
information); it just snaps instead of melting. The progress bar still fills
(it's wayfinding). The decorative walker disappears entirely.

### 4.2 Semantics survive the spectacle

- Decorative layers get `aria-hidden="true"` and empty `alt=""` — every
  treeline, orb, star field, and gif in the reference pages does.
- Narrative still reads linearly with CSS off: steps are ordinary headed
  paragraphs in DOM order; the scene is enhancement, not content.
- Interactive teaching controls are real controls: `<input type="range">`
  with `<label for>`, `<output>` for live readouts, `role="switch"` +
  `aria-checked` on the reveal toggle, visible `:focus-visible` states.
- Never trap or transform scrolling itself. `scroll-behavior: smooth` for
  anchor jumps is the most hijacking you're allowed.

### 4.3 Mobile is not an afterthought

- `100svh` beats `100vh` for heroes (mobile URL-bar collapse breaks `vh`).
  See `.sc-hero { height: 100vh; height: 100svh; }` — the double declaration
  is the fallback pattern.
- Touch has no hover and coarse pointers: gate cursor effects behind
  `matchMedia('(pointer: coarse)')` and cut particle counts (~half) like
  `showcase.js` does.
- Two-column pinned layouts collapse to stacked-with-sticky-top (§3.1).
- Test the page with DevTools CPU throttling at 4×. If the hero stutters
  there, simplify before shipping.

---

## 5. Narrative Craft (the part most builds get wrong)

Technique without story is a screensaver. The scrollytelling page works
because it's *structured like an essay*:

1. **Hook (hero):** a full-viewport scene that demonstrates the thesis
   wordlessly — you're inside a parallax before anyone explains parallax.
2. **Context (essay):** history and stakes. Snow Fall 2012; multiplane
   cameras 1930s; *Moon Patrol* 1982. Give the reader handles.
3. **Exploration (interactive labs):** let the reader *falsify* the
   principle. The Parallax Lab's sliders exist so you can set all speeds
   equal and watch depth die. Interactive proof beats assertion.
4. **Climax (pinned scene):** the signature pattern, performed and named.
5. **Resolution (CTA):** where to go next.

Craft rules:

- **Caption the magic.** Every effect in the reference build is followed by a
  "What just happened" box naming the technique. For an educational page
  that's the product; for a marketing page, the same slot holds the sales
  beat. Either way: each scroll-triggered moment should land exactly one idea.
- **One idea per viewport.** The `40vh` step gap and full-viewport hero
  aren't aesthetic — they're sentence breaks. Scroll distance is your
  paragraph length.
- **Earn the technique.** Parallax on a story about landscape: motivated.
  Parallax on a pricing table: noise. If the page has no narrative arc, use
  reveals and a progress bar and stop there.
- **Front-load performance, not effects.** The reader should meet your most
  expensive trick *after* they're invested, not during first paint.

---

## 6. Failure Modes (debugging field guide)

| Symptom | Likely cause | Fix |
|---|---|---|
| Stutter while scrolling | Animating layout/paint properties; multiple scroll listeners; reads interleaved with writes | Transforms only; one rAF loop; batch reads then writes |
| Parallax layer shows its edge | No off-stage bleed | Oversize layer by `maxOffset` per side (§1.3) |
| Depth feels "wrong" | Speed not monotonic with size/contrast, or a layer moving backwards | Re-order speeds; keep all speeds same-sign |
| Sticky element won't pin | Parent too short, or `overflow: hidden`/`auto` on an ancestor | Give the steps column height; audit ancestors. Need the clipping anyway? `overflow: clip` clips *without* creating a scroll container — sticky survives |
| Fixed nav/progress bar scrolls away | A `transform`, `filter`, or `will-change` on an ancestor creates a **containing block** — `position: fixed` descendants silently become absolute | Keep fixed UI outside any transformed subtree; never transform a whole-page wrapper |
| Progress/triggers drift after load | Cached `scrollHeight` went stale — lazy images, late fonts, injected embeds changed document height with no `resize` event | Re-measure from a `ResizeObserver` on `document.documentElement` (§14.1), not just `window.resize` |
| Stepper fires twice / flickers | Threshold band too tall; two steps intersect simultaneously | Thin the band (`rootMargin: '-42% 0px -42%'`), widen step gaps |
| Reveal won't replay | remove+add class coalesced in one frame | Double-rAF trick (§3.4) |
| Gradient snaps instead of tweening | Transitioning a `background` gradient directly | Register stops with `@property` and transition the custom properties |
| Mobile hero jumps when URL bar hides | `100vh` | `100svh` with `100vh` fallback |
| Page janks only on low-end devices | Too many composited layers / `will-change` spam; full-screen `filter`s | Audit layer count in DevTools; cut particle counts on `pointer: coarse` |
| Scroll feels "hijacked" | Smooth-scroll libraries, wheel interception, snap-forced sections | Delete them. Native scroll + transforms is the entire trick |

---

## 7. Build Order (how to actually assemble one)

1. **Write the story flat.** Plain headed sections, real copy, semantic HTML.
   It must read perfectly with zero CSS. This is also your reduced-motion and
   SEO version — you get three deliverables for one.
2. **Add the skeleton mechanics:** progress bar + scroll→rAF loop with the
   ticking flag. Verify 60fps with DevTools performance panel before adding
   anything visual.
3. **Add reveals** with one IntersectionObserver. Cheap, high-impact.
4. **Build the hero parallax** (2–3 layers, speeds from §3.2). Profile again.
5. **Build the pinned scene** — sticky first (no JS), then the center-band
   observer, then CSS phase states. Test scrolling *up* as much as down.
6. **Add scrubbed/continuous effects** (marquee, rotations, walker) inside
   the existing loop. Never add a second listener.
7. **Add atmosphere** (canvas, cursor, grain) only if the page still has
   frame budget on a throttled CPU.
8. **Write the reduced-motion block last and test it first** — toggle
   "Emulate CSS prefers-reduced-motion" in DevTools and read the whole page.
9. **Mobile pass:** `svh`, stacked sticky layouts, particle cuts, touch
   gating.
10. **The caption pass:** walk the page asking, at every effect, "what idea
    does this land?" Delete any effect with no answer.

---

## 8. The Standards Layer (what the platform now gives you for free)

The JS pipeline in §2 is the universal baseline. The platform is steadily
absorbing it. Know both: build on the baseline, enhance with the standards.

### 8.1 CSS Scroll-Driven Animations — the future default

The `animation-timeline` property binds any CSS animation to scroll progress
instead of time, **running on the compositor thread with zero JavaScript**:

```css
/* Progress bar: no listener, no rAF, no JS at all */
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.progress-bar {
  animation: grow linear both;
  animation-timeline: scroll();        /* tracks the root scroller */
}

/* Reveal-on-enter: replaces the IntersectionObserver reveal */
@keyframes fade-up { from { opacity: 0; transform: translateY(40px); } }
.card {
  animation: fade-up linear both;
  animation-timeline: view();          /* tracks THIS element's visibility */
  animation-range: entry 0% entry 60%; /* completes by 60% into the viewport */
}
```

The two timeline types map exactly onto the two jobs from §2.3:

- **`scroll()`** = scroll progress timeline (the "where is the scrollbar" job)
- **`view()`** = view progress timeline (the "is this element visible" job),
  with `animation-range` keywords (`entry`, `exit`, `cover`, `contain`)
  giving you scrub control no observer can match — e.g. an image that
  un-blurs *continuously* as it crosses the viewport, not at a threshold.

Named timelines (`scroll-timeline-name` / `view-timeline-name` +
`timeline-scope`) let one element's position drive *another* element's
animation — a pinned figure animated by its sibling steps, in pure CSS.

**Support as of mid-2026:** Chrome/Edge since 115 (2023), Safari since 26
(2025), Firefox still behind the `layout.css.scroll-driven-animations.enabled`
flag — roughly 90% of users. So ship it as progressive enhancement:

```css
/* Baseline: content visible, no animation */
@supports (animation-timeline: view()) {
  .card { animation: fade-up linear both; animation-timeline: view(); }
}
```

Unsupported browsers simply skip the block. Keep the JS pipeline for effects
that *must* work everywhere; let pure-decoration effects ride `@supports`.
A third option exists for effects that must scrub everywhere: the official
`scroll-timeline` polyfill backfills the API with JS — you keep one
declarative codebase, but flagged browsers lose the off-main-thread benefit,
so treat the polyfill as a bridge, not a foundation.
Two gotchas: `animation-duration` must be `auto` (or omitted) with scroll
timelines, and `prefers-reduced-motion` still applies — a compositor-thread
parallax sickens the same vestibular systems a JS one does.

The same timelines are exposed to JavaScript via the Web Animations API
(`new ScrollTimeline({ source: ... })`, `element.animate(keyframes,
{ timeline })`) when you need dynamic keyframes with off-main-thread
playback — the best of both worlds.

### 8.2 The rest of the modern scroll toolkit

- **`scroll-snap-type` / `scroll-snap-align`** — native section snapping.
  The honest version of scroll-jacking: the browser stays in control,
  momentum is respected, accessibility is free. Use `proximity` rather than
  `mandatory` for story pages so readers can still rest mid-section.
  `scroll-padding` / `scroll-margin` fix anchors landing under fixed headers.
- **`overscroll-behavior: contain`** — stops scroll chaining out of inner
  scrollable demos (like the Parallax Lab) into the page.
- **`scrollend` event** — fires once when scrolling settles. Perfect for
  "chapter completed" analytics or deferring heavy work until rest; no more
  debounce-timer guessing. (Chrome/Firefox; treat as enhancement.)
- **View Transitions API** — `document.startViewTransition()` morphs between
  DOM states. Niche scrollytelling use: a "chapter select" jump that morphs
  the clicked thumbnail into the destination scene instead of teleporting.
- **`content-visibility: auto`** + `contain-intrinsic-size` — skips
  rendering work for off-screen acts of a long story; can cut initial render
  cost dramatically on multi-chapter pieces. Set intrinsic size honestly or
  the scrollbar lies.
- **`@property`** (Houdini) — already used for the tweening sky (§2.4);
  the general principle: any numeric/color custom property you register
  becomes animatable, which makes *gradients, masks, and conic charts*
  scrubbable.
- **Container queries** — pinned scenes that restyle by their own width,
  not the viewport's; essential when the same scene component appears in a
  two-column desktop layout and a stacked mobile one.

### 8.3 The compliance floor (WCAG & Core Web Vitals)

Beyond `prefers-reduced-motion` (§4.1), the specific standards that bind
scroll-driven work:

- **WCAG 2.2.2 (Pause, Stop, Hide):** anything that moves for more than
  5 seconds and runs parallel to content — auto-rotating carousels, marquees,
  particle fields — needs a user control to stop it. A pause button on the
  retro page's carousel isn't decoration; it's conformance.
- **WCAG 2.3.3 (Animation from Interactions, AAA):** motion triggered by
  interaction (scrolling counts) must be disableable. Reduced-motion handling
  is how you meet it.
- **WCAG 2.4.1 / keyboard paths:** long scrolly pages need skip links and
  heading structure; a keyboard user paging with Space must hit every step
  trigger (center-band observers handle this naturally — another reason not
  to hand-roll wheel-event logic, which keyboards never fire).
- **Core Web Vitals:** scroll effects can silently wreck **CLS** (layers
  loading late and shifting layout — always reserve space with aspect-ratio
  or explicit dimensions) and **INP** (long rAF callbacks blocking input —
  keep the frame under ~8ms so the browser has headroom). **LCP** suffers
  when a decorative canvas initializes before the hero text paints; defer
  atmosphere until after first paint.

---

## 9. The Library Landscape (and when vanilla loses)

Default position: **the reference builds use zero libraries deliberately.**
Native scroll + transforms + observers covers ~90% of scrollytelling, weighs
nothing, and never fights the browser. But know the territory:

| Tool | What it actually buys you | When it earns its bytes |
|---|---|---|
| **GSAP ScrollTrigger** | Scrub-with-smoothing, pin-spacers handled for you, timeline sequencing, `matchMedia` responsive scenes, battle-tested edge cases | Complex multi-act choreography (one scene's exit overlapping the next's entrance); team projects needing a declarative vocabulary |
| **Lenis / smooth-scroll libs** | Lerped "luxury" scroll feel; normalized wheel deltas | High-end portfolio/agency aesthetics where the drag *is* the brand. Costs: fights native a11y, breaks find-in-page jumps, adds latency. Never on content/commerce sites |
| **Frame-sequence helpers** | Preloading + drawing image sequences to canvas | Apple-style product scrubs (§10.1) |
| **AOS** | Class-based reveals in one attribute | Prototypes only; an IntersectionObserver is 15 lines |
| **Framer Motion / Motion** | `useScroll`, `useTransform` hooks for React | When the page is already React and state must drive motion |
| **Lottie / Rive** | Designer-authored vector animation you scrub by scroll (§15.2) | When the animation is illustration-complex and a designer owns it |
| **Three.js / WebGL** | True 3D camera paths | §10.8 — only with a real budget and a fallback |

Decision rule: a library must replace *more complexity than it adds*. If
your needs are progress, parallax, reveals, and one pinned scene — vanilla.
If you're orchestrating fifteen overlapping scrubbed timelines — ScrollTrigger
will be less code than your homegrown scheduler, and better tested.

If you do adopt lerped scrolling, the technique (worth knowing even to reject):
intercept input, keep a `target` scroll value, ease `current += (target -
current) × 0.1` each frame, transform a wrapper. Everything in §2 still
applies — you've just become responsible for everything the browser used to
do, including keyboard, find-in-page, fragment links, and screen readers.
That responsibility is the real price tag.

---

## 10. Fringe & Niche Techniques (the deep end)

Each entry: the trick, the recipe sketch, and the catch. These are the
moves that make juries look twice — use at most one or two per page (§11.2).

### 10.1 Scrubbed video & image sequences

The Apple-keynote staple: a product rotates as you scroll. Two grades:

- **Video scrub (cheap):** sticky `<video>`, set `video.currentTime =
  progress × video.duration` in the rAF. Catch: seek latency makes it
  stuttery unless the file is keyframe-dense (re-encode with all-intra /
  `-g 1`), muted, and short.
- **Canvas frame sequence (smooth):** export 60–150 JPEG/WebP frames, preload
  into `Image` objects, draw `frames[Math.round(progress × (N-1))]` to a
  sticky canvas each frame. Butter-smooth both directions. Catch: megabytes —
  lazy-load the sequence only when the section approaches, show frame 0 as a
  poster, and skip the whole apparatus under `prefers-reduced-data` or
  `saveData`.

### 10.2 Horizontal scroll inside vertical scroll

A gallery that slides sideways while the user scrolls normally:

```text
wrapper height = 100vh + (panels - 1) × 100vw   (the scroll "fuel")
inner: position sticky; top 0; height 100vh; overflow hidden
track: translateX(-(wrapperProgress) × (trackWidth - 100vw))
```

The user never changes gesture — vertical scroll *becomes* horizontal
motion. Catches: keep it to 3–5 panels (it suspends the user's sense of
page length); RTL locales should travel the opposite direction; provide
heading anchors so keyboard/screen-reader users aren't trapped panning.

### 10.3 SVG line drawing on scroll

The "drawing itself" map route or signature: set `stroke-dasharray` to the
path length, scrub `stroke-dashoffset` from length → 0 by progress
(`path.getTotalLength()` once, then a transform-cheap property). Pairs
beautifully with a pinned scene — the route draws as steps narrate the
journey. With scroll-driven animations this is now pure CSS via
`animation-timeline: view()`.

### 10.4 Sticky stacking / peeling cards

Sequential cards each `position: sticky; top: 0`, so each new card slides
over the previous (add a subtle `scale(0.95)` + dim on the covered card,
driven by the incoming card's progress). Zero JS for the pin itself; reads
as a deck of chapters. Catch: every stacked card stays composited — keep the
deck under ~6 and the card contents simple.

### 10.5 Zoom-through ("camera fly") scenes

A pinned full-viewport scene where layers `scale()` up past the camera as
you scroll — flying *into* the forest rather than past it. Foreground layers
scale fastest and fade out as they "pass" the lens (opacity → 0 above
scale ~1.6), background layers creep from 0.9 → 1.1. The log-scale version
(`scale = exp(progress × k)` per depth) reads eerily like dolly footage.
This is the showpiece move of award-site heroes. Catch: scale changes
re-rasterize textures — pre-promote layers and keep them few.

### 10.6 Masking & occlusion reveals

- `clip-path: inset()/circle()` scrubbed by progress — a scene revealed
  through an expanding aperture (register nothing; `clip-path` animates
  natively, and basic shapes interpolate).
- **Foreground occluders:** a near-layer silhouette (doorframe, branches)
  with a transparent center that the content scrolls *behind*. The cheapest
  depth trick after parallax itself — pure z-index and a PNG.
- `mask-image: linear-gradient(...)` with `@property`-registered stops for
  text that develops like a photograph as it crosses the viewport.

### 10.7 Typography as motion

- **Variable font axes on scroll:** scrub `font-variation-settings: 'wght'`
  (or width/slant) by view progress — a headline that gains weight as it
  reaches the eye line. This repo ships Playfair's variable file; the
  typography page already wires its `wght` axis to a slider — binding it to
  `view()` instead is a five-line change. Catch: every variation step
  re-shapes and repaints text; confine it to a headline, never body copy.
- **Split-line reveals:** wrap each line in an overflow-hidden span, slide
  lines up with 40–80ms stagger (the editorial signature). Split by *line*,
  not letter — letter-stagger body text is a screen-reader and reading-flow
  hazard.
- **Scramble/decode-in** for techy moods: render real text immediately,
  scramble only on a `.decoding` class so no-JS and reduced-motion users
  always have the words.

### 10.8 The heavy artillery (know it exists, deploy rarely)

- **WebGL/Three.js camera paths:** true 3D flythroughs scrubbed by scroll
  (camera lerps along a spline by progress). A different discipline —
  budget for asset pipelines, loading states, WebGL-context-lost handling,
  and a complete 2D fallback. Prototype the 2D version first; it ships
  either way.
- **Gyroscope parallax:** `deviceorientation` as the camera on mobile —
  tilt instead of cursor. iOS requires a user-gesture permission prompt;
  treat as easter egg, never load-bearing.
- **Scroll-velocity styling:** track `|delta|` per frame and map it to a
  skew or motion-blur class — the page "leans into" fast scrolling
  (the marquee in §3.5 is the gentle version). Clamp hard; at 3°+ of skew
  it's seasickness, not energy.
- **Scroll-reactive audio:** ambient layers that crossfade by chapter.
  Strictly opt-in (a visible sound toggle, default muted — autoplay policy
  enforces this anyway), persist the choice, duck under reduced-motion too:
  vestibular discomfort and motion-sound coupling correlate.
- **Custom scrollbar as narrative map:** chapter ticks on the progress
  track (the showcase's flame is the playful version). Never *replace* the
  native scrollbar; annotate alongside it.

### 10.9 Exit choreography (the forgotten half)

Most builds animate entrances and let exits just… happen. The polished move:
elements that entered with upward staggers exit with a gentle downward fade
(`view()` `exit` range, or a second observer band at the viewport top).
Subtle exit motion is what makes a page feel *composed* rather than
triggered. Keep exits at ~60% of entrance intensity — departures should
whisper.

---

## 11. Creativity: How to Invent, Not Imitate

Technique catalogs (this one included) describe the known. The memorable
builds come from a process, not a list.

### 11.1 Mine the scroll metaphor first

Scrolling is a physical gesture; decide what it *means* in your story, and
let that decision generate the effects. The strongest scrollytelling maps
scroll onto exactly one of:

- **Time** — scroll advances the clock (the pinned day→night scene; a
  company history; a seed growing). Effects follow: light changes, ages,
  seasons.
- **Depth/altitude** — scroll descends or ascends (ocean depth stories,
  atmosphere layers, the showcase's forest-floor-to-stars hero). Effects:
  pressure, darkness, parallax intensifying with depth.
- **Distance/journey** — scroll travels a route (maps with §10.3 line
  drawing, the walker gif pacing the page). Effects: milestones, terrain
  changes, arrival.
- **Magnification** — scroll zooms from cosmos to atom (§10.5). Effects:
  scale cascades, recursive reveals.
- **Assembly/excavation** — scroll builds something up or digs something
  out (product exploded views, archaeology). Effects: parts flying in,
  layers peeling (§10.4, §10.6).

Pick **one**. A page that is simultaneously a journey, a zoom, and a
timeline is none of them. Air&Ember's own identity ("wind carries the idea,
fire makes it real") is a metaphor engine: air = drift, breath, lightness in
the entrances; ember = heat, glow, crackle in the accents. That mapping —
brand physics → motion vocabulary — is repeatable for any client.

### 11.2 The signature-moment doctrine

Every memorable scroll page has exactly **one** moment people describe to
someone else ("the part where the sun sets while you read"). Budget
accordingly: one extravagant set piece (a §10 technique, fully realized),
supported by quiet competence everywhere else (reveals, progress, a modest
hero). Two set pieces compete; five exhaust. Decide which moment is the
signature *before* building, and spend your novelty budget there.

### 11.3 Build a motion identity, not a pile of effects

Pick once, apply everywhere:

- **One easing family** — the showcase uses `cubic-bezier(.16,1,.3,1)` for
  every arrival; that consistency *is* the polish.
- **One duration scale** — e.g. 200ms (micro) / 500ms (content) / 1100ms
  (scenery), and nothing off-scale.
- **One direction grammar** — if content enters bottom-up, it always enters
  bottom-up; sideways entrances then become *meaningful* (the asymmetrical
  page uses left/right reveals to teach weight — direction as vocabulary).
- **Personality constants** — overshoot springs read playful; long
  ease-outs read luxurious; instant snaps read brutalist. Match the brand,
  then never break character.

### 11.4 Steal structure, never surfaces

Study the canon — NYT's Snow Fall, The Pudding's data essays, Apple product
pages, Awwwards/FWA winners, Bruno Simon's portfolio — but reverse-engineer
the *why*, not the *what*: where did they pin? How long is each beat in
scroll-distance? When does the signature moment land (usually ~60–70%
through)? What did they refuse to animate? Then close the references and
storyboard your own. Copying a surface produces a dated pastiche; copying a
structure produces a craft.

### 11.5 Constraints are generators

The reference pages were built under hard constraints — no libraries, local
fonts, one image (`treeline.png`) recolored into six different layers via
`filter` chains. That last trick *is* §1.1's cohesion rule, discovered by
poverty. When stuck, impose: one image total; CSS only; no section taller
than 200vh; the story must work backwards. Constraint forces the
recombination that reads as originality.

### 11.6 Prototype the feel, not the build

Storyboard scroll-beats on paper first (each viewport = one panel, like a
film storyboard with the scrollbar as the timeline). Then grey-box it:
plain colored divs, real scroll distances, fake content — and *feel* the
pacing with your actual thumb on an actual trackpad before any visual
design exists. Scroll pacing mistakes cost minutes in grey-box and days in
production. Tune one constant at a time; motion design is a parameter-space
search, and changing three numbers at once teaches you nothing.

---

## 12. Resilience, Measurement & Edge Cases

The unglamorous layer that separates a demo from a product.

### 12.1 The no-JS / no-CSS / robot story

§7 step 1 (write the story flat) pays out three ways: the page reads
perfectly for search crawlers and AI agents (which largely don't scroll or
execute your rAF), for RSS/reader modes, and for `@media print` — add a
print stylesheet that unpins sticky elements (`position: static`), forces
all reveal end-states (`opacity: 1; transform: none`), and hides the
atmosphere. A scrollytelling piece that prints as a coherent essay is a
piece built in the right order.

### 12.2 Measure the story, not just the page

Scroll-depth analytics tell you where readers abandon: observe each chapter
sentinel (you already have the observers) and emit events. The numbers that
matter: percent reaching the signature moment, percent reaching the CTA,
and time-in-chapter (a chapter readers blow through is overwritten or
overlong in scroll-distance; one they stall in may be janking — correlate
with INP). A/B the step gap (§3.1's `40vh`) before anything else; pacing is
the highest-leverage constant on the page.

### 12.3 Edge cases that bite real builds

- **RTL locales:** horizontal effects (§10.2, marquees) must mirror;
  use logical properties (`inset-inline-start`) and flip travel direction
  off `dir="rtl"`.
- **Text expansion & CJK:** German/Finnish run ~30% longer than English —
  steps grow taller, scroll distances stretch, and pacing tuned in English
  drifts. Size step gaps in `vh`, never to measured English heights, and
  re-test pacing per locale. Split-line reveals (§10.7) need locale-aware
  segmentation: CJK has no spaces (`Intl.Segmenter`, not `split(' ')`), and
  long-word languages overflow line-wrapped spans.
- **Browser zoom & huge fonts:** test at 200% zoom (a WCAG requirement) —
  fixed-height pinned scenes overflow; prefer `min-height` and `svh`/`rem`
  sizing.
- **Find-in-page & fragment links:** browsers scroll instantly to matches —
  observers must fire correctly when the page *teleports*, not just when it
  glides (another reason center-band observers beat scroll-delta logic; they
  re-evaluate on any intersection change).
- **Restored scroll position:** on back-navigation the browser restores
  mid-page scroll — run `update()` once on load (both reference pages do)
  so layers aren't frozen at their top-of-page positions.
- **Foldables & ultrawide:** clamp scene aspect ratios; a 21:9 viewport
  turns a 100vh hero into a letterboxed sliver of treeline.
- **`prefers-reduced-data` / Save-Data:** skip frame sequences, particle
  canvases, and video scrubs entirely; the flat story already works.
- **Battery/thermal:** pause the permanent rAF when
  `document.visibilityState === 'hidden'` and consider backing off particle
  counts when frames start missing budget (track rolling frame time; if
  >20ms for 60 frames, degrade gracefully). A page that melts laps gets
  closed.

---

## 13. The Asset Production Pipeline (making the layers, not just moving them)

Most failed parallax in the wild is failed asset prep. The code in §§1–3
assumes layers exist; this section is how they come to exist.

### 13.1 Splitting a photo into depth layers

A single photograph becomes a parallax scene in three steps:

1. **Extract the subject(s).** Select-subject / AI background removal gives
   you the foreground with alpha. Cut at natural depth boundaries (a person,
   a tree, a railing) — never through texture (grass, water), where the seam
   will shimmer the moment layers move.
2. **Inpaint the hole.** The moment the foreground moves at a different
   speed, it *uncovers the background behind itself* — area the camera never
   photographed. Content-aware / generative fill that region in the
   background plate. Skipping this step is the #1 tell of amateur parallax:
   a ghost halo trailing the subject.
3. **Export with movement margin.** Each layer needs the off-stage bleed
   from §1.3 *baked into the asset* — export the background plate wider than
   the frame, not just positioned wider.

### 13.2 Silhouettes, tinting, and the one-asset trick

- **SVG** for geometric or low-complexity shapes: infinitely scalable, tiny,
  recolorable with `fill: currentColor` — one file, any palette.
- **PNG/WebP raster** for organic complexity (treelines, foliage) — then
  recolor with CSS `filter` chains like the reference builds:
  `brightness(0)` flattens any image to a silhouette;
  `invert() sepia() saturate() hue-rotate()` retints it to anything. One
  `treeline.png` plays six different layers across this repo. This is not
  just thrift — palette-from-one-source is *why* those scenes feel cohesive
  (§1.1's size/contrast rule, enforced by the pipeline itself).
- **Tiling layers** (`repeat-x`) must loop seamlessly: offset the image by
  half its width in an editor and heal the seam. Keep the tile at least as
  wide as a desktop viewport or the repetition becomes countable.

### 13.3 Resolution, formats, and budgets

- **Resolution rule:** export at 2× the largest *displayed* size — and for
  zoom-through layers (§10.5), 2× the displayed size × the maximum scale, or
  the climax of your signature moment is a blur.
- **Formats:** AVIF first (smallest, good alpha), WebP fallback, PNG only
  when both fail. Exception: canvas frame sequences (§10.1) often decode
  *faster* as JPEG/WebP than AVIF — decode latency beats file size when
  you're scrubbing. Run SVGs through SVGO; export everything sRGB (wide-gamut
  sources silently mismatch CSS colors).
- **Budgets (defaults, argue per project):** hero layer stack ≤ 300KB
  combined; full page ≤ 1.5–2MB; frame sequences ≤ 150 frames at 30–60KB
  each, loaded only when the section approaches.
- **Loading discipline:** `<link rel="preload" as="image">` the hero layers
  and `fetchpriority="high"` the LCP one; everything below the fold lazy
  with `loading="lazy" decoding="async"`. Reserve every image's box
  (`aspect-ratio` or width/height attributes) — scroll pages amplify CLS
  because shifts move *trigger positions*, not just pixels.

---

## 14. Living Pages: Lifecycle, Teardown & Deep Links

The reference builds are static pages that live forever. Real deployments —
SPAs, CMS embeds, infinite sites — need the discipline this section adds.

### 14.1 Measurements go stale; assume it

`scrollHeight`, cached rects, and progress denominators rot whenever content
changes height with no `resize` event: lazy images landing, web fonts
swapping, embeds injecting, accordions opening. The fix is observing the
document itself:

```js
const remeasure = () => { docHeight = document.documentElement.scrollHeight - innerHeight; };
new ResizeObserver(remeasure).observe(document.documentElement);
document.fonts?.ready.then(remeasure);   // fonts reflow text
```

Inside the rAF loop, prefer *fresh* `getBoundingClientRect()` reads (already
viewport-relative, always current) over cached document positions; cache
only what's expensive and invalidate it in `remeasure`.

### 14.2 Teardown or leak

Every observer, listener, and loop you start must have an owner that stops
it — in an SPA, "navigate away" doesn't unload the page, and orphaned rAF
loops keep burning frames against detached DOM. The clean pattern is one
`AbortController` per experience:

```js
function mountScrolly(root) {
  const ac = new AbortController();
  const observers = [];
  let rafId = 0;

  addEventListener('scroll', onScroll, { passive: true, signal: ac.signal });
  addEventListener('resize', remeasure, { signal: ac.signal });
  document.addEventListener('visibilitychange', () => {
    document.hidden ? cancelAnimationFrame(rafId) : (rafId = requestAnimationFrame(tick));
  }, { signal: ac.signal });

  return function unmount() {            // call on route change
    ac.abort();                          // kills every listener at once
    observers.forEach(o => o.disconnect());
    cancelAnimationFrame(rafId);
  };
}
```

Make `mount` idempotent (guard against double-init), pause permanent loops
on `visibilitychange` (battery, §12.3), and cap growable arrays — the
showcase's particle pool splices itself back to a ceiling after click
bursts; every "spawn on interaction" system needs that ceiling.

### 14.3 Deep links: arriving in the middle of a story

Shareable chapter positions are what separate an *article* from a demo:

- **Publish position:** as each chapter sentinel crosses center, update the
  URL with a **throttled** `history.replaceState(null, '', '#chapter-3')` —
  once per chapter change, never per frame (browsers rate-limit and will
  throw).
- **Arrive cold:** when a visitor lands on `#chapter-3`, the browser jumps
  instantly. Center-band observers self-correct (they evaluate on initial
  observation), but *scrubbed* state needs one manual `update()` after the
  jump — the same call both reference pages already make on load for
  restored-scroll positions. Test arrival at every chapter, not just the top.
- **`history.scrollRestoration = 'manual'`** only if you genuinely restore
  position yourself (e.g., a chapter router); the default `'auto'` plus a
  load-time `update()` is correct for most pages. Manual without
  reimplementation breaks back-button expectations — the worst trade.

---

## 15. The Team Layer: Handoff, Lottie & Rive, Automated QA

### 15.1 Speccing motion so designers and developers agree

Motion dies in handoff when it's described with adjectives. Spec it with
tokens — a table both sides own:

```text
TOKEN            VALUE                         USED FOR
ease-arrive      cubic-bezier(.16,1,.3,1)      every entrance
ease-depart      ease-in (0.42,0,1,1)          every exit
dur-micro        200ms                         hovers, toggles
dur-content      500ms                         reveals, cards
dur-scenery      1100ms                        sky, scene phases
travel-reveal    30px                          entrance offset
stagger-step     90ms                          sibling delay
```

Publish them as CSS custom properties so the spec *is* the implementation.
For anything choreographed, designers record a reference video (Figma
prototype, After Effects) and developers match it constant-by-constant —
"like the video at 0:04" beats four paragraphs of description.

### 15.2 Lottie and Rive: designer-authored, developer-scrubbed

When the animation is illustration-complex (a character, a mascot, an
intricate diagram), hand-coding it is the wrong tool. Two industry-standard
bridges:

- **Lottie** — After Effects → JSON → `lottie-web`. Scrub by scroll:

```js
const anim = lottie.loadAnimation({ container, path: 'scene.json', autoplay: false });
// in the rAF loop:
anim.goToAndStop(progress * (anim.totalFrames - 1), true);
```

  Catches: the runtime is ~60KB; complex comps (many masks/effects) render
  on the main thread and *can out-jank anything in this document* — audit
  the JSON, prefer the dotLottie format, and cap layer counts with the
  designer up front.
- **Rive** — purpose-built for interactive vectors: smaller runtime, renders
  to canvas/WebGL, and **state machines** let the designer author the logic
  ("blend day→night by this input") while the developer just feeds a number:
  scroll progress in, authored behavior out. For scrollytelling mascots and
  diagrams, this is the strongest designer-developer contract currently
  available.

Both honor the same rules as everything else: drive them from the one rAF
loop, lazy-load them per section, and freeze them under reduced motion.

### 15.3 Automated QA (the CI gate)

Appendix D is the manual loop; ship gates belong in CI:

```js
// Playwright sketch: assert story state at a scroll position
await page.goto('/scrollytelling.html');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
await page.waitForFunction(() => document.querySelector('#pinScene').dataset.phase === 'night');
await expect(page).toHaveScreenshot('chapter-night.png', { maxDiffPixelRatio: 0.02 });
```

The suite that catches real regressions:

1. **State assertions:** at N fixed scroll percentages, assert `data-phase`,
   revealed classes, and progress-bar transform. Cheap, fast, catches broken
   observers immediately.
2. **Visual regression:** screenshots at those same positions (disable
   animations first: `page.emulateMedia({ reducedMotion: 'reduce' })` gives
   you deterministic end-states — your reduced-motion path and your
   snapshot stability are the same investment).
3. **Reduced-motion render:** one full-page pass with reduced motion
   emulated, asserting all content visible — this *is* the WCAG path, tested
   on every commit.
4. **A11y scan:** axe-core at top, middle, and end scroll positions (scroll
   pages hide violations mid-story that a top-of-page scan never sees).
5. **Budget gates:** Lighthouse CI asserting CLS/LCP and a total-bytes
   budget (§13.3) so a designer's 4MB hero export fails the build, not the
   user's phone.

---

## 16. A Worked Decision Trace (how the rules actually get applied)

Rules describe; judgment decides. This is the reconstructed decision log for
`pages/designs/scrollytelling.html` — the kind of reasoning a build should
be able to show for every constant in it.

**Brief:** teach scrollytelling on a design-education site; brand is forest +
ember; assets on hand are one treeline silhouette, one birdhouse, one tree;
no budget for new art.

1. **Metaphor (§11.1): time, not journey.** The teaching content is a
   sequence of *states* ("the scene pins → dusk → night → lights on"), which
   maps onto time-of-day for free. A journey metaphor would demand new
   scenery per chapter — an asset bill the brief can't pay. Time recolors
   *one* scene with gradients and filters. The constraint made the choice
   (§11.5), and the choice then dictated the techniques: pinned scene +
   `@property` sky tween, not horizontal travel.
2. **Signature moment (§11.2): the day→night scene.** It lands at ~65%
   through the page — after the essay and the lab have built investment —
   and the hero was deliberately kept to three layers so the novelty budget
   stayed concentrated.
3. **Constants, tuned one at a time (§11.6):** step gap at `25vh` read like
   a slideshow (two steps active per screen, phases double-firing); `60vh`
   left dead air where readers wondered if the page was broken; `40vh`
   landed. Sky transition at `0.6s` read as a light switch; `1.1s` reads as
   dusk actually falling. Observer band at `-35%` double-fired on short
   steps; `-42%` (a 16% band) fixed it. The stagger ships at 90ms after 60
   felt simultaneous and 150 felt laggy on the six-card grid.
4. **What was refused, and why:** a smooth-scroll library (a11y and latency
   cost for a page whose whole point is respecting native scroll);
   letter-level text staggers (reading-flow hazard, §10.7); audio (no
   narrative need — refusal is also a §11.2 budget decision); a fourth hero
   layer (frame budget on 4× throttle said no).
5. **What would change at production scale:** the showcase build answers
   this — same physics, plus atmosphere (canvas embers), cursor systems, and
   scroll-scrubbed props, justified because a homepage is a *brand* piece
   where atmosphere is content (§3.7's rule).

The meta-lesson: every constant above was found by changing one number,
scrolling, and articulating what *feeling* changed. If you can't narrate a
trace like this for your build, you haven't tuned it — you've shipped
defaults.

---

## 17. The Reviewer's Rubric (grading a build, including your own)

Score each category; the gate is the *lowest* category, not the average — a
95-point narrative with a failing a11y score is a failing page.

**Instant fails (before scoring):** scroll-jacking or wheel interception;
no `prefers-reduced-motion` path; layout properties animated per frame;
auto-playing motion >5s with no pause control (WCAG 2.2.2).

| Category | Weight | What earns the points |
|---|---|---|
| **Narrative** | 25 | One scroll metaphor, consistently applied; a single signature moment, placed past the midpoint; one idea per viewport; every effect can name the idea it lands; flat read-through still coherent |
| **Performance** | 25 | Clean 4×-throttled trace (no long tasks, no forced reflow); transforms/opacity only; one listener → one rAF; layer count justified; CLS ≈ 0; LCP unburdened by decoration |
| **Accessibility** | 20 | Full reduced-motion path (content + end states intact); keyboard traversal hits every trigger; semantic story order in DOM; decorative elements aria-hidden; 200% zoom survives; contrast holds in *every* scene phase (night scenes are where contrast goes to die) |
| **Assets** | 15 | Within §13.3 budgets; correct formats; no inpainting halos or visible tile seams; resolution holds at max scale; hero preloaded, below-fold lazy |
| **Resilience** | 15 | Restored-scroll and deep-link arrival correct; measurements survive late-loading content; teardown exists (SPA); RTL/expansion handled or scoped out explicitly; prints as an essay |

**Reading the score:** 90+ ship; 75–89 one focused polish pass (the rubric
tells you where); 60–74 the pacing or architecture is wrong — re-grey-box
(§11.6) before polishing; <60 rebuild on the flat story (§7 step 1), which
is presumably still good.

Review *method*, not just criteria: scroll it three ways — fast flick
(does it jank? do triggers misfire?), slow read (does pacing hold?), and
keyboard-only with reduced motion (is the story still there?). Then read
the trace, then read the code. Feel first, measure second, audit third.

---

## 18. The Practice Curriculum (reps that build taste)

Knowledge compounds only through builds. A ladder, each rung producing an
artifact:

**Weeks 1–2 — mechanics until they're reflex.** Build the progress bar
three ways (JS scaleX, CSS `animation-timeline: scroll()`, and broken — via
`width%` — then *watch the difference* in the profiler with paint flashing).
Write the reveal observer and the §2.1 ticking loop from memory. Deliberately
cause layout thrashing, find it in a trace, fix it. You're done when
Appendix E rebuilds from a blank file without reference.

**Weeks 3–4 — depth and pinning.** A three-layer hero from *one* image using
§13.2 filter recoloring; tune speeds until a stranger says "3D" unprompted.
A pinned stepper from scratch, including the mobile collapse. A sticky
stacking deck (§10.4). Ship each to a phone and scroll with your thumb —
trackpad feel lies.

**Month 2 — clone structures from the canon (§11.4).** One per week:
a Snow Fall-style chapter transition, an Apple-style frame scrub (30 frames
is enough to learn it), a Pudding-style chart stepper. Rules: structure
only, your own assets, and write the decision trace (§16) for each as if
you'd designed it — reverse-engineering the *why* is the actual exercise.

**Month 3 — one original piece.** Real content, one metaphor, one signature
moment. Grey-box the pacing first and put it in front of three people before
any visual design. Ship when it scores 85+ on §17 — graded by someone who
isn't you.

**Ongoing — the weekly teardown.** One award-winning scroll page per week in
DevTools: count its layers, find its listeners, check its reduced-motion
behavior (most fail — notice *how*), and steal exactly one structure into
your notes. Taste is a database; this is how it gets rows.

---

## 19. Quick-Reference Cheat Sheet

```text
PHYSICS      offset = -camera × speed; same direction; speed ∝ size/contrast; bleed layers by maxOffset
PIPELINE     one passive listener → ticking flag → one rAF → reads, then writes
PROPERTIES   transform + opacity only; translate3d to promote; will-change sparingly
TRIGGERS     IntersectionObserver (one-shot: unobserve; stepper: center band via rootMargin -42%)
STATE        JS sets data-attributes / custom properties; CSS owns all transitions
PINNING      position: sticky + tall sibling column; beware ancestor overflow
STAGGER      60–120ms steps, 20–50px travel, 0.4–0.9s ease-out, trigger early, fire once
REPLAY       remove class → rAF → rAF → add class
GRADIENTS    @property-registered color stops to make them tween
PROGRESS     scaleX(scrollY / (scrollHeight - innerHeight)); publish as --scroll-progress
MOBILE       100svh; pointer:coarse gates; stack pinned layouts; throttled-CPU test
A11Y         prefers-reduced-motion kills motion in CSS *and* JS; aria-hidden decoration;
             real controls with labels; never hijack scroll
STORY        hook → context → interactive proof → pinned climax → CTA; one idea per viewport;
             caption the magic; earn the technique
STANDARDS    animation-timeline: scroll()/view() + animation-range behind @supports;
             scroll-snap proximity (not mandatory); overscroll-behavior: contain on inner demos;
             scrollend for settle events; content-visibility for long stories;
             WCAG 2.2.2 pause control on anything auto-moving >5s; guard CLS (reserve space) & INP (<8ms frames)
LIBRARIES    vanilla first; ScrollTrigger only for multi-act choreography; lerped-scroll libs
             cost a11y + latency — brand decision, not default; library must remove more complexity than it adds
FRINGE       canvas frame scrub > video scrub (all-intra if video); horizontal-in-vertical =
             sticky + tall wrapper as fuel; stroke-dashoffset line draws; sticky stacking decks (≤6);
             zoom-through scale cascades; clip-path/mask + occluder reveals; variable-font wght on headlines only;
             split-line (never letter) staggers; exits at ~60% of entrance intensity
CREATIVE     pick ONE scroll metaphor (time/depth/journey/zoom/assembly); one signature moment,
             quiet competence elsewhere; one easing family + duration scale + direction grammar;
             steal structure not surfaces; grey-box the pacing before designing
RESILIENCE   flat story = SEO + print + reader-mode for free; scroll-depth analytics on chapter
             sentinels; run update() once on load (restored scroll); test 200% zoom, RTL, find-in-page;
             honor Save-Data; pause rAF when hidden; degrade particles on missed frames
STACKING     transform/filter/will-change ancestors create containing blocks — fixed children break;
             keep fixed UI outside transformed subtrees; overflow: clip (not hidden) preserves sticky
ASSETS       cut at depth boundaries, inpaint the uncovered hole, bake in bleed; brightness(0) + filters
             retint one image into many layers; AVIF→WebP→PNG (JPEG for frame scrubs); hero stack ≤300KB,
             page ≤2MB; preload hero, lazy the rest, reserve every box
LIFECYCLE    ResizeObserver on documentElement + fonts.ready (stale heights); one AbortController per
             experience, disconnect observers, cancel rAF on unmount; idempotent mount; cap particle pools
DEEP LINKS   throttled replaceState per chapter (never per frame); manual update() after hash arrival;
             scrollRestoration 'manual' only if you actually restore
HANDOFF      motion tokens (easing/duration/travel/stagger) as CSS variables = spec is implementation;
             Lottie goToAndStop(progress × frames) — audit JSON weight; Rive state machines: progress in,
             authored behavior out; both lazy-loaded, both frozen under reduced motion
QA (CI)      Playwright: scroll to fixed %, assert data-phase + screenshots under reducedMotion emulation;
             axe-core at three scroll depths; Lighthouse CI gates CLS/LCP and byte budgets
REVIEW       gate on lowest category, not average; instant fails: scroll-jack, no reduced-motion,
             layout-prop animation, unpausable >5s motion; scroll it fast / slow / keyboard-only;
             feel first, measure second, audit third
```

Master these and the rest is taste. The reference pages in this repo are the
taste — read them side by side with this document, change one constant at a
time, and watch what each one does to the feel of the scroll.

---

## Appendix A: Glossary (the vocabulary this document assumes)

- **Viewport** — the visible window onto the page. **Scrollport** — the
  visible area of any scroll container (usually the viewport, but an inner
  `overflow: auto` box has its own).
- **Document vs. viewport coordinates** — `window.scrollY` and `pageX` are
  document-relative (grow as you scroll); `getBoundingClientRect()` and
  `clientX` are viewport-relative (an element at the top of the screen has
  `rect.top ≈ 0` no matter how far you've scrolled). Mixing the two frames
  is the most common scroll-math bug. Convert with
  `documentY = rect.top + scrollY`.
- **Progress** — any scroll value normalized to 0..1 (page progress, section
  progress, element-through-viewport progress). Almost every effect in this
  document is "map a progress to a property."
- **Pin** — holding an element fixed on screen while the page scrolls past
  (via `position: sticky` or a library's pin-spacer).
- **Scrub** — binding an animation's playhead directly to scroll position,
  so scrolling backwards plays it backwards. Opposite of **trigger** (fire
  once when a line is crossed, then play on the clock).
- **Stepper** — a column of short text blocks whose passage through a trigger
  band advances a pinned visual's state (§3.1).
- **Parallax** — layers translating at different fractions of scroll speed to
  fake depth (§1).
- **Stagger** — offsetting the start times of sibling animations (60–120ms)
  so they arrive as a sequence, not a block.
- **Easing** — the speed curve of an animation. `cubic-bezier(x1,y1,x2,y2)`
  shapes it: the first pair controls the launch, the second the landing.
  `(.16, 1, .3, 1)` launches fast and lands very softly — an "ease-out
  expo" feel. `linear` is correct for *scrubbed* animation (scroll is the
  easing), wrong for *triggered* animation (robotic).
- **Lerp** (linear interpolation) — `a + (b - a) * t`. "Lerping toward" a
  target each frame (`current += (target - current) * 0.1`) produces smooth
  chasing motion; the factor is the chase speed (see Appendix C).
- **rAF / `requestAnimationFrame`** — "run this function right before the
  next paint." The only correct clock for per-frame visual work.
- **Ticking flag** — the boolean that collapses many scroll events into one
  rAF callback (§2.1).
- **Jank** — visible stutter from frames that missed their deadline.
- **Layer promotion / compositing** — the browser giving an element its own
  GPU texture so it can move without repainting (Appendix B).
- **FLIP** — First-Last-Invert-Play: measure an element's start and end
  positions, apply the inverse delta as a transform, then transition to
  identity. How you animate things CSS can't transition (grid placement,
  reordering).
- **Sentinel** — an invisible or content element observed purely to detect a
  scroll position ("the reader reached chapter 3").
- **`rootMargin` / `threshold`** — IntersectionObserver tuning: `rootMargin`
  grows/shrinks the detection box (negative % insets it — the center-band
  trick); `threshold` is how much of the target must overlap to fire.
- **Scroll chaining** — inner scroller hits its end and the page takes over
  the gesture; contained with `overscroll-behavior`.
- **CLS / INP / LCP** — Core Web Vitals: layout shift, input responsiveness,
  and largest-content paint time. §8.3 covers how scroll work damages each.

## Appendix B: How Browsers Render (the 60-second mental model)

Every frame the browser may run up to four stages, each feeding the next:

```text
STYLE ──▶ LAYOUT ──▶ PAINT ──▶ COMPOSITE
(which     (where      (draw      (slide the
 rules      everything  pixels     pre-drawn
 apply)     sits)       to layers) layers together)
```

- Change `width`, `top`, `font-size` → re-enter at **LAYOUT**: the browser
  re-solves geometry for potentially the whole page, then repaints, then
  recomposites. Most expensive.
- Change `background`, `color`, `box-shadow`, `filter` → re-enter at
  **PAINT**: pixels redrawn, layers recomposited.
- Change `transform`, `opacity` → **COMPOSITE only**: the layer was already
  painted; the GPU just moves/fades the texture. This stage runs on the
  **compositor thread**, separate from the main thread running your JS — so
  composited animations stay smooth *even while the main thread is busy*.
  This is the entire basis of §2.2, and of why CSS scroll-driven animations
  (§8.1) are "fast by default."

Frame budget: at 60Hz you have **16.7ms** per frame for *everything* — JS,
style, layout, paint, composite. Aim to spend under ~8ms in your own code so
the browser has headroom (and 120Hz displays halve the budget). One forced
synchronous layout (reading `offsetHeight` after writing a style — §2.1's
"layout thrashing") can blow the whole budget alone.

## Appendix C: The Math Toolkit (every function this craft actually uses)

```js
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// normalize: where is v between a and b? → 0..1  (inverse lerp)
const norm = (v, a, b) => clamp((v - a) / (b - a), 0, 1);

// lerp: what value is t (0..1) of the way from a to b?
const lerp = (a, b, t) => a + (b - a) * t;

// mapRange: the workhorse — rescale v from one range to another
const map = (v, inA, inB, outA, outB) => lerp(outA, outB, norm(v, inA, inB));

// Example: rotate a card from -7° to 7° as it crosses the viewport
const rot = map(rect.top + rect.height / 2, vh, 0, -7, 7);

// Apply easing to a *triggered* progress before mapping (never to scrubbed):
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

// Frame-loop smoothing ("lerp toward target") — the cursor-glow trick:
current += (target - current) * 0.07;   // small factor = dreamy lag
current += (target - current) * 0.55;   // large factor = snappy chase
// Caveat: that factor is frame-rate dependent (faster on 120Hz). The
// rate-independent form, if you need it:
current = lerp(current, target, 1 - Math.pow(1 - k, dt * 60)); // dt in seconds
```

Section progress — the value almost everything else derives from:

```js
// 0 when the section's top reaches the viewport bottom,
// 1 when its bottom leaves the viewport top:
const p = norm(rect.top, vh, -rect.height);
// "How far is the element's center from the viewport's center?" (−1..1):
const t = (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2);
```

## Appendix D: The Verification Workflow (Chrome DevTools)

Claims like "60fps" and "compositor-only" are testable. The loop:

1. **FPS + jank overview:** Cmd/Ctrl+Shift+P → "Show frames per second (FPS)
   meter" — scroll the page, watch for red frames.
2. **Find the cause:** Performance panel → record while scrolling ~5s. Read
   the flame chart: long yellow blocks = your JS; purple = layout (look for
   "Forced reflow" warnings = read/write interleaving, §2.1); green = paint.
   A healthy scrollytelling trace is a thin comb well under the frame line.
3. **Catch repaints:** Rendering drawer → "Paint flashing." Scroll. Anything
   flashing green is repainting per frame — if it's a parallax layer, you've
   animated a paint property by mistake.
4. **Audit layers:** Layers panel (or Rendering → "Layer borders"). Each
   promoted layer costs GPU memory; dozens of bordered elements means
   `will-change` spam.
5. **Test the floors:** Performance panel gear → CPU 4× slowdown (the
   low-end-device test, §4.3); Rendering drawer → "Emulate CSS
   prefers-reduced-motion" (read the whole page that way, §7 step 8);
   device toolbar for touch + small viewports.
6. **Score it:** Lighthouse run for CLS/LCP; field INP needs real-user data,
   but a clean 4×-throttled trace is the best proxy you can get locally.

## Appendix E: A Complete Minimal Build (single file, no dependencies)

The whole §2 architecture plus the two essential patterns in ~90 lines —
paste into any `.html` file and scroll. This is the skeleton every build in
this document grows from:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Scrollytelling skeleton</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { font-family: system-ui; background: #0b1020; color: #f4e7c5; }

  /* progress bar — transform-only */
  #bar { position: fixed; top: 0; left: 0; right: 0; height: 4px;
         background: #ff7a2f; transform: scaleX(0); transform-origin: left;
         will-change: transform; z-index: 10; }

  /* parallax hero: two layers, different speeds via data-speed */
  .hero { position: relative; height: 100svh; overflow: hidden;
          display: grid; place-items: center; }
  .layer { position: absolute; inset: -10% -2%; will-change: transform; }
  .far  { background: radial-gradient(circle at 30% 30%, #24365e, transparent 60%); }
  .near { background: radial-gradient(circle at 70% 80%, #a74918aa, transparent 50%); }
  .hero h1 { position: relative; font-size: clamp(2rem, 6vw, 4rem); }

  /* reveal-on-enter */
  .card { max-width: 36rem; margin: 40vh auto; padding: 2rem;
          background: #172c16; border-radius: 12px;
          opacity: 0; transform: translateY(30px);
          transition: opacity .6s cubic-bezier(.16,1,.3,1),
                      transform .6s cubic-bezier(.16,1,.3,1); }
  .card.shown { opacity: 1; transform: none; }

  /* pinned scene + stepper */
  .pin { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;
         max-width: 60rem; margin: 0 auto; }
  .scene { position: sticky; top: 25vh; height: 50vh; border-radius: 12px;
           background: #7ec8e8; transition: background-color 1s; }
  .scene[data-phase="dusk"]  { background: #ff7a2f; }
  .scene[data-phase="night"] { background: #080511; }
  .steps > div { min-height: 70vh; display: grid; place-items: center; }

  @media (prefers-reduced-motion: reduce) {
    .layer { transform: none !important; }
    .card { transition: none; opacity: 1; transform: none; }
  }
</style>
</head>
<body>
  <div id="bar"></div>
  <section class="hero">
    <div class="layer far"  data-speed="0.15"></div>
    <div class="layer near" data-speed="0.45"></div>
    <h1>Scroll.</h1>
  </section>
  <div class="card">I fade in once, staggered by nothing but my position.</div>
  <section class="pin">
    <div class="scene" id="scene" data-phase="day"></div>
    <div class="steps">
      <div data-phase="day"><p>Step 1: the scene pins (pure CSS sticky).</p></div>
      <div data-phase="dusk"><p>Step 2: I crossed center — dusk falls.</p></div>
      <div data-phase="night"><p>Step 3: night. Scroll up: it rewinds.</p></div>
    </div>
  </section>
  <div class="card">The end. View source — this is the whole trick.</div>
<script>
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.getElementById('bar');
  const layers = document.querySelectorAll('.layer');
  let ticking = false;

  function update() {                       // one rAF owns all scroll work
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    bar.style.transform = `scaleX(${(y / max).toFixed(4)})`;
    if (reduced) return;
    if (y < vh) layers.forEach(l =>         // viewport-locked hero parallax
      l.style.transform = `translate3d(0, ${(y * l.dataset.speed).toFixed(1)}px, 0)`);
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();                                 // handle restored scroll position

  const revealer = new IntersectionObserver((es, o) => es.forEach(e => {   // reveals: fire once
    if (e.isIntersecting) { e.target.classList.add('shown'); o.unobserve(e.target); }
  }), { threshold: 0.2 });
  document.querySelectorAll('.card').forEach(c => revealer.observe(c));

  const scene = document.getElementById('scene');          // stepper: center band
  const stepper = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) scene.dataset.phase = e.target.dataset.phase;
  }), { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('.steps > div').forEach(s => stepper.observe(s));
</script>
</body>
</html>
```

Grow it in §7's order: this file *is* steps 1–5.

## Appendix F: Should This Page Scrollytell At All?

Run the gate before writing any code:

1. **Is there a narrative arc** — a beginning, development, and payoff that
   benefits from authored pacing? (Pricing pages, docs, dashboards: no.)
2. **Will a reader plausibly traverse it top-to-bottom once?** Scrollytelling
   punishes reference-style revisiting; if users return to look things up,
   give them a normal page.
3. **Does the content supply the imagery**, or would you be inventing
   decoration to justify the format? (Decoration-first scrollytelling is how
   you get a screensaver with paragraphs.)
4. **Can the flat version ship first?** If deadline pressure means motion
   would come at the cost of the words, ship the words.
5. **Budget honestly:** a §3-grade build is days; a §10 signature moment is
   a week+; WebGL is a project. Half-finished scroll effects read worse than
   none.

Score below 4/5 → use reveals and a progress bar (an afternoon, no regrets)
and stop there.

## Appendix G: Freshness Notes

Time-sensitive claims in this document, last verified **June 2026**:

- Scroll-driven animations support (§8.1): Chrome/Edge 115+, Safari 26+,
  Firefox behind `layout.css.scroll-driven-animations.enabled`. Re-check
  caniuse.com before relying on the `@supports` split — Firefox unflagging
  is expected and will simplify the calculus.
- `scrollend` (§8.2): Chrome/Firefox, not Safari at time of writing.
- Library characterizations (§9) describe GSAP ScrollTrigger / Lenis as of
  2026; APIs drift, the *decision rule* doesn't.
- Everything in §§1–7 (physics, pipeline, observers, sticky, narrative
  craft) is foundational and does not expire.

