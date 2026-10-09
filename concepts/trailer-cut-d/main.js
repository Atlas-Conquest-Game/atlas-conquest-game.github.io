/* Atlas Conquest — homepage, Layout D ("Focused")
   Plain JS, no dependencies.
   Motion budget: the hero loop is the only autoplaying video. Section clips play
   only on hover (mouse) or tap / Enter (their button), one at a time. The finale
   coverflow makes one pass through the cards and stops. Reduced motion: stills only. */

/* =========================================================================
   CONFIG — every outbound link lives here. Change a value, reload, done.
   ========================================================================= */
const CONFIG = {
  primaryCta: 'steam',       // 'steam' = Wishlist on Steam leads everywhere. 'discord' flips the roles (Join the Beta leads).
  steam: '',                 // Steam store URL. Empty = Steam buttons stay in place; a click shows a short "coming soon" note.
                             // Once set, every Steam link gets ?utm_source=atlas-website&utm_medium=<nav|hero|finale>
                             // (from its data-placement) so Steam's UTM report can attribute wishlists to the site.
  discord: 'https://discord.gg/7QaEY4yJH5',
  youtubeTrailerId: '',      // YouTube video id. Empty = play the local trailer.mp4 in the modal.
  x: 'https://x.com/Atlas_Conquest',
  instagram: 'https://www.instagram.com/atlasconquest/',
  tiktok: 'https://www.tiktok.com/@atlas.conquest',
  press: '../../press.html',
};

(() => {
  'use strict';

  const TRAILER_SRC = '../../assets/media/video/trailer.mp4';
  const TRAILER_POSTER = '../../assets/media/stills/t62_5.webp';
  const METADATA_URL = '../../data/metadata.json';
  const CHANGELOG_URL = '../../data/insights/card_changelog.json';
  const DISCORD_CACHE_KEY = 'ac:discord-counts';
  const DISCORD_CACHE_MS = 10 * 60 * 1000;

  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const safePlay = (v) => { try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* ignore */ } };
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  let modalOpen = false;
  let clipPlaying = false;   // a section clip is playing: the hero loop waits (one video at a time)
  let heroCtl = null;
  let clipsCtl = null;
  let flowCtl = null;

  root.classList.add('js');

  /* ---------------- Links + which call to action leads ----------------
     Steam is the primary CTA by default. With a store URL, each Steam link is tagged with
     its placement (utm_source=atlas-website, utm_medium=nav|hero|finale). Without one yet,
     the buttons stay put and a click shows a short polite note beside the button. */
  const SOON_MSG = 'Steam page coming soon. Join the beta on Discord meanwhile.';

  function tagged(url, placement) {
    try {
      const u = new URL(url, location.href);
      u.searchParams.set('utm_source', 'atlas-website');
      if (placement) u.searchParams.set('utm_medium', placement);
      return u.toString();
    } catch (_) { return url; }
  }

  // One shared live region, placed next to whichever Steam button was clicked.
  let soon = null;
  function soonNote() {
    if (soon) return soon;
    const el = document.createElement('p');
    el.className = 'soon-note';
    el.setAttribute('role', 'status'); // polite: announced without stealing focus
    document.body.appendChild(el);
    let anchor = null; let timer = 0; let raf = 0;
    const place = () => {
      raf = 0;
      if (!anchor || !el.classList.contains('is-shown')) return;
      let r = anchor.getBoundingClientRect();
      if (!r.width) r = { left: innerWidth / 2, width: 0, top: 0, bottom: $('[data-nav]').getBoundingClientRect().bottom };
      const w = el.offsetWidth; const h = el.offsetHeight;
      const x = clamp(r.left + r.width / 2 - w / 2, 12, innerWidth - w - 12);
      // Above the button by default, so it never covers the Discord link beside or below it;
      // below when there is no room (the nav button).
      const navBottom = $('[data-nav]').getBoundingClientRect().bottom;
      let y = r.top - h - 10;
      if (y < navBottom + 8) y = r.bottom + 10;
      el.style.left = Math.round(x) + 'px';
      el.style.top = Math.round(y) + 'px';
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(place); };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    const hide = () => { el.classList.remove('is-shown'); el.textContent = ''; anchor = null; };
    soon = {
      show(a) {
        clearTimeout(timer);
        anchor = a;
        el.textContent = '';
        requestAnimationFrame(() => {
          el.textContent = SOON_MSG;
          el.classList.add('is-shown');
          place();
        });
        timer = setTimeout(hide, 4200);
      },
    };
    return soon;
  }

  function applyLinks() {
    root.classList.toggle('primary-discord', CONFIG.primaryCta === 'discord');
    $$('[data-link]').forEach((a) => {
      const key = a.dataset.link;
      const url = CONFIG[key];
      if (key === 'steam') {
        if (url) { a.href = tagged(url, a.dataset.placement); return; }
        a.href = '#';
        a.removeAttribute('target');
        a.removeAttribute('rel');
        soonNote(); // create the live region up front, so its first message is announced
        a.addEventListener('click', (e) => { e.preventDefault(); soonNote().show(a); });
        return;
      }
      if (url) a.href = url;
      else (a.closest('li') || a).hidden = true;
    });
  }

  /* ---------------- Nav ---------------- */
  function setupNav() {
    const nav = $('[data-nav]');
    const burger = $('.nav__burger');
    const menu = $('#nav-menu');
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    menu.addEventListener('click', (e) => { if (e.target.closest('a, button')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); burger.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
    });
    matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------------- Smooth in-page anchors ---------------- */
  function setupAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        const target = id && document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: reduced ? 'auto' : 'smooth' });
        if (id === 'main') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
      });
    });
  }

  /* ---------------- Hero video (unchanged from Layout A) ----------------
     Phones in portrait get a purpose-cut 9:16 edit that follows the action;
     everything else gets the smallest landscape encode that still looks sharp under the scrim. */
  function setupHero() {
    const v = $('[data-hero-video]');
    const btn = $('[data-hero-pause]');
    const label = $('[data-hero-pause-label]');
    if (!v) return;
    const d = v.dataset;
    const w = innerWidth;
    const portrait = innerHeight > w && w <= 640;
    v.poster = portrait ? d.heroPosterPortrait : d.heroPoster;
    if (reduced) { root.classList.add('no-hero-video'); return; } // poster only
    const conn = navigator.connection;
    const lean = conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''));
    v.src = portrait ? d.srcPortrait : (w <= 1024 || lean) ? d.srcMd : w <= 1600 ? d.srcLg : d.srcXl;
    v.preload = 'metadata';
    v.muted = true;
    let userPaused = false;
    let inView = true;
    const hero = v.closest('.hero');
    const update = () => {
      if (!userPaused && inView && !modalOpen && !clipPlaying && !document.hidden) safePlay(v);
      else v.pause();
    };
    // The pause button stills everything decorative in the hero, not just the video
    // (embers, the scroll cue, the "rec" blink): WCAG 2.2.2 pause/stop/hide.
    btn.addEventListener('click', () => {
      userPaused = !userPaused;
      btn.setAttribute('aria-pressed', String(userPaused));
      label.textContent = userPaused ? 'Play background motion' : 'Pause background motion';
      hero.classList.toggle('is-still', userPaused);
      update();
    });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(); }, { threshold: 0.02 }).observe(hero);
    document.addEventListener('visibilitychange', update);
    heroCtl = { update };
    update();

    // gentle push-in as the hero scrolls away
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const k = clamp(window.scrollY / window.innerHeight, 0, 1);
        hero.style.setProperty('--hy', k.toFixed(3));
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- Embers (hero only) ---------------- */
  function setupEmbers() {
    if (reduced) return;
    $$('[data-embers]').forEach((box) => {
      const n = +box.dataset.embers || 16;
      const h = box.getBoundingClientRect().height || window.innerHeight;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        const size = 2 + Math.random() * 4;
        s.style.cssText =
          '--x:' + (Math.random() * 100).toFixed(2) + '%;' +
          '--s:' + size.toFixed(1) + 'px;' +
          '--d:' + (10 + Math.random() * 12).toFixed(1) + 's;' +
          '--delay:' + (-Math.random() * 22).toFixed(1) + 's;' +
          '--o:' + (0.3 + Math.random() * 0.6).toFixed(2) + ';' +
          '--dx:' + (Math.random() * 160 - 80).toFixed(0) + 'px;' +
          '--rise:' + (h * (0.55 + Math.random() * 0.5)).toFixed(0) + 'px';
        frag.appendChild(s);
      }
      box.appendChild(frag);
    });
  }

  /* ---------------- Stills for the clip boxes ----------------
     They sit just below the hero, close enough that native lazy-loading would fetch
     them with the first view. Load each one only as it nears the viewport, so the
     first view on a phone stays at the hero (≈2.5 MB, most of it the hero loop). */
  function setupStills() {
    const imgs = $$('img[data-src]');
    const load = (img) => {
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    };
    if (!('IntersectionObserver' in window)) { imgs.forEach(load); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } });
    }, { rootMargin: '0px 0px 15% 0px' });
    imgs.forEach((img) => io.observe(img));
  }

  /* ---------------- Clips on request (How it plays + Three Battlefields) ----------------
     Each [data-clip] box rests on a still <img>. Its <video> is only created the first
     time someone asks for it: mouse hover (after a short intent delay) or the box's
     button (tap, click, Enter/Space). One clip plays at a time across the page; a clip
     stops when its card is left, scrolled away, the tab is hidden or the trailer opens.
     data-mode="once" (the maps) skips the close-in opening of the pull-back: it starts where
     the board is already mostly in frame, runs at 2x (about 2.5s) and settles on the still,
     which is the clip's own last frame. While any clip plays the hero loop waits.
     Reduced motion: nothing here runs. */
  function setupClips() {
    const boxes = $$('[data-clip]');
    if (!boxes.length || reduced) return;
    let current = null;
    const HOVER_DELAY = 140;
    const ONCE_START = 0.44; // fraction of the pull-back to skip (the close-up opening)
    const ONCE_RATE = 2;

    const setClipPlaying = (on) => {
      if (clipPlaying === on) return;
      clipPlaying = on;
      if (heroCtl) heroCtl.update();
    };

    const hostOf = (box) => box.closest('[data-clip-host]') || box;
    const btnOf = (box) => $('[data-clip-btn]', box);

    function videoFor(box) {
      let v = $('video', box);
      if (v) return v;
      v = document.createElement('video');
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      v.disablePictureInPicture = true;
      v.preload = 'auto';
      v.loop = box.dataset.mode !== 'once';
      if (box.dataset.mode === 'once') { v.defaultPlaybackRate = ONCE_RATE; v.playbackRate = ONCE_RATE; }
      v.src = box.dataset.src;
      v.addEventListener('playing', () => { if (box.classList.contains('is-on')) box.classList.add('is-live'); });
      v.addEventListener('ended', () => stop(box));
      v.addEventListener('error', () => stop(box));
      $('.clip__still', box).after(v);
      return v;
    }

    function setPressed(box, on) {
      const b = btnOf(box);
      if (!b) return;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^(Play|Pause)/, on ? 'Pause' : 'Play'));
    }

    function play(box) {
      if (modalOpen) return;
      if (current && current !== box) stop(current, true);
      current = box;
      setClipPlaying(true);
      const v = videoFor(box);
      box.classList.add('is-on');
      hostOf(box).classList.add('is-playing');
      setPressed(box, true);
      if (box.dataset.mode !== 'once') { safePlay(v); return; }
      const go = () => {
        if (current !== box) return;
        try { v.currentTime = (v.duration || 0) * ONCE_START; } catch (_) { /* ignore */ }
        v.playbackRate = ONCE_RATE;
        safePlay(v);
      };
      if (v.readyState >= 1) go();
      else v.addEventListener('loadedmetadata', go, { once: true });
    }

    function stop(box, switching) {
      const v = $('video', box);
      box.classList.remove('is-on', 'is-live');
      hostOf(box).classList.remove('is-playing');
      setPressed(box, false);
      if (current === box) current = null;
      if (!switching) setClipPlaying(false);
      if (!v) return;
      if (!v.paused) v.pause();
      // rewind once the clip has faded back to the still, so the next play starts at the top
      if (box.dataset.mode === 'once') return; // the maps seek on every play instead
      setTimeout(() => {
        if (box.classList.contains('is-on')) return;
        try { if (v.currentTime > 0) v.currentTime = 0; } catch (_) { /* ignore */ }
      }, 450);
    }

    const toggle = (box) => (box.classList.contains('is-on') ? stop(box) : play(box));

    boxes.forEach((box) => {
      const host = hostOf(box);
      const btn = btnOf(box);
      if (btn) {
        btn.hidden = false;
        btn.addEventListener('click', () => toggle(box));
      }
      let t = 0;
      host.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(t);
        t = setTimeout(() => play(box), HOVER_DELAY);
      });
      host.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(t);
        if (box.classList.contains('is-on')) stop(box);
      });
    });

    // Scrolled out of view (e.g. a tapped clip on a phone): stop it.
    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => { if (!isIntersecting && target.classList.contains('is-on')) stop(target); });
    }, { threshold: 0 });
    boxes.forEach((b) => io.observe(b));
    document.addEventListener('visibilitychange', () => { if (document.hidden && current) stop(current); });

    clipsCtl = { stopAll() { if (current) stop(current); } };
  }

  /* ---------------- Patron gods: ARIA tabs ----------------
     Roving tabindex; Left/Right move (and select), Home/End jump. Static panels. */
  function setupGods() {
    const list = $('[data-gods-tabs]');
    if (!list) return;
    const tabs = $$('[role="tab"]', list);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const n = tabs.length;

    function select(i, focus) {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        let j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j === null) return;
        e.preventDefault();
        select(j, true);
      });
    });
    const start = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
    select(start, false);
  }

  /* ---------------- Proof of life: one static line of real numbers ----------------
     Playtest matches + playtesters (metadata.json; the markup holds a fallback),
     the live Discord count (hidden when the request fails) and the last balance update
     (newest "changed"/"added" entry in card_changelog.json; renames don't count; hidden
     when missing). No count-ups: numbers are set once. */
  async function getJSON(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  function loadMetadata() {
    getJSON(METADATA_URL, { cache: 'no-cache' }).then((json) => {
      const all = ((json && json.data) || json || {}).all;
      const a = all && all.all;
      if (!a) return;
      if (a.total_matches > 0) $$('[data-matches]').forEach((el) => { el.textContent = fmt(a.total_matches); });
      if (a.total_players > 0) $$('[data-players]').forEach((el) => { el.textContent = fmt(a.total_players); });
    }).catch(() => { /* keep the fallback numbers */ });
  }

  function inviteCode() {
    const m = /discord\.gg\/([\w-]+)/.exec(CONFIG.discord || '');
    return m ? m[1] : '';
  }
  function readDiscordCache(code) {
    try {
      const c = JSON.parse(sessionStorage.getItem(DISCORD_CACHE_KEY) || 'null');
      if (c && c.code === code && Date.now() - c.at < DISCORD_CACHE_MS && Number.isFinite(c.members)) return c;
    } catch (_) { /* ignore */ }
    return null;
  }
  function writeDiscordCache(c) { try { sessionStorage.setItem(DISCORD_CACHE_KEY, JSON.stringify(c)); } catch (_) { /* ignore */ } }

  async function loadDiscord() {
    const item = $('[data-discord]');
    const code = inviteCode();
    if (!item || !code) return;
    let c = readDiscordCache(code);
    if (!c) {
      try {
        const data = await getJSON('https://discord.com/api/v10/invites/' + code + '?with_counts=true', { credentials: 'omit', cache: 'no-store' });
        c = { code, members: Number(data.approximate_member_count), online: Number(data.approximate_presence_count), at: Date.now() };
        if (!Number.isFinite(c.members) || c.members <= 0) throw new Error('no counts');
        writeDiscordCache(c);
      } catch (_) { item.remove(); return; } // offline, rate-limited or blocked: no Discord number
    }
    $('[data-discord-members]', item).textContent = fmt(c.members);
    if (Number.isFinite(c.online) && c.online > 0) {
      $('[data-discord-online]', item).textContent = fmt(c.online);
      $('[data-discord-online-wrap]', item).hidden = false;
    }
    item.hidden = false;
  }

  function loadPatch() {
    const item = $('[data-patch]');
    if (!item) return;
    getJSON(CHANGELOG_URL).then((json) => {
      const dates = ((json && json.entries) || [])
        .filter((e) => e && (e.kind === 'changed' || e.kind === 'added'))
        .map((e) => e.date)
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || ''));
      if (!dates.length) throw new Error('no entries');
      const latest = dates.sort().pop();
      const d = new Date(latest + 'T12:00:00Z');
      const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
      if (d.getUTCFullYear() !== new Date().getUTCFullYear()) opts.year = 'numeric';
      const el = $('[data-patch-date]', item);
      el.textContent = d.toLocaleDateString('en-US', opts);
      el.setAttribute('title', latest);
      item.hidden = false;
    }).catch(() => item.remove()); // missing or empty changelog: omit the item
  }

  function setupProof() {
    // Not needed for the first view: fetch only once #beta is about a screen away.
    const go = () => { loadMetadata(); loadDiscord(); loadPatch(); };
    const sec = $('#beta');
    if (!sec || !('IntersectionObserver' in window)) { addEventListener('load', go, { once: true }); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      go();
    }, { rootMargin: '0px 0px 100% 0px' });
    io.observe(sec);
  }

  /* ---------------- Finale coverflow (the trailer's end slide) ----------------
     Cards sit on a shallow arc: the centre card is largest and frontmost, the rest
     turn away and recede toward both screen edges. Once the row is in view it advances
     one card at a time until every card has been in front once (n - 1 steps, ~18s for
     11 cards), then it stops for good
     (as it does the moment someone clicks, drags or uses the arrow keys). A pause
     button covers the pass. Reduced motion: it never moves on its own. */
  function setupFlow() {
    const flow = $('[data-flow]');
    if (!flow) return;
    const cards = $$('.flow__card', flow);
    const toggle = $('[data-flow-toggle]', flow);
    const n = cards.length;
    const HALF = Math.floor(n / 2);
    // Cards visible either side of the centre. One slot beyond them stays hidden, so the
    // card that wraps from one end of the arc to the other is never seen jumping.
    const SHOWN = clamp(HALF - 1, 2, 5);
    const STEP = (15 * Math.PI) / 180; // arc angle between neighbours
    const INTERVAL = 1800;
    let cur = 0;
    let passLeft = n - 1;              // autoplay steps left: every card reaches the front once
    const lastD = cards.map(() => null);
    flow.classList.add('is-ready');

    const posOf = (i) => { let m = (((i - cur) % n) + n) % n; if (m > HALF) m -= n; return m; };

    function layout(instant) {
      const cw = cards[0].offsetWidth;
      const R = cw * 3.6;   // arc radius
      const P = cw * 7;     // camera distance
      cards.forEach((c, i) => {
        const d = posOf(i);
        const ad = Math.abs(d);
        const sg = Math.sign(d);
        const th = Math.min(ad, SHOWN + 1) * STEP;
        const x = sg * R * Math.sin(th);
        const z = R * (Math.cos(th) - 1) - ad * 0.06 * cw;
        const rot = sg * Math.min(th * 1.18, 1.43);
        const wrapped = lastD[i] !== null && Math.abs(d - lastD[i]) > HALF;
        c.classList.toggle('is-jump', !!instant || wrapped);
        c.style.transform = 'perspective(' + P.toFixed(0) + 'px) translate3d(' + x.toFixed(1) + 'px,0,' + z.toFixed(1) + 'px) rotateY(' + rot.toFixed(4) + 'rad)';
        c.style.zIndex = String(50 - ad);
        c.style.opacity = ad <= SHOWN - 1 ? '1' : ad === SHOWN ? '.7' : '0';
        c.style.setProperty('--lit', Math.max(0.5, 1 - ad * 0.1).toFixed(2));
        c.classList.toggle('is-center', d === 0);
        c.setAttribute('aria-hidden', ad > SHOWN - 1 ? 'true' : 'false');
        lastD[i] = d;
      });
      if (instant) { void flow.offsetWidth; cards.forEach((c) => c.classList.remove('is-jump')); }
    }

    function step(k) { cur = (((cur + k) % n) + n) % n; layout(false); }

    // Multi-card moves (clicking a far card) spin one card at a time, quickly.
    let queue = 0;
    let qTimer = 0;
    function stepBy(k) {
      if (!k) return;
      clearTimeout(qTimer);
      queue = k;
      flow.classList.add('is-fast');
      const run = () => {
        const s = Math.sign(queue);
        step(s);
        queue -= s;
        if (queue) qTimer = setTimeout(run, reduced ? 0 : 170);
        else qTimer = setTimeout(() => flow.classList.remove('is-fast'), 500);
      };
      run();
    }

    // The single autoplay pass: pauses on hover, focus, the toggle, a hidden tab, off-screen or the trailer.
    let hover = false; let focused = false; let userPaused = false; let inView = false; let timer = 0;
    let auto = !reduced;
    const canRun = () => auto && !hover && !focused && !userPaused && inView && !document.hidden && !modalOpen;
    function finish() {
      auto = false;
      clearTimeout(timer);
      if (toggle.hidden) return;
      if (document.activeElement === toggle) flow.focus({ preventScroll: true });
      toggle.hidden = true;
    }
    const schedule = () => {
      clearTimeout(timer);
      if (!auto) return;
      timer = setTimeout(() => {
        if (canRun()) { step(1); passLeft -= 1; if (passLeft <= 0) { finish(); return; } }
        schedule();
      }, INTERVAL);
    };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0.25 }).observe(flow);
    flow.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
    flow.addEventListener('pointerleave', () => { hover = false; });
    flow.addEventListener('focusin', () => { focused = true; });
    flow.addEventListener('focusout', (e) => { if (!flow.contains(e.relatedTarget)) focused = false; });

    if (auto) {
      toggle.hidden = false;
      toggle.addEventListener('click', () => {
        userPaused = !userPaused;
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.setAttribute('aria-label', userPaused ? 'Play cards' : 'Pause cards');
      });
    }

    // Swipe / drag (touch keeps vertical page scrolling), click a card to bring it forward, arrow keys.
    // Any of these hands control to the visitor: the autoplay pass ends.
    const takeOver = (k) => { finish(); stepBy(k); };
    let sx = null; let moved = false;
    flow.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      sx = e.clientX; moved = false;
    });
    flow.addEventListener('pointermove', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 10) moved = true; });
    flow.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 36) takeOver(dx < 0 ? 1 : -1);
    });
    flow.addEventListener('pointercancel', () => { sx = null; });
    cards.forEach((c, i) => c.addEventListener('click', () => {
      if (moved) return;
      const d = posOf(i);
      if (d) takeOver(d);
    }));
    flow.addEventListener('keydown', (e) => {
      if (e.target.closest('button')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); takeOver(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); takeOver(-1); }
    });

    layout(true);
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => layout(true), 100); });
    schedule();
    flowCtl = { resume: schedule };
  }

  /* ---------------- Trailer modal ---------------- */
  function setupModal() {
    const dlg = $('[data-modal]');
    const frame = $('[data-modal-frame]');
    const closeBtn = $('[data-modal-close]');
    if (!dlg || typeof dlg.showModal !== 'function') {
      // Very old browsers: just open the file.
      $$('[data-trailer]').forEach((b) => b.addEventListener('click', () => {
        window.open(CONFIG.youtubeTrailerId ? 'https://www.youtube.com/watch?v=' + CONFIG.youtubeTrailerId : TRAILER_SRC, '_blank', 'noopener');
      }));
      return;
    }
    let opener = null;

    function open(e) {
      opener = e.currentTarget;
      frame.textContent = '';
      if (CONFIG.youtubeTrailerId) {
        const f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(CONFIG.youtubeTrailerId) + '?autoplay=1&rel=0&modestbranding=1';
        f.title = 'Atlas Conquest trailer';
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.appendChild(f);
      } else {
        const v = document.createElement('video');
        v.controls = true;
        v.playsInline = true;
        v.preload = 'auto';
        v.poster = TRAILER_POSTER;
        v.setAttribute('aria-label', 'Atlas Conquest trailer, with sound');
        v.src = TRAILER_SRC;
        frame.appendChild(v);
      }
      modalOpen = true;
      if (heroCtl) heroCtl.update();
      if (clipsCtl) clipsCtl.stopAll();
      dlg.showModal();
      closeBtn.focus();
      const v = $('video', frame);
      if (v) safePlay(v);
    }
    function teardown() {
      const v = $('video', frame);
      if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
      frame.textContent = '';
      modalOpen = false;
      if (heroCtl) heroCtl.update();
      if (flowCtl) flowCtl.resume();
      if (opener && document.contains(opener)) opener.focus();
    }
    $$('[data-trailer]').forEach((b) => b.addEventListener('click', open));
    closeBtn.addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', teardown);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    // focus trap: wrap Tab at both ends of the dialog
    $('[data-sentinel="start"]', dlg).addEventListener('focus', () => { ($('video, iframe', frame) || closeBtn).focus(); });
    $('[data-sentinel="end"]', dlg).addEventListener('focus', () => closeBtn.focus());
  }

  /* ---------------- Boot ---------------- */
  applyLinks();
  setupNav();
  setupAnchors();
  setupHero();
  setupEmbers();
  setupStills();
  setupClips();
  setupGods();
  setupProof();
  setupFlow();
  setupModal();
})();
