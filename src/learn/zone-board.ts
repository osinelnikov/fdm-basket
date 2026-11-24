import '../styles.css';
import './learn.css';
import './zone-board.css';
import { MESSAGES, type Lang } from '../i18n/index.ts';
import { applyStaticTexts } from '../ui/i18n-dom.ts';
import { startPageLang } from './page-lang.ts';
import {
  BALL_SPOTS, DEMO_SEQUENCE, DEF_POS, OFF_POS, ZONE_RADII, I18N,
  DEFENSE_IDS, OFFENSE_IDS, OVERLAY_IDS, SPOT_IDS, DEF_PLAYER_IDS, OFF_PLAYER_IDS,
  type BallSpot, type DefenseId, type DefenseKey, type DefPlayerId, type OffenseId, type OffPlayerId,
  type OverlayId, type PlayerId, type SpotId
} from './zone-board-data.ts';

// =========================================================================
// 1. STATE & CONSTANTS
// =========================================================================

interface BoardState {
  lang: Lang;
  defense: DefenseId;
  buzz: boolean;
  offense: OffenseId;
  ballSpot: SpotId;
  selectedPlayer: PlayerId;
  overlays: Record<OverlayId, boolean>;
  playing: boolean;
  seqIndex: number;
}

const state: BoardState = {
  lang: 'en',
  defense: '212',
  buzz: false,
  offense: 'overload',
  ballSpot: 'top',
  selectedPlayer: 'D5',
  overlays: {
    zones: true,
    rotations: true,
    lanes: true
  },
  playing: false,
  seqIndex: 0
};

let seqTimer: number | null = null;
// Ball spot shown on the previous render: the landing pulse plays only when the ball actually moves
let lastRenderedBallSpot: SpotId | null = null;

// Scripted animations (WAAPI) are not covered by the CSS reduced-motion rule, so they ask here first
const reducedMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
function motionOK(): boolean {
  return !(reducedMotionQuery && reducedMotionQuery.matches);
}

// Turning reduced motion on mid-session stops every scripted animation already on screen
// (dash drift, pulses, draw-ins, text fades, ball lift); CSS transitions and animations follow the media query themselves
if (reducedMotionQuery && typeof reducedMotionQuery.addEventListener === 'function') {
  reducedMotionQuery.addEventListener('change', () => {
    if (motionOK() || typeof document.getAnimations !== 'function') return;
    document.getAnimations().forEach(a => {
      if (typeof CSSTransition === 'function' && a instanceof CSSTransition) return;
      if (typeof CSSAnimation === 'function' && a instanceof CSSAnimation) return;
      a.cancel();
    });
  });
}

// CSS transform (not the SVG transform attribute) so every engine runs the transition
function placeAt(el: HTMLElement, x: number, y: number): void {
  el.style.transform = `translate(${x}px, ${y}px)`;
}

// Motion tokens live in :root so CSS and scripted animations share one timing source
function cssValue(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
function cssMs(name: string, fallback: number): number {
  return parseFloat(cssValue(name, '')) || fallback;
}

// True when this render moves the ball to another spot (a pass), as opposed to a language, player or overlay change
function ballMovedSinceLastRender(): boolean {
  return lastRenderedBallSpot !== null && lastRenderedBallSpot !== state.ballSpot;
}

// Arrows are rebuilt only when their geometry changes, so their draw-in does not replay on unrelated clicks
let lastLanesKey: string | null = null;
let lastRotKey: string | null = null;
// Reference cards and matrix text depend only on language; skipping them keeps the demo ticks light
let lastStaticKey: Lang | null = null;

// Single-choice tracks and the buttons whose pressed state the thumb follows
const SEG_THUMBS = [
  { track: 'grp-defense', buttons: '[id^="def-"]' },
  { track: 'grp-offense', buttons: '[id^="off-"]' },
  { track: 'grp-spots', buttons: '.spot-btn' }
];

// Thumb is sized from layout, so it also follows wrapping, language changes and late font loading.
// animate=false is for layout-only updates (resize, font swap): the thumb then snaps instead of sliding.
function updateSegThumbs(animate = true): void {
  SEG_THUMBS.forEach(({ track, buttons }) => {
    const el = document.getElementById(track);
    const thumb = el && el.querySelector<HTMLElement>('.seg-thumb');
    if (!thumb) return;
    const active = Array.from(el.querySelectorAll<HTMLElement>(buttons)).find(b => b.getAttribute('aria-pressed') === 'true');
    // Nothing selected, or no layout yet (e.g. a hidden frame): the selected button keeps its own colour
    if (!active || active.offsetWidth === 0) {
      thumb.style.opacity = '0';
      el.classList.remove('thumb-ready');
      return;
    }
    const width = `${active.offsetWidth}px`;
    const height = `${active.offsetHeight}px`;
    const transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    // Already in place: leave a slide that may still be running untouched
    if (el.classList.contains('thumb-ready') && thumb.style.width === width && thumb.style.height === height && thumb.style.transform === transform) return;
    const instant = !thumb.dataset.placed || !animate;
    if (instant) thumb.style.transition = 'none';
    thumb.style.width = width;
    thumb.style.height = height;
    thumb.style.transform = transform;
    thumb.style.opacity = '1';
    if (instant) {
      void thumb.offsetWidth;
      thumb.style.transition = '';
    }
    thumb.dataset.placed = '1';
    el.classList.add('thumb-ready');
  });
}

// Fade-up for live briefing text; skipped on first fill (it may replace placeholder markup text) and under reduced motion
function setLiveText(id: string, text: string, delay: number): void {
  const el = document.getElementById(id);
  if (!el) return;
  const firstFill = !el.dataset.liveFilled;
  el.dataset.liveFilled = '1';
  if (el.textContent === text) return;
  el.textContent = text;
  if (!firstFill && motionOK() && typeof el.animate === 'function') {
    el.animate(
      [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
      { duration: 260, delay, easing: cssValue('--ease-move', 'ease-out'), fill: 'backwards' }
    );
  }
}

// =========================================================================
// 2. GEOMETRIC COORDINATES (Accurate to Half-Court ViewBox 600x475)
// =========================================================================
// Passing reads per offense & ball spot (from ball spot to target coordinates)
type Segment = [number, number, number, number];

function getPassingArrows(offense: OffenseId, ballSpot: SpotId): Segment[] {
  const o = OFF_POS[offense][ballSpot];
  const ball = BALL_SPOTS.find(s => s.id === ballSpot);
  if (!o || !ball) return [];

  if (offense === 'overload') {
    if (ballSpot === 'top') return [[ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O2[0],o.O2[1]]];
    if (ballSpot === 'r_wing') return [[ball.x,ball.y, o.O3[0],o.O3[1]], [ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O4[0],o.O4[1]]];
    if (ballSpot === 'l_wing') return [[ball.x,ball.y, o.O2[0],o.O2[1]], [ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O4[0],o.O4[1]]];
    if (ballSpot === 'r_corner') return [[ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O1[0],o.O1[1]]];
    if (ballSpot === 'l_corner') return [[ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O1[0],o.O1[1]]];
    if (ballSpot === 'high_post') return [[ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O2[0],o.O2[1]], [ball.x,ball.y, o.O3[0],o.O3[1]]];
    if (ballSpot === 'short_corner') return [[ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O3[0],o.O3[1]], [ball.x,ball.y, o.O2[0],o.O2[1]]];
  }
  if (offense === 'hilo') {
    if (ballSpot === 'top') return [[ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O2[0],o.O2[1]]];
    if (ballSpot === 'r_wing') return [[ball.x,ball.y, o.O4[0],o.O4[1]], [o.O4[0],o.O4[1], o.O5[0],o.O5[1]], [ball.x,ball.y, o.O3[0],o.O3[1]]];
    if (ballSpot === 'l_wing') return [[ball.x,ball.y, o.O4[0],o.O4[1]], [o.O4[0],o.O4[1], o.O5[0],o.O5[1]], [ball.x,ball.y, o.O2[0],o.O2[1]]];
    if (ballSpot === 'r_corner') return [[ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O3[0],o.O3[1]]];
    if (ballSpot === 'l_corner') return [[ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O2[0],o.O2[1]]];
    if (ballSpot === 'high_post') return [[ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O3[0],o.O3[1]], [ball.x,ball.y, o.O2[0],o.O2[1]]];
    if (ballSpot === 'short_corner') return [[ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O3[0],o.O3[1]]];
  }
  // gap
  if (ballSpot === 'top') return [[ball.x,ball.y, o.O2[0],o.O2[1]], [ball.x,ball.y, o.O3[0],o.O3[1]], [ball.x,ball.y, 300,255]];
  if (ballSpot === 'r_wing') return [[ball.x,ball.y, o.O1[0],o.O1[1]], [o.O1[0],o.O1[1], o.O3[0],o.O3[1]], [ball.x,ball.y, o.O4[0],o.O4[1]]];
  if (ballSpot === 'l_wing') return [[ball.x,ball.y, o.O1[0],o.O1[1]], [o.O1[0],o.O1[1], o.O2[0],o.O2[1]], [ball.x,ball.y, o.O5[0],o.O5[1]]];
  if (ballSpot === 'r_corner') return [[ball.x,ball.y, o.O3[0],o.O3[1]], [ball.x,ball.y, o.O4[0],o.O4[1]], [ball.x,ball.y, o.O1[0],o.O1[1]]];
  if (ballSpot === 'l_corner') return [[ball.x,ball.y, o.O2[0],o.O2[1]], [ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O1[0],o.O1[1]]];
  if (ballSpot === 'high_post') return [[ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O2[0],o.O2[1]], [ball.x,ball.y, o.O3[0],o.O3[1]]];
  return [[ball.x,ball.y, o.O5[0],o.O5[1]], [ball.x,ball.y, o.O3[0],o.O3[1]]];
}

// Defensive shift arrows (showing rotation from neutral/top alignment to active alignment)
function getRotationArrows(defKey: DefenseKey, ballSpot: SpotId): Segment[] {
  const base = DEF_POS[defKey].top;
  const cur = DEF_POS[defKey][ballSpot];
  const arrows: Segment[] = [];
  if (ballSpot === 'top') {
    // Show stunts at top
    arrows.push([base.D1[0], base.D1[1], base.D1[0]+18, base.D1[1]+34]);
    arrows.push([base.D2[0], base.D2[1], base.D2[0]-18, base.D2[1]+34]);
    return arrows;
  }
  DEF_PLAYER_IDS.forEach(id => {
    const dx = cur[id][0] - base[id][0];
    const dy = cur[id][1] - base[id][1];
    const dist = Math.hypot(dx, dy);
    if (dist > 20) {
      arrows.push([base[id][0], base[id][1], cur[id][0], cur[id][1]]);
    }
  });
  return arrows;
}

// =========================================================================
// 4. RENDERING & INTERACTION LOGIC
// =========================================================================
// Every ball spot id is listed in BALL_SPOTS, so a valid state always finds its spot
function spotById(id: SpotId): BallSpot {
  const spot = BALL_SPOTS.find(s => s.id === id);
  if (!spot) throw new Error(`Unknown ball spot: ${id}`);
  return spot;
}

function isOffensePlayer(id: PlayerId): id is OffPlayerId {
  return id.startsWith('O');
}

function getDefKey(): DefenseKey {
  return (state.defense === '212' && state.buzz) ? '212_buzz' : state.defense;
}

function setElText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderTokensAndLayers() {
  const defKey = getDefKey();
  const dPos = DEF_POS[defKey][state.ballSpot];
  const oPos = OFF_POS[state.offense][state.ballSpot];
  const ball = spotById(state.ballSpot);
  const t = I18N[state.lang];

  // Pass choreography: the ball travels first, defenders react nearest-first, arrows draw once it lands
  const ballMoved = ballMovedSinceLastRender();
  const firstRender = lastRenderedBallSpot === null;
  const stagger = ballMoved && motionOK();
  const ballMs = cssMs('--dur-ball', 480);
  const easeMove = cssValue('--ease-move', 'ease-out');
  const reactOrder = DEF_PLAYER_IDS
    .filter(id => dPos[id])
    .sort((a, b) => Math.hypot(dPos[a][0] - ball.x, dPos[a][1] - ball.y) - Math.hypot(dPos[b][0] - ball.x, dPos[b][1] - ball.y));
  const defDelay = (id: DefPlayerId) => stagger ? 180 + reactOrder.indexOf(id) * 40 : 0;

  // Buzz volleyball line visibility
  const showBuzzLine = state.defense === '212' && state.buzz;
  const buzzLine = document.getElementById('buzz-line');
  const buzzLbl = document.getElementById('buzz-line-label');
  if (buzzLine) buzzLine.setAttribute('opacity', showBuzzLine ? '0.85' : '0');
  if (buzzLbl) {
    buzzLbl.setAttribute('opacity', showBuzzLine ? '0.95' : '0');
    buzzLbl.textContent = t.buzzLineLabel;
  }

  // Layer 1: Coverage Bubbles (created once, then moved and resized so they glide with their defender)
  const zonesLayer = document.getElementById('layer-zones');
  if (zonesLayer) {
    const firstZones = zonesLayer.children.length === 0;
    if (firstZones) {
      zonesLayer.innerHTML = DEF_PLAYER_IDS.map(id => `
        <g id="zone-${id}" class="zone-bubble">
          <ellipse cx="0" cy="0" rx="1" ry="1" fill="url(#zone-fill-${id})" stroke="var(--def-${id.slice(1)})" stroke-opacity="0.4" stroke-width="1" />
        </g>
      `).join('');
    }
    const radii = ZONE_RADII[defKey];
    DEF_PLAYER_IDS.forEach(id => {
      const g = document.getElementById(`zone-${id}`);
      if (!g || !dPos[id]) return;
      g.style.transitionDelay = `${defDelay(id)}ms`;
      placeAt(g, dPos[id][0], dPos[id][1]);
      const ellipse = g.firstElementChild;
      if (!ellipse) return;
      ellipse.setAttribute('rx', String(radii[id][0]));
      ellipse.setAttribute('ry', String(radii[id][1]));
    });
    // On the first render the overlay state applies at once instead of fading out from the default
    if (firstZones) zonesLayer.style.transition = 'none';
    zonesLayer.style.opacity = state.overlays.zones ? '1' : '0';
    if (firstZones) {
      void getComputedStyle(zonesLayer).opacity;
      zonesLayer.style.transition = '';
    }
    zonesLayer.setAttribute('aria-hidden', 'true');
  }

  // Layer 2: Passing Lanes (fade in after the ball lands, then the dashes drift toward the receiver)
  const lanesLayer = document.getElementById('layer-lanes');
  const lanesKey = state.overlays.lanes ? `${state.offense}|${state.ballSpot}` : 'off';
  if (lanesLayer && lanesKey !== lastLanesKey) {
    lastLanesKey = lanesKey;
    // The dash drift loops forever and is not stopped by removing its line, so stop it before the lines are replaced
    lanesLayer.querySelectorAll('line').forEach(line => {
      if (typeof line.getAnimations === 'function') line.getAnimations().forEach(a => a.cancel());
    });
    if (!state.overlays.lanes) {
      lanesLayer.innerHTML = '';
    } else {
      const lanes = getPassingArrows(state.offense, state.ballSpot);
      lanesLayer.innerHTML = lanes.map(([x1, y1, x2, y2]) => {
        // Shorten endpoint slightly so arrowhead sits cleanly before target token
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ex = x2 - (dx / len) * 18;
        const ey = y2 - (dy / len) * 18;
        const sx = x1 + (dx / len) * 14;
        const sy = y1 + (dy / len) * 14;
        return `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="var(--arrow-pass)" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arrow-pass)" opacity="0.88" />`;
      }).join('');
      if (motionOK()) {
        const base = ballMoved ? ballMs + 80 : 0;
        lanesLayer.querySelectorAll('line').forEach((line, i) => {
          if (typeof line.animate !== 'function') return;
          // On page load the lanes are simply there; the fade-in belongs to later changes
          const delay = firstRender ? 0 : base + i * 50;
          if (!firstRender) {
            line.animate([{ opacity: 0 }, { opacity: 0.88 }], { duration: 280, delay, easing: easeMove, fill: 'backwards' });
          }
          // One full dash period (5 + 4) twice over, so the loop is seamless
          line.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -18 }], { duration: 1400, delay: firstRender ? 0 : delay + 280, iterations: Infinity, easing: 'linear' });
        });
      }
    }
  }

  // Layer 3: Rotation Arrows (drawn from the defender's base spot once the ball lands)
  const rotLayer = document.getElementById('layer-rotations');
  const rotKey = state.overlays.rotations ? `${defKey}|${state.ballSpot}` : 'off';
  if (rotLayer && rotKey !== lastRotKey) {
    lastRotKey = rotKey;
    if (!state.overlays.rotations) {
      rotLayer.innerHTML = '';
    } else {
      const arrows = getRotationArrows(defKey, state.ballSpot);
      rotLayer.innerHTML = arrows.map(([x1, y1, x2, y2]) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const ex = x2 - (dx / len) * 16;
        const ey = y2 - (dy / len) * 16;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="var(--arrow-rot)" stroke-width="2.2" marker-end="url(#arrow-def)" opacity="0.72" pathLength="1" />`;
      }).join('');
      // On page load the arrows are drawn as they are; the draw-in belongs to later changes
      if (motionOK() && !firstRender) {
        const base = ballMoved ? ballMs : 0;
        rotLayer.querySelectorAll('line').forEach((line, i) => {
          if (typeof line.animate !== 'function') return;
          // pathLength="1" makes a dash of 1 cover the whole line, so the offset sweeps it in from the start
          line.animate(
            [
              { strokeDasharray: '1 1', strokeDashoffset: 1, opacity: 0 },
              { opacity: 0.72, offset: 0.25 },
              { strokeDasharray: '1 1', strokeDashoffset: 0, opacity: 0.72 }
            ],
            { duration: 320, delay: base + i * 40, easing: easeMove, fill: 'backwards' }
          );
        });
      }
    }
  }

  // Layer 4: Ball Hotspots (created once so keyboard focus survives a selection; only state is patched)
  const hotLayer = document.getElementById('layer-hotspots');
  if (hotLayer) {
    if (hotLayer.children.length === 0) {
      hotLayer.innerHTML = BALL_SPOTS.map(s => `
        <g id="hotspot-${s.id}" class="hotspot-group" tabindex="0" role="button" data-action="setBallSpot" data-value="${s.id}">
          <circle class="hotspot-pulse" cx="${s.x}" cy="${s.y}" r="18" />
          <circle class="hotspot-hit-ring" cx="${s.x}" cy="${s.y}" r="18" fill="var(--hotspot-bg)" fill-opacity="0.45" stroke="var(--court-line)" stroke-width="1" stroke-dasharray="3 2" />
          <circle class="hotspot-dot" cx="${s.x}" cy="${s.y}" r="5" fill="var(--primary-container)" stroke="var(--on-surface)" stroke-width="1" />
        </g>
      `).join('');
    }
    BALL_SPOTS.forEach(s => {
      const g = document.getElementById(`hotspot-${s.id}`);
      if (!g) return;
      const active = s.id === state.ballSpot;
      g.classList.toggle('is-active', active);
      g.setAttribute('aria-label', t.spotNames[s.id]);
      g.setAttribute('aria-pressed', String(active));
    });

    // Landing pulse on the newly selected spot, timed to the ball's arrival.
    // A pulse still running on the spot the ball just left is stopped, so only the current spot pulses.
    if (ballMoved) {
      hotLayer.querySelectorAll('.hotspot-pulse').forEach(p => {
        if (typeof p.getAnimations === 'function') p.getAnimations().forEach(a => a.cancel());
      });
    }
    const pulse = document.querySelector(`#hotspot-${state.ballSpot} .hotspot-pulse`);
    if (stagger && pulse && typeof pulse.animate === 'function') {
      pulse.animate(
        [{ transform: 'scale(0.6)', opacity: 0.8 }, { transform: 'scale(1.9)', opacity: 0 }],
        { duration: 1200, delay: ballMs, iterations: 2, easing: 'ease-out' }
      );
    }
  }

  // Layer 5: Offensive Tokens O1-O5 (created once, then translated smoothly!)
  const offLayer = document.getElementById('layer-offense');
  if (offLayer) {
    if (offLayer.children.length === 0) {
      offLayer.innerHTML = OFF_PLAYER_IDS.map(id => `
        <g id="tok-${id}" class="token-group" tabindex="0" role="button" aria-label="${id}" data-action="selectPlayer" data-value="${id}">
          <circle class="token-focus-ring" cx="0" cy="0" r="22" fill="none" stroke="var(--focus)" stroke-width="2" />
          <circle class="token-selected-ring" cx="0" cy="0" r="19" fill="none" stroke="var(--primary-container)" stroke-width="3" />
          <circle class="token-shadow" cx="0" cy="3" r="14" fill="var(--on-surface)" opacity="0.28" filter="url(#soft-shadow)" />
          <circle class="token-circle" cx="0" cy="0" r="14" fill="url(#token-off)" stroke="var(--off-stroke)" stroke-width="2" />
          <text x="0" y="4.5" text-anchor="middle" fill="var(--on-primary)" font-family="var(--font-label)" font-size="11" font-weight="700">${id}</text>
        </g>
      `).join('');
    }
    OFF_PLAYER_IDS.forEach((id, i) => {
      const g = document.getElementById(`tok-${id}`);
      if (g && oPos[id]) {
        g.style.transitionDelay = stagger ? `${60 + i * 25}ms` : '0ms';
        placeAt(g, oPos[id][0], oPos[id][1]);
        g.classList.toggle('is-selected', state.selectedPlayer === id);
      }
    });
  }

  // Layer 6: Defensive Tokens D1-D5 (created once, then translated smoothly!)
  const defLayer = document.getElementById('layer-defense');
  if (defLayer) {
    if (defLayer.children.length === 0) {
      defLayer.innerHTML = DEF_PLAYER_IDS.map(id => `
        <g id="tok-${id}" class="token-group" tabindex="0" role="button" aria-label="${id}" data-action="selectPlayer" data-value="${id}">
          <circle class="token-focus-ring" cx="0" cy="0" r="23" fill="none" stroke="var(--focus)" stroke-width="2" />
          <circle class="token-selected-ring" cx="0" cy="0" r="20" fill="none" stroke="var(--primary-container)" stroke-width="3" />
          <circle class="token-shadow" cx="0" cy="3" r="15" fill="var(--on-surface)" opacity="0.28" filter="url(#soft-shadow)" />
          <circle class="token-circle" cx="0" cy="0" r="15" fill="var(--def-${id.slice(1)})" stroke="var(--def-stroke)" stroke-width="2" />
          <circle cx="0" cy="0" r="13" fill="url(#token-gloss)" pointer-events="none" />
          <text x="0" y="4.5" text-anchor="middle" fill="var(--on-primary)" font-family="var(--font-label)" font-size="11" font-weight="700">${id}</text>
        </g>
      `).join('');
    }
    DEF_PLAYER_IDS.forEach(id => {
      const g = document.getElementById(`tok-${id}`);
      if (g && dPos[id]) {
        g.style.transitionDelay = `${defDelay(id)}ms`;
        placeAt(g, dPos[id][0], dPos[id][1]);
        g.classList.toggle('is-selected', state.selectedPlayer === id);
      }
    });
  }

  // Layer 7: Ball Token positioned slightly offset from ball hotspot.
  // X and Y run on separate groups with different curves, so a pass travels on an arc instead of a straight line.
  const ballTok = document.getElementById('ball-token');
  const ballY = document.getElementById('ball-y');
  if (ballTok && ballY && ball) {
    const firstPlacement = !ballTok.dataset.placed;
    if (firstPlacement) {
      ballTok.style.transition = 'none';
      ballY.style.transition = 'none';
    }
    ballTok.style.transform = `translateX(${ball.x + 12}px)`;
    ballY.style.transform = `translateY(${ball.y - 12}px)`;
    if (firstPlacement) {
      // Commit the start position without a transition, then hand control back to the stylesheet
      void getComputedStyle(ballTok).transform;
      void getComputedStyle(ballY).transform;
      ballTok.style.transition = '';
      ballY.style.transition = '';
      ballTok.dataset.placed = '1';
    } else if (stagger) {
      const body = ballY.querySelector('.ball-body');
      const shadow = ballY.querySelector('.ball-shadow');
      if (body && typeof body.animate === 'function') {
        body.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
          { duration: ballMs, easing: 'ease-in-out' }
        );
      }
      if (shadow && typeof shadow.animate === 'function') {
        shadow.animate(
          [
            { opacity: 0.25, transform: 'translate(0, 0) scale(1)' },
            { opacity: 0.12, transform: 'translate(5px, 9px) scale(0.55)' },
            { opacity: 0.25, transform: 'translate(0, 0) scale(1)' }
          ],
          { duration: ballMs, easing: 'ease-in-out' }
        );
      }
    }
  }

  lastRenderedBallSpot = state.ballSpot;
}

function renderUI() {
  const t = I18N[state.lang];
  const defKey = getDefKey();

  // Header & Controls
  setElText('ui-badge', t.badge);
  setElText('ui-meta', t.meta);
  setElText('ui-title', t.title);
  setElText('ui-subtitle', t.subtitle);
  setElText('txt-lbl-defense', t.lblDefense);
  setElText('txt-lbl-offense', t.lblOffense);
  setElText('txt-lbl-overlays', t.lblOverlays);

  setElText('def-212', t.defNames['212']);
  setElText('def-23', t.defNames['23']);
  setElText('def-32', t.defNames['32']);
  setElText('def-131', t.defNames['131']);
  setElText('txt-btn-buzz', t.buzzLabel);

  setElText('off-overload', t.offNames.overload);
  setElText('off-hilo', t.offNames.hilo);
  setElText('off-gap', t.offNames.gap);

  setElText('ov-zones', t.ovNames.zones);
  setElText('ov-rotations', t.ovNames.rotations);
  setElText('ov-lanes', t.ovNames.lanes);

  // Court labels & controls
  setElText('court-card-title', t.courtTitle);
  const buzzSuffix = (state.defense === '212' && state.buzz) ? ` (Buzz)` : '';
  setElText('badge-matchup', `${t.defNames[state.defense]}${buzzSuffix} vs ${t.offNames[state.offense]}`);
  setElText('badge-ball', `${t.ballPrefix} ${t.spotNames[state.ballSpot]}`);

  BALL_SPOTS.forEach(s => {
    const btn = document.getElementById(`spot-${s.id}`);
    if (btn) {
      btn.textContent = t.spotNames[s.id];
      btn.setAttribute('aria-pressed', String(state.ballSpot === s.id));
    }
  });

  setElText('txt-play-seq', state.playing ? t.pauseSeq : t.playSeq);
  setElText('txt-step-seq', t.stepSeq);
  setElText('txt-reset', t.resetBtn);
  setElText('seq-status', state.playing ? t.seqPlaying : t.seqHint);

  setElText('leg-def', t.legDef);
  setElText('leg-off', t.legOff);
  setElText('leg-ball', t.legBall);
  setElText('leg-rot', t.legRot);
  setElText('leg-pass', t.legPass);

  setElText('ann-highpost', t.annHighPost);
  setElText('ann-shortcorner', t.annShortCorner);
  setElText('ann-paint', t.annPaint);

  // Pressed states
  ['212', '23', '32', '131'].forEach(d => {
    const btn = document.getElementById(`def-${d}`);
    if (btn) btn.setAttribute('aria-pressed', String(state.defense === d));
  });
  const buzzBtn = document.getElementById('btn-buzz');
  if (buzzBtn instanceof HTMLButtonElement) {
    buzzBtn.disabled = state.defense !== '212';
    buzzBtn.setAttribute('aria-pressed', String(state.defense === '212' && state.buzz));
  }
  ['overload', 'hilo', 'gap'].forEach(o => {
    const btn = document.getElementById(`off-${o}`);
    if (btn) btn.setAttribute('aria-pressed', String(state.offense === o));
  });
  OVERLAY_IDS.forEach(k => {
    const btn = document.getElementById(`ov-${k}`);
    if (btn) btn.setAttribute('aria-pressed', String(state.overlays[k]));
  });

  // Live Tactical Readout
  setElText('coach-card-title', t.coachTitle);
  setElText('badge-focus-role', t.focusRole);
  setElText('coach-h-onball', t.hOnBall);
  setElText('coach-h-help', t.hHelp);
  setElText('coach-h-weak', t.hWeak);
  setElText('coach-h-offense', t.hOffense);

  // Live readout follows the pass: after a ball move the new text rises in once the ball is in the air
  const textDelay = ballMovedSinceLastRender() ? 240 : 0;
  const tac = t.tactics[state.defense][state.ballSpot];
  setLiveText('coach-p-onball', tac.onball, textDelay);
  setLiveText('coach-p-help', tac.help, textDelay + 30);
  setLiveText('coach-p-weak', tac.weak, textDelay + 60);
  setLiveText('coach-p-offense', t.offenseReads[state.offense][state.ballSpot], textDelay + 90);

  // Player Spotlight
  setElText('insp-title', t.inspTitle);
  const selected = state.selectedPlayer;
  const roleText = isOffensePlayer(selected)
    ? t.playerRoles.off[selected]
    : t.playerRoles[state.defense][selected];
  const parts = roleText.split('—');
  setLiveText('insp-badge', parts[0].trim(), 0);
  setLiveText('insp-body', parts.slice(1).join('—').trim(), 30);

  // System Note
  setElText('sys-note-title', t.sysNoteTitle);
  setLiveText('sys-note-body', t.systemProfiles[defKey], 0);

  // Reference Sections
  setElText('sec-rules-title', t.secRulesTitle);
  setElText('sec-matrix-title', t.secMatrixTitle);
  setElText('sec-off-title', t.secOffTitle);

  // Cards and the matrix text change only with language, not with every pass of the demo;
  // the active matrix row is toggled in place so its highlight can fade between systems
  const staticKey = state.lang;
  const rebuildStatic = staticKey !== lastStaticKey;
  lastStaticKey = staticKey;

  const rulesGrid = document.getElementById('rules-grid');
  if (rulesGrid && rebuildStatic) {
    rulesGrid.innerHTML = t.rules.map(r => `
      <article class="principle-card">
        <div class="principle-card-top">
          <h3>${r.title}</h3>
          <span class="index-num">${r.num}</span>
        </div>
        <p>${r.body}</p>
      </article>
    `).join('');
  }

  setElText('th-sys', t.thSys);
  setElText('th-center', t.thCenter);
  setElText('th-mech', t.thMech);
  setElText('th-pros', t.thPros);
  setElText('th-cons', t.thCons);

  const matrixBody = document.getElementById('matrix-body');
  if (matrixBody && rebuildStatic) {
    matrixBody.innerHTML = t.matrix.map(row => `
      <tr data-row="${row.id}">
        <td><strong>${row.name}</strong></td>
        <td>${row.center}</td>
        <td>${row.mech}</td>
        <td>${row.pros}</td>
        <td>${row.cons}</td>
      </tr>
    `).join('');
  }
  if (matrixBody) {
    matrixBody.querySelectorAll('tr').forEach(tr => tr.classList.toggle('active-row', tr.dataset.row === state.defense));
  }

  const offenseGrid = document.getElementById('offense-grid');
  if (offenseGrid && rebuildStatic) {
    offenseGrid.innerHTML = t.offPrinciples.map(p => `
      <article class="principle-card">
        <div class="principle-card-top">
          <h3>${p.title}</h3>
          <span class="index-num">${p.num}</span>
        </div>
        <p>${p.body}</p>
      </article>
    `).join('');
  }

  setElText('adv-youth-title', t.advYouthTitle);
  setElText('adv-youth-body', t.advYouthBody);
  setElText('adv-buzz-title', t.advBuzzTitle);
  setElText('adv-buzz-body', t.advBuzzBody);
  setElText('footer-sources', t.footerSources);

  renderTokensAndLayers();
  updateSegThumbs();
}

// =========================================================================
// 5. EVENT HANDLERS (Hoisted function declarations)
// =========================================================================
// Handlers get the data-value of the control; a value that is not a known id is ignored
type Action = (value?: string) => void;

function isOneOf<T extends string>(ids: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (ids as readonly string[]).includes(value);
}

function setDefense(def?: string): void {
  if (!isOneOf(DEFENSE_IDS, def)) return;
  state.defense = def;
  if (def !== '212') state.buzz = false;
  renderUI();
}

function toggleBuzz(): void {
  if (state.defense !== '212') return;
  state.buzz = !state.buzz;
  renderUI();
}

function setOffense(off?: string): void {
  if (!isOneOf(OFFENSE_IDS, off)) return;
  state.offense = off;
  renderUI();
}

function setBallSpot(spot?: string): void {
  if (!isOneOf(SPOT_IDS, spot)) return;
  state.ballSpot = spot;
  const idx = DEMO_SEQUENCE.indexOf(spot);
  if (idx !== -1) state.seqIndex = idx;
  renderUI();
}

function selectPlayer(id?: string): void {
  if (!isOneOf(DEF_PLAYER_IDS, id) && !isOneOf(OFF_PLAYER_IDS, id)) return;
  state.selectedPlayer = id;
  renderUI();
}

function toggleOverlay(key?: string): void {
  if (!isOneOf(OVERLAY_IDS, key)) return;
  state.overlays[key] = !state.overlays[key];
  renderUI();
}

// The next pass always follows the ball's current spot, so the circuit stays in order after a manual
// spot click
function advanceDemoSpot(): void {
  state.seqIndex = (DEMO_SEQUENCE.indexOf(state.ballSpot) + 1) % DEMO_SEQUENCE.length;
  state.ballSpot = DEMO_SEQUENCE[state.seqIndex];
}

function stepSequence(): void {
  advanceDemoSpot();
  // A manual pass during playback restarts the countdown to the next automatic one
  seqElapsed = 0;
  renderUI();
}

// Demo playback runs on animation frames: the Play button shows time to the next pass,
// and the countdown pauses while the tab is hidden (no frames are delivered then)
const SEQ_STEP_MS = 1700;
let seqElapsed = 0;
let seqLastFrame: number | null = null;

function setSeqProgress(fraction: number): void {
  const bar = document.getElementById('seq-progress');
  if (bar) bar.style.transform = `scaleX(${Math.min(fraction, 1)})`;
}

function seqFrame(now: number): void {
  if (!state.playing) return;
  if (seqLastFrame !== null) {
    // Cap a long gap (tab was hidden) so playback resumes where it paused instead of skipping ahead
    seqElapsed += Math.min(now - seqLastFrame, 100);
  }
  seqLastFrame = now;
  if (seqElapsed >= SEQ_STEP_MS) {
    seqElapsed = 0;
    advanceDemoSpot();
    renderUI();
  }
  setSeqProgress(seqElapsed / SEQ_STEP_MS);
  seqTimer = requestAnimationFrame(seqFrame);
}

function stopSequence(): void {
  state.playing = false;
  if (seqTimer) {
    cancelAnimationFrame(seqTimer);
    seqTimer = null;
  }
  seqElapsed = 0;
  seqLastFrame = null;
  setSeqProgress(0);
}

function toggleSequencePlay(): void {
  if (state.playing) {
    stopSequence();
    renderUI();
    return;
  }
  state.playing = true;
  seqElapsed = 0;
  seqLastFrame = null;
  renderUI();
  seqTimer = requestAnimationFrame(seqFrame);
}

function resetBoard(): void {
  stopSequence();
  state.defense = '212';
  state.buzz = false;
  state.offense = 'overload';
  state.ballSpot = 'top';
  state.selectedPlayer = 'D5';
  state.seqIndex = 0;
  state.overlays = { zones: true, rotations: true, lanes: true };
  renderUI();
}

// The site's content security policy forbids inline handlers, so controls carry data-action / data-value
// attributes and one delegated listener per event type runs the matching action.
const ACTIONS: Record<string, Action | undefined> = {
  setDefense, toggleBuzz, setOffense, toggleOverlay,
  setBallSpot, selectPlayer, toggleSequencePlay, stepSequence, resetBoard
};

// Only the board's own actions: a name such as "constructor" must not reach the object's prototype
function actionOf(el: HTMLElement): Action | undefined {
  const name = el.dataset.action ?? '';
  return Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : undefined;
}

function bindActions(root: Document): void {
  root.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-action]') : null;
    const action = el && actionOf(el);
    if (el && action) action(el.dataset.value);
  });
  // Court hotspots and player tokens are SVG groups: the keyboard activates them only through this handler,
  // whereas native buttons already click on Enter and Space
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-action]') : null;
    const action = el && actionOf(el);
    if (!el || !action || el.tagName === 'BUTTON') return;
    e.preventDefault();
    action(el.dataset.value);
  });
}

// =========================================================================
// 6. INITIALIZATION
// =========================================================================
function initApp(): void {
  bindActions(document);
  // The site's switch lives in the page header; the first render also draws the board
  startPageLang(document.getElementById('lang-switch')!, (lang) => {
    state.lang = lang;
    applyStaticTexts(lang, { title: `${I18N[lang].title} · ${MESSAGES[lang].learnHeading}`, description: I18N[lang].subtitle });
    document.getElementById('learn-back')?.setAttribute('href', `/learn/?lang=${lang}`);
    renderUI();
  });
  // Track widths change with wrapping and web-font swaps, which no state change reports;
  // options are observed too, because a full-width or wrapped track keeps its box while they resize
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => updateSegThumbs(false));
    SEG_THUMBS.forEach(({ track, buttons }) => {
      const el = document.getElementById(track);
      if (el) ro.observe(el);
      if (el) el.querySelectorAll(buttons).forEach(b => ro.observe(b));
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => updateSegThumbs(false));
  }
}

document.addEventListener('DOMContentLoaded', initApp);
