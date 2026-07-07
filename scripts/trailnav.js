/* ============================================================
   AIR & EMBER — TRAIL NAV
   Strike the match, the light spreads, the trail map opens.
   Handles: open/close state, aria, Esc, closing on link click,
   and condensing the trail bar once you scroll.
   ============================================================ */

(() => {
    'use strict';

    const btn = document.getElementById('matchBtn');
    const map = document.getElementById('trailMap');
    const bar = document.getElementById('trailBar');

    // trail bar condenses once you leave the top of the page
    // (runs even on pages with no map, e.g. the client portal)
    if (bar) {
        const onScroll = () => bar.classList.toggle('scrolled', window.scrollY > 40);
        addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    if (!btn || !map) return;

    const label = btn.querySelector('.matchLabel');

    const setOpen = (open) => {
        map.classList.toggle('open', open);
        btn.classList.toggle('open', open);
        document.body.classList.toggle('trailOpen', open);
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('aria-label', open ? 'Close the trail map' : 'Open the trail map');
        if (label) label.textContent = open ? 'SNUFF IT' : 'TRAIL MAP';
    };

    btn.addEventListener('click', () => setOpen(!map.classList.contains('open')));

    addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && map.classList.contains('open')) {
            setOpen(false);
            btn.focus();
        }
    });

    // picking a waypoint closes the map (matters for same-page anchors)
    map.addEventListener('click', (e) => {
        if (e.target.closest('a')) setOpen(false);
    });
})();
