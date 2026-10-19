setTimeout(function () {
  fadeOutPreloader(document.getElementById('preloader'), 50);
}, 700);

$(document).ready(function () {
  initDeck();
  initWorld();
  initContactEmailCopy();
  initContactForm();
  initProjectFilters();
});

/* GA4 event helper (no-op when analytics is blocked or Do Not Track is on) */

function track(name, params) {
  if (typeof gtag === 'function') {
    gtag('event', name, params || {});
  }
}

/* Preloader */

function fadeOutPreloader(element, duration) {
  var opacity = 1;

  var interval = setInterval(function () {
    if (opacity <= 0) {
      element.style.zIndex = 0;
      element.style.opacity = 0;
      document.documentElement.style.overflowY = 'auto';
      document.getElementById('preloader').remove();
      clearInterval(interval);
    } else {
      opacity -= 0.1;
      element.style.opacity = opacity;
    }
  }, duration);
}

/* Swipe deck */

function initDeck() {
  var deck = document.getElementById('deck');
  if (!deck) return;

  var wrap = deck.parentNode;
  var cards = [].slice.call(deck.querySelectorAll('.deck-card'));
  var dataCount = cards.length - 1;
  var progress = document.getElementById('deck-progress');
  var skipBtn = document.getElementById('deck-skip');
  var likeBtn = document.getElementById('deck-like');
  var replayBtn = document.getElementById('deck-replay');
  var reduceMotion = false;
  var index = 0;
  var liked = 0;
  var interacted = false;
  var drag = null;

  var dots = [];
  for (var i = 0; i < dataCount; i++) {
    var dot = document.createElement('span');
    progress.appendChild(dot);
    dots.push(dot);
  }

  function render() {
    cards.forEach(function (card, i) {
      var pos = i - index;
      card.classList.remove('pos-0', 'pos-1', 'pos-2', 'pos-hidden');
      if (pos < 0) return;
      card.classList.add(pos < 3 ? 'pos-' + pos : 'pos-hidden');
    });

    var finished = index >= dataCount;
    wrap.classList.toggle('deck-finished', finished);
    dots.forEach(function (d, i) {
      d.classList.toggle('done', i < index);
      d.classList.toggle('current', i === index);
    });
    progress.setAttribute('data-label', finished ? liked + ' impressed' : (index + 1) + ' of ' + dataCount);
  }

  function sparkle(card) {
    if (reduceMotion) return;
    var rect = card.getBoundingClientRect();
    var host = wrap.getBoundingClientRect();
    var sc = deckScale();
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('i');
      s.className = 'spark';
      s.style.left = ((rect.left - host.left + rect.width / 2) / sc) + 'px';
      s.style.top = ((rect.top - host.top + rect.height / 2) / sc) + 'px';
      s.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
      s.style.setProperty('--dy', (Math.random() * 240 - 160) + 'px');
      wrap.appendChild(s);
      setTimeout(function (el) { el.remove(); }.bind(null, s), 800);
    }
  }

  function commit(dir) {
    if (index >= dataCount) return;
    var card = cards[index];
    interacted = true;
    deck.classList.remove('nudge');
    deck.removeAttribute('data-hint');

    card.style.transform = '';
    card.classList.remove('dragging');
    card.classList.add(dir === 'right' ? 'gone-right' : 'gone-left');

    if (dir === 'right') {
      liked++;
      sparkle(card);
    }
    track(dir === 'right' ? 'swipe_right' : 'swipe_left', { card: card.getAttribute('data-title') });

    index++;
    render();

    if (index >= dataCount) {
      track('deck_complete', { impressed: liked });
    } else {
      track('card_view', { card: cards[index].getAttribute('data-title'), position: index + 1 });
    }
  }

  function currentCard() {
    return index < dataCount ? cards[index] : null;
  }

  /* The deck lives inside a scaled canvas, so screen pixels must be converted to local pixels. */
  function deckScale() {
    return deck.getBoundingClientRect().width / deck.offsetWidth || 1;
  }

  deck.addEventListener('pointerdown', function (e) {
    var card = currentCard();
    if (!card || !card.contains(e.target) || e.target.closest('a, button')) return;
    drag = { x: e.clientX, t: Date.now(), dx: 0, id: e.pointerId, sc: deckScale() };
    card.classList.add('dragging');
    card.setPointerCapture(e.pointerId);
  });

  deck.addEventListener('pointermove', function (e) {
    var card = currentCard();
    if (!drag || !card || e.pointerId !== drag.id) return;
    drag.dx = (e.clientX - drag.x) / drag.sc;
    card.style.transform = 'translateX(' + drag.dx + 'px) rotate(' + (drag.dx / 18) + 'deg)';
    deck.setAttribute('data-hint', drag.dx > 24 ? 'like' : drag.dx < -24 ? 'skip' : '');
  });

  function endDrag(e) {
    var card = currentCard();
    if (!drag || !card || e.pointerId !== drag.id) return;
    var dx = drag.dx;
    var velocity = Math.abs(dx) / Math.max(Date.now() - drag.t, 1);
    drag = null;
    deck.removeAttribute('data-hint');

    if (Math.abs(dx) > 90 || (velocity > 0.5 && Math.abs(dx) > 30)) {
      commit(dx > 0 ? 'right' : 'left');
    } else {
      card.classList.remove('dragging');
      card.style.transform = '';
    }
  }

  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);

  skipBtn.addEventListener('click', function () { commit('left'); });
  likeBtn.addEventListener('click', function () { commit('right'); });

  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input, textarea')) return;
    var view = document.documentElement.getAttribute('data-view');
    if (view && view !== 'overview' && view !== 'home') return;
    var rect = deck.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return;
    if (e.key === 'ArrowRight') commit('right');
    if (e.key === 'ArrowLeft') commit('left');
  });

  replayBtn.addEventListener('click', function () {
    index = 0;
    liked = 0;
    cards.forEach(function (c) { c.classList.remove('gone-left', 'gone-right'); });
    render();
    track('deck_replay');
  });

  render();
  track('card_view', { card: cards[0].getAttribute('data-title'), position: 1 });

  if (!reduceMotion) {
    setTimeout(function () {
      if (!interacted) deck.classList.add('nudge');
    }, 1800);
  }
}

/* World: a Prezi-style zoomable canvas.
   Every section is a frame placed at its own (x, y) and scale inside one world. The camera is a single
   translate3d + scale transform on that world. Clicking a card flies the camera to it; clicking empty
   space (or Overview) flies back out.

   Smoothness rules:
   - nothing inside the world changes while the camera moves, so the browser only has to move one
     GPU layer (no repaints mid-flight);
   - a frame's content fades in only after the camera has landed;
   - flights follow van Wijk's smooth zoom path with a gentle ease-in-out. */

var WORLD = {
  panMs: 1100,       // pan across the canvas to the target (at the current zoom)
  zoomMs: 1300,      // then zoom in on it
  zoomOutMs: 1000,   // zooming out: pull back first...
  returnPanMs: 950,  // ...then pan back
  padTop: 54,        // room for the navbar
  padBottom: 14,     // the HUD sits in the corner, so almost no room is reserved
  padX: 0.03,        // fraction of the width left empty on each side
  maxContentZoom: 1.3,
  samples: 36        // keyframes sampled per stage
};

function initWorld() {
  var viewer = document.getElementById('viewer');
  if (!viewer) return;

  var root = document.documentElement;
  var world = document.getElementById('world');
  var hudLabel = document.getElementById('hud-label');
  var hudPrev = document.getElementById('hud-prev');
  var hudNext = document.getElementById('hud-next');
  var hudOverview = document.getElementById('hud-overview');
  var hudTour = document.getElementById('hud-tour');

  var frames = [].slice.call(world.querySelectorAll('.frame')).map(function (el) {
    return {
      el: el,
      slug: el.getAttribute('data-slug'),
      cx: parseFloat(el.getAttribute('data-cx')),
      cy: parseFloat(el.getAttribute('data-cy')),
      k: parseFloat(el.getAttribute('data-k')),
      w: parseFloat(el.getAttribute('data-w')),
      h: parseFloat(el.getAttribute('data-h')),
      d: parseFloat(el.getAttribute('data-d') || '0'),
      peek: parseFloat(el.getAttribute('data-peek') || '0'),
      side: parseFloat(el.getAttribute('data-side') || '0'),
      cx0: parseFloat(el.getAttribute('data-cx')),
      content: el.querySelector('.frame-content'),
      title: (el.querySelector('.title') || {}).textContent || el.getAttribute('data-slug')
    };
  });
  var bySlug = {};
  frames.forEach(function (f) { bySlug[f.slug] = f; });
  var order = frames.filter(function (f) { return f.slug !== 'home'; }).map(function (f) { return f.slug; });

  var phone = window.matchMedia('(max-width: 48em)');
  var view = 'overview';
  var pushed = false;
  var touring = false;
  var timers = [];
  var wheelSum = 0;
  var wheelTimer = null;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function css(c) { return 'translate3d(' + c.x + 'px, ' + c.y + 'px, 0) scale(' + c.s + ')'; }

  /* ---------- geometry ---------- */

  function area() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var availH = vh - WORLD.padTop - WORLD.padBottom;
    return { vw: vw, availW: vw * (1 - 2 * WORLD.padX), availH: availH, midY: WORLD.padTop + availH / 2 };
  }

  function camFor(cx, cy, w, h, maxScale) {
    var a = area();
    var s = Math.min(a.availW / w, a.availH / h);
    if (maxScale) { s = Math.min(s, maxScale); }
    return { s: s, x: a.vw / 2 - cx * s, y: a.midY - cy * s };
  }

  function focusCam(f) {
    return camFor(f.cx, f.cy, f.w * f.k, f.h * f.k, WORLD.maxContentZoom / f.k);
  }

  /* What you actually see before zooming in is a circle of diameter d * k. */
  function radius(f) { return f.d * f.k / 2; }

  /* The overview frames every circle, plus the top sliver ("peek") of the one rising from below. */
  function overviewCam() {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    frames.forEach(function (f) {
      var r = radius(f);
      var bottom = f.peek ? f.cy - r + f.peek : f.cy + r;
      minX = Math.min(minX, f.cx - r);
      maxX = Math.max(maxX, f.cx + r);
      minY = Math.min(minY, f.cy - r);
      maxY = Math.max(maxY, bottom);
    });
    return camFor((minX + maxX) / 2, (minY + maxY) / 2, maxX - minX, maxY - minY);
  }

  function targetCam(slug) { return slug === 'overview' ? overviewCam() : focusCam(bySlug[slug]); }

  function currentCam() {
    var m = new DOMMatrixReadOnly(getComputedStyle(world).transform);
    return { s: m.a, x: m.e, y: m.f };
  }

  /* ---------- the flight: pan, then zoom (Prezi's camera) ----------
     zooming in   -> pan across to the target at the current zoom, then zoom in
     zooming out  -> zoom out in place, then pan back
     section to section (both zoomed in) -> pull back, pan across, then zoom in
     Each stage is eased on its own and sampled into keyframes, so the whole world moves as one GPU layer. */

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeZoom(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

  /* the world point under the middle of the screen, and a camera that puts a world point there */
  function centreOf(c) { var a = area(); return { x: (a.vw / 2 - c.x) / c.s, y: (a.midY - c.y) / c.s }; }
  function camAt(u, s) { var a = area(); return { s: s, x: a.vw / 2 - u.x * s, y: a.midY - u.y * s }; }

  function stagesFor(from, to) {
    var ov = overviewCam().s;
    var uFrom = centreOf(from), uTo = centreOf(to);
    var zoomedIn = function (c) { return c.s > ov * 1.6; };

    if (zoomedIn(from) && zoomedIn(to)) {
      var sMid = ov * 1.1;
      return [
        { kind: 'zoom', u: uFrom, s0: from.s, s1: sMid, ms: WORLD.zoomOutMs * 0.8, ease: easeZoom },
        { kind: 'pan', s: sMid, u0: uFrom, u1: uTo, ms: WORLD.panMs * 1.2, ease: ease },
        { kind: 'zoom', u: uTo, s0: sMid, s1: to.s, ms: WORLD.zoomMs, ease: easeZoom }
      ];
    }
    if (to.s > from.s * 1.05) {
      return [
        { kind: 'pan', s: from.s, u0: uFrom, u1: uTo, ms: WORLD.panMs, ease: ease },
        { kind: 'zoom', u: uTo, s0: from.s, s1: to.s, ms: WORLD.zoomMs, ease: easeZoom }
      ];
    }
    if (to.s < from.s * 0.95) {
      return [
        { kind: 'zoom', u: uFrom, s0: from.s, s1: to.s, ms: WORLD.zoomOutMs, ease: easeZoom },
        { kind: 'pan', s: to.s, u0: uFrom, u1: uTo, ms: WORLD.returnPanMs, ease: ease }
      ];
    }
    return [{ kind: 'pan', s: to.s, u0: uFrom, u1: uTo, ms: WORLD.panMs, ease: ease }];
  }

  function stopFlight() { world.getAnimations().forEach(function (an) { an.cancel(); }); }

  /* Commits the end state, then animates there from wherever the camera is right now. Returns the duration. */
  function fly(to) {
    var from = currentCam();
    stopFlight();
    world.style.transform = css(to);

    var stages = stagesFor(from, to);
    var total = stages.reduce(function (sum, st) { return sum + st.ms; }, 0);
    var frames = [], elapsed = 0;

    stages.forEach(function (st, si) {
      var n = WORLD.samples;
      for (var i = (si === 0 ? 0 : 1); i <= n; i++) {
        var t = i / n, e = st.ease(t), cam;
        if (st.kind === 'pan') {
          cam = camAt({ x: st.u0.x + (st.u1.x - st.u0.x) * e, y: st.u0.y + (st.u1.y - st.u0.y) * e }, st.s);
        } else {
          cam = camAt(st.u, st.s0 * Math.pow(st.s1 / st.s0, e));
        }
        frames.push({ transform: css(cam), offset: (elapsed + st.ms * t) / total });
      }
      elapsed += st.ms;
    });
    frames[frames.length - 1].offset = 1;

    world.animate(frames, { duration: total, easing: 'linear' });
    return total;
  }

  /* The overview is limited by height, so on a wide screen the sides would sit empty.
     Slide the left and right columns outward to fill the extra width (and let the connectors stretch). */
  var MAX_SPREAD = 330;

  function spread() {
    frames.forEach(function (f) { f.cx = f.cx0; });
    var a = area();
    var cam = overviewCam();                       // fit at the authored spacing; its scale is height-limited
    var needed = a.availW / cam.s;                  // world width that would exactly fill the screen at that scale
    var minX = Infinity, maxX = -Infinity;
    frames.forEach(function (f) {
      var r = radius(f);
      minX = Math.min(minX, f.cx - r);
      maxX = Math.max(maxX, f.cx + r);
    });
    var dx = Math.max(0, Math.min(MAX_SPREAD, (needed - (maxX - minX)) / 2));
    frames.forEach(function (f) { if (f.side) { f.cx = f.cx0 + f.side * dx; } });
    frames.forEach(place);
    drawLinks();
  }

  function place(f) {
    f.el.style.width = f.w + 'px';
    f.el.style.height = f.h + 'px';
    f.el.style.transform = 'translate3d(' + (f.cx - f.w / 2) + 'px, ' + (f.cy - f.h / 2) + 'px, 0) scale(' + f.k + ')';
  }

  /* Fine curved lines join the hub to every circle, plus a few between neighbours. */
  var LINKS = [
    ['home', 'experience', 'spoke'], ['home', 'projects', 'spoke'], ['home', 'skills', 'spoke'],
    ['home', 'certifications', 'spoke'], ['home', 'education', 'spoke'], ['education', 'contact', 'spoke'],
    ['experience', 'projects', 'minor'], ['skills', 'certifications', 'minor'],
    ['projects', 'education', 'minor'], ['certifications', 'education', 'minor']
  ];

  function drawLinks() {
    var svg = document.getElementById('world-links');
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '';
    LINKS.forEach(function (pair, i) {
      var a = bySlug[pair[0]], b = bySlug[pair[1]];
      var dx = b.cx - a.cx, dy = b.cy - a.cy, len = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      var p0 = { x: a.cx + ux * radius(a), y: a.cy + uy * radius(a) };
      var p1 = { x: b.cx - ux * radius(b), y: b.cy - uy * radius(b) };
      var span = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
      var bend = span * 0.16 * (i % 2 ? 1 : -1);
      var d = 'M' + p0.x + ',' + p0.y +
        ' C' + (p0.x + ux * span * 0.35 + nx * bend) + ',' + (p0.y + uy * span * 0.35 + ny * bend) +
        ' ' + (p1.x - ux * span * 0.35 + nx * bend) + ',' + (p1.y - uy * span * 0.35 + ny * bend) +
        ' ' + p1.x + ',' + p1.y;
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'link link--' + pair[2]);
      svg.appendChild(path);
      if (pair[2] === 'spoke') {
        [p0, p1].forEach(function (p) {
          var dot = document.createElementNS(NS, 'circle');
          dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y); dot.setAttribute('r', 7);
          dot.setAttribute('class', 'link-dot');
          svg.appendChild(dot);
        });
      }
    });
  }

  /* ---------- state ---------- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function updateHud(slug) {
    var i = order.indexOf(slug);
    if (slug === 'overview') { hudLabel.textContent = 'Click a circle to zoom in'; }
    else if (slug === 'home') { hudLabel.textContent = 'Home'; }
    else { hudLabel.textContent = pad(i + 1) + ' / ' + pad(order.length) + '  ' + bySlug[slug].title; }
    var overview = slug === 'overview';
    hudLabel.hidden = overview;
    hudPrev.hidden = overview;
    hudOverview.hidden = overview;
    hudNext.disabled = i === order.length - 1;
  }

  function land(f) {
    viewer.classList.remove('is-flying');
    if (!f) return;
    f.el.classList.add('is-focus');
    if (f.content) {
      f.content.scrollTop = 0;
      f.content.focus({ preventScroll: true });
    }
  }

  function goTo(slug, how) {
    if (slug !== 'overview' && !bySlug[slug]) return;
    clearTimers();
    track('hub_open', { section: slug, via: how || 'frame' });

    /* Leaving a frame is instant (no fades), so nothing repaints while the camera moves */
    frames.forEach(function (f) { f.el.classList.remove('is-focus'); });
    view = slug;
    root.setAttribute('data-view', slug);
    updateHud(slug);

    viewer.classList.add('is-flying');
    var ms = fly(targetCam(slug));
    var f = slug === 'overview' ? null : bySlug[slug];
    if (ms === 0) { land(f); } else { later(function () { land(f); }, ms); }
  }

  /* Phones have no canvas: frames are stacked and open like an accordion. */
  function phoneGoTo(slug) {
    root.setAttribute('data-view', slug);
    frames.forEach(function (f) { f.el.classList.toggle('is-open', f.slug === slug); });
    if (slug !== 'overview') {
      bySlug[slug].el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    track('hub_open', { section: slug, via: 'phone' });
  }

  function show(slug, how) { phone.matches ? phoneGoTo(slug) : goTo(slug, how); }

  function openFromUser(slug, how) {
    if (slug === 'overview') { close(); return; }
    if (location.hash !== '#' + slug) {
      history.pushState(null, '', '#' + slug);
      pushed = true;
    }
    show(slug, how);
  }

  function close() {
    touring = false;
    if (pushed) {
      pushed = false;
      history.back();
    } else {
      if (location.hash) { history.replaceState(null, '', location.pathname + location.search); }
      show('overview', 'close');
    }
  }

  function step(delta) {
    var i = order.indexOf(view) + delta;
    if (view === 'overview' || view === 'home') { i = delta > 0 ? 0 : -1; }
    if (i < 0) { close(); return; }
    if (i >= order.length) return;
    history.replaceState(null, '', '#' + order[i]);
    show(order[i], touring ? 'tour' : 'arrows');
    if (touring && i === order.length - 1) {
      track('tour_complete');
      touring = false;
    }
  }

  function startTour() {
    touring = true;
    track('tour_start');
    openFromUser(order[0], 'tour');
  }

  function syncFromHash() {
    var slug = location.hash.slice(1);
    if (bySlug[slug] && slug !== 'home') {
      if (view !== slug) show(slug, 'link');
    } else if (view !== 'overview') {
      show('overview', 'link');
    }
  }

  /* ---------- layout / mode ---------- */

  function snap() {
    stopFlight();
    viewer.classList.remove('is-flying');
    world.style.transform = css(targetCam(view));
    frames.forEach(function (f) {
      var on = f.slug === view;
      f.el.classList.toggle('is-focus', on);
      if (on && f.content) { f.content.scrollTop = 0; }
    });
  }

  function applyMode() {
    var canvas = !phone.matches;
    root.classList.toggle('is-world', canvas);
    if (canvas) {
      spread();
      snap();
    } else {
      stopFlight();
      world.style.transform = '';
      frames.forEach(function (f) {
        f.el.style.transform = '';
        f.el.style.width = '';
        f.el.style.height = '';
        f.el.classList.remove('is-focus');
      });
    }
  }

  /* ---------- events ---------- */

  viewer.addEventListener('click', function (e) {
    if (phone.matches || e.target.closest('.hud')) return;
    var frameEl = e.target.closest('.frame');
    if (!frameEl) {
      if (view !== 'overview') close();            // empty space zooms back out
      return;
    }
    var slug = frameEl.getAttribute('data-slug');
    /* The hub is always readable, so it never zooms. While zoomed into a section, its background counts as empty space. */
    if (slug === 'home') {
      if (view !== 'overview' && !e.target.closest('a, button, input, textarea, label')) close();
      return;
    }
    if (view === slug) return;                       // already here: let the content work normally
    if (e.target.closest('a, button, input, textarea, label') && view !== 'overview') return;
    if (e.target.closest('a, input, textarea, label')) return;
    openFromUser(slug, 'frame');
  });

  frames.forEach(function (f) {
    var cover = f.el.querySelector('[data-cover]');
    if (!cover) return;
    cover.addEventListener('click', function (e) {
      e.stopPropagation();
      if (phone.matches && f.el.classList.contains('is-open')) { close(); return; }
      openFromUser(f.slug, 'cover');
    });
  });

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (link) {
      var target = link.getAttribute('href').slice(1);
      if (bySlug[target] && target !== 'home') {
        e.preventDefault();
        e.stopPropagation();
        openFromUser(target, 'link');
        return;
      }
    }
    var open = e.target.closest('[data-open]');
    if (open) { e.stopPropagation(); openFromUser(open.getAttribute('data-open'), 'inline'); return; }
    if (e.target.closest('[data-tour]')) { startTour(); }
  });

  hudOverview.addEventListener('click', close);
  hudPrev.addEventListener('click', function () { step(-1); });
  hudNext.addEventListener('click', function () { step(1); });
  hudTour.addEventListener('click', startTour);

  document.addEventListener('keydown', function (e) {
    if (phone.matches || e.target.closest('input, textarea')) return;
    if (e.key === 'Escape' && view !== 'overview') { close(); return; }
    if (view === 'overview' && (e.key === 'ArrowDown' || e.key === 'PageDown')) { e.preventDefault(); openFromUser('contact', 'keys'); return; }
    if (view === 'contact' && (e.key === 'ArrowUp' || e.key === 'PageUp')) { e.preventDefault(); close(); return; }
    if (view === 'overview' || view === 'home') return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  /* Scrolling down from the overview flies to Contact, which sits below everything */
  viewer.addEventListener('wheel', function (e) {
    if (phone.matches || viewer.classList.contains('is-flying')) return;
    if (view !== 'overview' && view !== 'contact') return;
    if (view === 'contact' && e.target.closest('.frame-content') && bySlug.contact.content.scrollTop > 0) return;
    wheelSum += e.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { wheelSum = 0; }, 250);
    if (view === 'overview' && wheelSum > 60) { wheelSum = 0; openFromUser('contact', 'scroll'); }
    else if (view === 'contact' && wheelSum < -60) { wheelSum = 0; close(); }
  }, { passive: true });

  window.addEventListener('hashchange', syncFromHash);
  window.addEventListener('resize', function () { if (!phone.matches) { spread(); snap(); } });
  phone.addEventListener('change', applyMode);

  var initial = location.hash.slice(1);
  if (bySlug[initial] && initial !== 'home') { view = initial; }
  root.setAttribute('data-view', view);
  updateHud(view);
  applyMode();
  if (phone.matches && view !== 'overview') { phoneGoTo(view); }
}

/* Contact form: posts to Formspree when a real form ID is configured; until then it opens the visitor's
   email app with the message pre-filled, so a message is never silently lost. */

function initContactForm() {
  var form = document.querySelector('.contact-form');
  if (!form || form.getAttribute('action').indexOf('REPLACE_WITH_YOUR_FORM_ID') === -1) return;

  var email = document.querySelector('.contact-email-copy');
  var to = email ? email.getAttribute('data-email') : '';
  if (!to) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name.value;
    var from = form.elements._replyto.value;
    var message = form.elements.message.value;
    var subject = 'Portfolio message from ' + name;
    var body = message + '\n\n' + name + '\n' + from;
    var a = document.createElement('a');
    a.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    track('contact_click', { label: 'form_mailto_fallback' });
  });
}

/* Contact Email Copy Fallback */

function initContactEmailCopy() {
  var btn = document.querySelector('.contact-email-copy');
  if (!btn) return;

  btn.addEventListener('click', function () {
    var email = btn.getAttribute('data-email');
    if (!email) return;

    var copied = function () {
      btn.classList.add('copied');
      track('contact_click', { label: 'copy_email' });
      setTimeout(function () {
        btn.classList.remove('copied');
      }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(copied);
    } else {
      var textarea = document.createElement('textarea');
      textarea.value = email;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      copied();
    }
  });
}

/* Project Filters */

function initProjectFilters() {
  var filterBtns = document.querySelectorAll('.filter-btn');
  var projectRows = document.querySelectorAll('.file-row');

  if (!filterBtns.length || !projectRows.length) return;

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var filter = btn.getAttribute('data-filter');

      projectRows.forEach(function (row) {
        var category = row.getAttribute('data-category');
        var show = filter === 'all' || category === filter || (filter === 'demo' && row.getAttribute('data-demo') === 'true');
        row.classList.toggle('hidden', !show);
      });
    });
  });
}
