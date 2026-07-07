/* ============================================================
   AIR & EMBER — INNER-PAGE ENGINE
   The showcase engine, trimmed for every page past the
   homepage: ember particles, cursor physics, scroll reveals,
   progress flame, magnetic buttons, card tilt, CRT boot,
   click sparks. One rAF loop drives it all.
   ============================================================ */

(() => {
    'use strict';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) document.body.classList.add('touchDevice');

    /* ---------- shared state ---------- */
    const mouse = { x: innerWidth / 2, y: innerHeight / 2,
                    gx: innerWidth / 2, gy: innerHeight / 2,
                    rx: innerWidth / 2, ry: innerHeight / 2 };
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

    /* ============ EMBER PARTICLE FIELD ============ */
    const canvas = document.getElementById('emberCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let particles = [];
    const EMBER_COUNT = prefersReduced ? 0 : (isTouch ? 18 : 40);
    const MOTE_COUNT  = prefersReduced ? 0 : (isTouch ? 8 : 16);

    if (canvas) {
        const sizeCanvas = () => {
            canvas.width = innerWidth * devicePixelRatio;
            canvas.height = innerHeight * devicePixelRatio;
            ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        };
        sizeCanvas();
        addEventListener('resize', sizeCanvas);
    }

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
        hue: 18 + Math.random() * 22
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

    if (ctx) {
        for (let i = 0; i < EMBER_COUNT; i++) particles.push(spawnEmber(true));
        for (let i = 0; i < MOTE_COUNT; i++) particles.push(spawnMote());
    }

    const drawParticles = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.life++;
            p.wobble += 0.02;

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

            p.vx *= 0.96;
            p.vy *= 0.96;

            if (p.kind === 'ember') {
                p.vy -= 0.012;
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
                p.vx += 0.004;
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

    /* ============ CURSOR ============ */
    const glow = document.getElementById('cursorGlow');
    const ring = document.getElementById('cursorRing');

    const updateCursor = () => {
        if (!glow || !ring) return;
        mouse.gx += (mouse.x - mouse.gx) * 0.07;
        mouse.gy += (mouse.y - mouse.gy) * 0.07;
        mouse.rx += (mouse.x - mouse.rx) * 0.55;
        mouse.ry += (mouse.y - mouse.ry) * 0.55;
        glow.style.transform = `translate(${mouse.gx - 240}px, ${mouse.gy - 240}px)`;
        ring.style.transform = `translate(${mouse.rx - 11}px, ${mouse.ry - 11}px)`;
    };

    if (ring) {
        document.querySelectorAll('a, button, .elementCard, .designCardLink, .nav-link, #logoutButton, .accordion-header')
            .forEach((el) => {
                el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
                el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
            });
    }

    /* ============ MAGNETIC BUTTONS ============ */
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

    /* ============ CARD TILT + SHEEN ============ */
    if (!isTouch && !prefersReduced) {
        document.querySelectorAll('.cardTilt').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
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

    /* ============ SCROLL REVEALS ============ */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('shown');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    // CRT terminals boot when they scroll into view
    document.querySelectorAll('.crt').forEach((crt) => {
        const crtObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    crt.classList.add('lit');
                    crtObserver.disconnect();
                }
            });
        }, { threshold: 0.4 });
        crtObserver.observe(crt);
    });

    /* ============ SCROLL PROGRESS ============ */
    const root = document.documentElement;
    const updateScrollEffects = () => {
        const progress = Math.min(1, scrollY / docHeight);
        root.style.setProperty('--scroll-progress', progress.toFixed(4));
    };

    /* ============ MASTER LOOP ============ */
    const tick = () => {
        drawParticles();
        if (!isTouch) updateCursor();
        updateScrollEffects();
        requestAnimationFrame(tick);
    };

    if (prefersReduced) {
        updateScrollEffects();
        addEventListener('scroll', updateScrollEffects, { passive: true });
    } else {
        requestAnimationFrame(tick);
    }

    /* ============ CLICK SPARKS ============ */
    if (!prefersReduced && ctx) {
        addEventListener('click', (e) => {
            for (let i = 0; i < 8; i++) {
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
            if (particles.length > EMBER_COUNT + MOTE_COUNT + 100) {
                particles.splice(EMBER_COUNT + MOTE_COUNT, 50);
            }
        });
    }
})();
