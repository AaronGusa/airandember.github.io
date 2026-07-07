/* ============================================================
   AIR & EMBER — SHOWCASE ENGINE
   One requestAnimationFrame loop drives everything:
   parallax layers, ember particles, cursor physics,
   scroll-linked rotation, marquee, and the lil walker.
   ============================================================ */

(() => {
    'use strict';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) document.body.classList.add('touchDevice');

    /* ---------- shared state ---------- */
    const mouse = { x: innerWidth / 2, y: innerHeight / 2, // raw
                    gx: innerWidth / 2, gy: innerHeight / 2, // glow (laggy)
                    rx: innerWidth / 2, ry: innerHeight / 2 }; // ring (snappy)
    let scrollY = window.scrollY;
    let docHeight = 1;
    let vh = innerHeight;

    const measure = () => {
        vh = innerHeight;
        docHeight = Math.max(1, document.documentElement.scrollHeight - vh);
    };
    measure();
    addEventListener('resize', measure);

    addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }, { passive: true });

    addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    /* ============================================================
       EMBER PARTICLE FIELD
       Embers rise from the bottom; wind motes drift across.
       Both are repelled / stirred by the cursor.
       ============================================================ */
    const canvas = document.getElementById('emberCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    const sizeCanvas = () => {
        canvas.width = innerWidth * devicePixelRatio;
        canvas.height = innerHeight * devicePixelRatio;
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    sizeCanvas();
    addEventListener('resize', sizeCanvas);

    const EMBER_COUNT = prefersReduced ? 0 : (isTouch ? 28 : 60);
    const MOTE_COUNT  = prefersReduced ? 0 : (isTouch ? 10 : 22);

    const spawnEmber = (randomY = false) => ({
        kind: 'ember',
        x: Math.random() * innerWidth,
        y: randomY ? Math.random() * innerHeight : innerHeight + 10,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -(0.4 + Math.random() * 1.1),
        size: 1 + Math.random() * 2.6,
        life: 0,
        maxLife: 400 + Math.random() * 300,
        wobble: Math.random() * Math.PI * 2,
        hue: 18 + Math.random() * 22 // orange band
    });

    const spawnMote = () => ({
        kind: 'mote',
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        vx: 0.25 + Math.random() * 0.5,
        vy: (Math.random() - 0.5) * 0.12,
        size: 0.8 + Math.random() * 1.4,
        life: 0,
        maxLife: Infinity,
        wobble: Math.random() * Math.PI * 2
    });

    for (let i = 0; i < EMBER_COUNT; i++) particles.push(spawnEmber(true));
    for (let i = 0; i < MOTE_COUNT; i++) particles.push(spawnMote());

    const drawParticles = () => {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.life++;
            p.wobble += 0.02;

            // cursor stirs the air: gentle radial push within 140px
            if (!isTouch) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 19600 && distSq > 1) {
                    const dist = Math.sqrt(distSq);
                    const force = (140 - dist) / 140 * 0.6;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }
            }

            // damping back toward natural motion
            p.vx *= 0.96;
            p.vy *= 0.96;

            if (p.kind === 'ember') {
                p.vy -= 0.012; // buoyancy
                p.x += p.vx + Math.sin(p.wobble) * 0.4;
                p.y += p.vy;

                const fade = 1 - p.life / p.maxLife;
                if (fade <= 0 || p.y < -20) { particles[i] = spawnEmber(); continue; }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 95%, ${55 + Math.sin(p.wobble * 3) * 10}%, ${0.55 * fade})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `hsla(${p.hue}, 95%, 60%, ${0.8 * fade})`;
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                p.vx += 0.004; // wind always pushes east
                p.x += p.vx + Math.sin(p.wobble) * 0.2;
                p.y += p.vy + Math.cos(p.wobble * 0.7) * 0.15;
                if (p.x > innerWidth + 20) { p.x = -20; p.y = Math.random() * innerHeight; }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(159, 216, 203, ${0.18 + Math.sin(p.wobble) * 0.08})`;
                ctx.fill();
            }
        }
    };

    /* ============================================================
       CURSOR — glow lags behind, ring stays snappy
       ============================================================ */
    const glow = document.getElementById('cursorGlow');
    const ring = document.getElementById('cursorRing');

    const updateCursor = () => {
        mouse.gx += (mouse.x - mouse.gx) * 0.07;
        mouse.gy += (mouse.y - mouse.gy) * 0.07;
        mouse.rx += (mouse.x - mouse.rx) * 0.55;
        mouse.ry += (mouse.y - mouse.ry) * 0.55;
        glow.style.transform = `translate(${mouse.gx - 240}px, ${mouse.gy - 240}px)`;
        ring.style.transform = `translate(${mouse.rx - 11}px, ${mouse.ry - 11}px)`;
    };

    // ring swells on interactive elements
    document.querySelectorAll('a, button, .elementCard, .galleryItem').forEach((el) => {
        el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
        el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
    });

    /* ============================================================
       MAGNETIC BUTTONS — they lean toward the cursor
       ============================================================ */
    if (!isTouch && !prefersReduced) {
        document.querySelectorAll('.magnet').forEach((el) => {
            el.addEventListener('mousemove', (e) => {
                const r = el.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.28}px)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    }

    /* ============================================================
       CARD TILT + SHEEN — 3D lean toward cursor
       ============================================================ */
    if (!isTouch && !prefersReduced) {
        document.querySelectorAll('.cardTilt').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;   // 0..1
                const py = (e.clientY - r.top) / r.height;
                card.style.setProperty('--mx', `${px * 100}%`);
                card.style.setProperty('--my', `${py * 100}%`);
                card.style.transform =
                    `rotateY(${(px - 0.5) * 10}deg) rotateX(${(0.5 - py) * 8}deg) translateZ(0)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    /* ============================================================
       SCROLL REVEALS — IntersectionObserver
       ============================================================ */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('shown');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    // CRT terminal boots only once it scrolls into view
    const crt = document.querySelector('.crt');
    if (crt) {
        const crtObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    crt.classList.add('lit');
                    crtObserver.disconnect();
                }
            });
        }, { threshold: 0.4 });
        crtObserver.observe(crt);
    }

    /* ============================================================
       TRUST STORY — pinned scene + stepper (scrollytelling §3.1)
       JS only ANNOUNCES the phase; CSS owns every transition.
       Fires in both directions, so scrolling back up rewinds the story.
       Runs regardless of reduced motion (state is information, not motion).
       ============================================================ */
    const trustScene = document.getElementById('trustScene');
    if (trustScene) {
        const trustTag = document.getElementById('trustPhaseTag');
        const trustSteps = document.querySelectorAll('.trustStep');
        const phaseLabels = {
            ashes: 'cold ashes',
            betrayed: 'embers dying',
            spark: 'a spark catches',
            kindling: 'catching\u2026',
            blaze: 'a steady blaze'
        };
        const trustObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const phase = entry.target.dataset.phase;
                trustScene.dataset.phase = phase;
                if (trustTag) trustTag.textContent = phaseLabels[phase] || phase;
                trustSteps.forEach((s) => s.classList.toggle('is-active', s === entry.target));
            });
        }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
        trustSteps.forEach((s) => trustObserver.observe(s));
    }

    /* ============================================================
       SCROLL-LINKED MOTION (runs inside the rAF loop)
       ============================================================ */
    const parallaxLayers = [...document.querySelectorAll('.pLayer')].map((el) => ({
        el,
        speed: parseFloat(el.dataset.speed || '0.2'),
        section: el.closest('section, .band') || document.body
    }));

    const rotItems = [...document.querySelectorAll('.rotScroll')].map((el) => ({
        el,
        maxRot: parseFloat(el.dataset.rot || '5')
    }));

    const tiltItems = [...document.querySelectorAll('.tiltOnScroll')].map((el) => ({
        el,
        max: parseFloat(el.dataset.tiltMax || '4')
    }));

    const marqueeTrack = document.querySelector('[data-marquee]');
    const nav = document.querySelector('.skyNav');
    const root = document.documentElement;
    let marqueeX = 0;
    let lastScrollY = scrollY;

    const updateScrollEffects = () => {
        const progress = Math.min(1, scrollY / docHeight);
        root.style.setProperty('--scroll-progress', progress.toFixed(4));

        // nav condenses after the hero (trailnav.js owns the new trail bar)
        if (nav) nav.classList.toggle('scrolled', scrollY > vh * 0.6);

        // parallax: each layer slides against its section's scroll position
        for (const { el, speed, section } of parallaxLayers) {
            const rect = section.getBoundingClientRect();
            // how far the section center is from viewport center, in px
            const delta = rect.top + rect.height / 2 - vh / 2;
            el.style.transform = `translate3d(0, ${(delta * speed).toFixed(1)}px, 0)`;
        }

        // gallery images rotate with scroll progress through the viewport
        for (const { el, maxRot } of rotItems) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom < -100 || rect.top > vh + 100) continue;
            // -1 (below) .. 0 (center) .. 1 (above)
            const t = ((vh / 2) - (rect.top + rect.height / 2)) / (vh / 2);
            el.style.transform = `rotate(${(t * maxRot).toFixed(2)}deg) translateY(${(t * -12).toFixed(1)}px)`;
        }

        // gentle scroll tilt (the & in the hero, the CRT)
        for (const { el, max } of tiltItems) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > vh) continue;
            const t = ((vh / 2) - (rect.top + rect.height / 2)) / vh;
            el.style.transform = `rotate(${(t * max * 2).toFixed(2)}deg)`;
        }

        // marquee scrubs faster while scrolling, always crawls a little
        const scrollDelta = scrollY - lastScrollY;
        lastScrollY = scrollY;
        if (marqueeTrack) {
            marqueeX -= 0.6 + Math.min(14, Math.abs(scrollDelta) * 0.45);
            const half = marqueeTrack.scrollWidth / 2;
            if (half > 0 && -marqueeX > half) marqueeX += half;
            marqueeTrack.style.transform = `translate3d(${marqueeX.toFixed(1)}px, 0, 0)`;
        }

        // the lil fella walks the bottom of the funnel band with overall progress
        root.style.setProperty('--walker-x', `${(-80 + progress * (innerWidth + 160)).toFixed(0)}px`);
    };

    /* ============================================================
       MASTER LOOP
       ============================================================ */
    const tick = () => {
        if (!prefersReduced) {
            drawParticles();
            if (!isTouch) updateCursor();
        }
        updateScrollEffects();
        requestAnimationFrame(tick);
    };

    if (prefersReduced) {
        // static fallback: just keep progress + nav state fresh
        updateScrollEffects();
        addEventListener('scroll', updateScrollEffects, { passive: true });
    } else {
        requestAnimationFrame(tick);
    }

    /* ============================================================
       CLICK SPARKS — a tiny burst of embers on every click
       ============================================================ */
    if (!prefersReduced) {
        addEventListener('click', (e) => {
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 3;
                particles.push({
                    kind: 'ember',
                    x: e.clientX,
                    y: e.clientY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1,
                    size: 1 + Math.random() * 2,
                    life: 0,
                    maxLife: 50 + Math.random() * 40,
                    wobble: Math.random() * Math.PI * 2,
                    hue: 18 + Math.random() * 22
                });
            }
            // keep the pool bounded
            if (particles.length > EMBER_COUNT + MOTE_COUNT + 120) {
                particles.splice(EMBER_COUNT + MOTE_COUNT, 60);
            }
        });
    }

    /* ============================================================
       FUNNEL STEP HOVER FX — three personalities:
       spark: red pixels swirling around the cursor like oil
       stoke: mouse speed = heat; flames + warm background
       blaze: a full crackling, dancing fire
       Each card owns a canvas + loop that runs only while hovered
       (plus a cooldown so particles die gracefully).
       ============================================================ */
    if (!isTouch && !prefersReduced) {
        document.querySelectorAll('.funnelStep[data-fx]').forEach(initStepFx);
    }

    function initStepFx(card) {
        const kind = card.dataset.fx;
        const cv = document.createElement('canvas');
        cv.className = 'fxCanvas';
        card.prepend(cv);
        const c = cv.getContext('2d');

        let w = 0, h = 0;
        let pts = [];
        let raf = 0;
        let hovering = false;
        let heat = 0;                       // stoke only
        let mx = -9999, my = -9999;         // cursor in card coords
        let lastMx = 0, lastMy = 0;

        const size = () => {
            const r = card.getBoundingClientRect();
            w = Math.max(1, Math.round(r.width));
            h = Math.max(1, Math.round(r.height));
            cv.width = w * devicePixelRatio;
            cv.height = h * devicePixelRatio;
            c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        };

        /* ---------- spawners ---------- */
        const spawnOil = () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            size: 1 + Math.random() * 2,
            phase: Math.random() * Math.PI * 2,
            spin: Math.random() < 0.5 ? -1 : 1,   // swirl direction around cursor
            shade: 0.5 + Math.random() * 0.5
        });

        const spawnFlame = (power) => ({
            x: Math.random() * w,
            y: h + 4,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -(0.8 + Math.random() * 1.6) * (0.6 + power),
            size: 2.5 + Math.random() * 3.5 * (0.5 + power),
            life: 0,
            maxLife: 40 + Math.random() * 45,
            wobble: Math.random() * Math.PI * 2
        });

        const spawnCrackle = () => ({
            crackle: true,
            x: w * (0.15 + Math.random() * 0.7),
            y: h - Math.random() * h * 0.35,
            vx: (Math.random() - 0.5) * 2.4,
            vy: -(1.5 + Math.random() * 2.5),
            size: 0.8 + Math.random() * 1.4,
            life: 0,
            maxLife: 18 + Math.random() * 22,
            wobble: 0
        });

        /* ---------- SPARK: oily swirl that avoids the cursor ---------- */
        const stepSpark = () => {
            while (hovering && pts.length < 46) pts.push(spawnOil());
            if (!hovering && pts.length) pts.splice(0, Math.ceil(pts.length * 0.06));

            for (const p of pts) {
                p.phase += 0.02;
                // lazy ambient drift
                p.vx += Math.cos(p.phase) * 0.03;
                p.vy += Math.sin(p.phase * 0.9) * 0.03;

                // cursor field: radial avoidance + tangential swirl = oil
                const dx = p.x - mx, dy = p.y - my;
                const d2 = dx * dx + dy * dy;
                const R = 85;
                if (d2 < R * R && d2 > 0.01) {
                    const d = Math.sqrt(d2);
                    const f = (R - d) / R;
                    const nx = dx / d, ny = dy / d;
                    p.vx += nx * f * 0.9;                 // pushed away...
                    p.vy += ny * f * 0.9;
                    p.vx += -ny * f * 1.4 * p.spin;       // ...while orbiting around
                    p.vy += nx * f * 1.4 * p.spin;
                }

                // heavy damping = viscosity
                p.vx *= 0.9;
                p.vy *= 0.9;
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < -4) p.x = w + 4; else if (p.x > w + 4) p.x = -4;
                if (p.y < -4) p.y = h + 4; else if (p.y > h + 4) p.y = -4;
            }

            for (const p of pts) {
                const flick = 0.45 + 0.5 * Math.sin(p.phase * 2) * Math.sin(p.phase * 2);
                c.fillStyle = `rgba(${200 + Math.round(55 * p.shade)}, ${Math.round(45 * p.shade)}, 30, ${flick})`;
                c.fillRect(p.x, p.y, p.size, p.size);
            }
        };

        /* ---------- shared fire renderer (stoke + blaze) ---------- */
        const drawFlames = () => {
            c.globalCompositeOperation = 'lighter';
            for (let i = pts.length - 1; i >= 0; i--) {
                const p = pts[i];
                p.life++;
                if (p.life >= p.maxLife) { pts.splice(i, 1); continue; }
                const fade = 1 - p.life / p.maxLife;
                p.wobble += 0.15;
                p.x += p.vx + Math.sin(p.wobble) * (p.crackle ? 0.2 : 0.9);
                p.vy += p.crackle ? 0.06 : -0.01;   // crackles arc down, flames lift
                p.y += p.vy;

                if (p.crackle) {
                    c.fillStyle = `rgba(255, ${200 + Math.round(Math.random() * 55)}, 140, ${fade})`;
                    c.fillRect(p.x, p.y, p.size + 1, p.size + 1);
                } else {
                    // white-hot yellow when young, deep red as it dies
                    const r = Math.max(0.4, p.size * (0.35 + 0.65 * fade));
                    c.beginPath();
                    c.arc(p.x, p.y, r, 0, Math.PI * 2);
                    c.fillStyle = `hsla(${14 + 38 * fade}, 100%, ${52 + 18 * fade}%, ${0.55 * fade + 0.1})`;
                    c.fill();
                }
            }
            c.globalCompositeOperation = 'source-over';
        };

        /* ---------- STOKE: mouse speed feeds the heat ---------- */
        const stepStoke = () => {
            heat = Math.max(0, heat * 0.965 - 0.0015);
            card.style.setProperty('--heat', heat.toFixed(3));

            if (hovering && heat > 0.02) {
                const n = Math.round(heat * 2 + heat * 5 * Math.random());
                for (let i = 0; i < n && pts.length < 130; i++) pts.push(spawnFlame(heat));
            }
            drawFlames();
        };

        /* ---------- BLAZE: steady healthy fire + crackles + warming bg ---------- */
        const stepBlaze = () => {
            if (hovering) {
                heat = Math.min(1, heat + 0.035);   // ramp up fast
                for (let i = 0; i < 4 && pts.length < 160; i++) pts.push(spawnFlame(0.8));
                if (Math.random() < 0.22) pts.push(spawnCrackle());
            } else {
                heat = Math.max(0, heat * 0.965 - 0.0015);   // cool same rate as stoke
            }
            card.style.setProperty('--heat', heat.toFixed(3));
            drawFlames();
        };

        /* ---------- loop: alive only while there's something to show ---------- */
        const loop = () => {
            c.clearRect(0, 0, w, h);
            if (kind === 'spark') stepSpark();
            else if (kind === 'stoke') stepStoke();
            else stepBlaze();

            if (hovering || pts.length > 0 || heat > 0.02) {
                raf = requestAnimationFrame(loop);
            } else {
                raf = 0;
                c.clearRect(0, 0, w, h);
                if (kind === 'stoke') card.style.setProperty('--heat', '0');
            }
        };

        card.addEventListener('mouseenter', (e) => {
            hovering = true;
            size();
            const r = card.getBoundingClientRect();
            mx = e.clientX - r.left;
            my = e.clientY - r.top;
            lastMx = mx;
            lastMy = my;
            if (!raf) raf = requestAnimationFrame(loop);
        });

        card.addEventListener('mousemove', (e) => {
            const r = card.getBoundingClientRect();
            mx = e.clientX - r.left;
            my = e.clientY - r.top;
            if (kind === 'stoke') {
                heat = Math.min(1, heat + Math.hypot(mx - lastMx, my - lastMy) * 0.006);
            }
            lastMx = mx;
            lastMy = my;
        });

        card.addEventListener('mouseleave', () => {
            hovering = false;
            mx = -9999;
            my = -9999;
        });
    }
})();
