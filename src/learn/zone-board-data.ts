// Constants of the zone tactics board: ball spots and the demo pass sequence, defender and attacker positions per
// formation and ball spot, coverage zone radii, and the EN / IT / UK content dictionary.

import type { BoardLang } from './board-lang.ts';

export type SpotId = 'top' | 'r_wing' | 'l_wing' | 'r_corner' | 'l_corner' | 'high_post' | 'short_corner';
export type DefenseId = '212' | '23' | '32' | '131';
// The 2-1-2 defense with Buzz pressure has its own positions and zone radii
export type DefenseKey = DefenseId | '212_buzz';
export type OffenseId = 'overload' | 'hilo' | 'gap';
export type OverlayId = 'zones' | 'rotations' | 'lanes';
export type DefPlayerId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
export type OffPlayerId = 'O1' | 'O2' | 'O3' | 'O4' | 'O5';
export type PlayerId = DefPlayerId | OffPlayerId;

export const SPOT_IDS: readonly SpotId[] = ['top', 'r_wing', 'l_wing', 'r_corner', 'l_corner', 'high_post', 'short_corner'];
export const DEFENSE_IDS: readonly DefenseId[] = ['212', '23', '32', '131'];
export const OFFENSE_IDS: readonly OffenseId[] = ['overload', 'hilo', 'gap'];
export const OVERLAY_IDS: readonly OverlayId[] = ['zones', 'rotations', 'lanes'];
export const DEF_PLAYER_IDS: readonly DefPlayerId[] = ['D1', 'D2', 'D3', 'D4', 'D5'];
export const OFF_PLAYER_IDS: readonly OffPlayerId[] = ['O1', 'O2', 'O3', 'O4', 'O5'];

export type Point = readonly [number, number];
export interface BallSpot { id: SpotId; x: number; y: number }

export const BALL_SPOTS: readonly BallSpot[] = [
  { id: 'top', x: 300, y: 344 },
  { id: 'r_wing', x: 518, y: 232 },
  { id: 'l_wing', x: 82, y: 232 },
  { id: 'r_corner', x: 556, y: 72 },
  { id: 'l_corner', x: 44, y: 72 },
  { id: 'high_post', x: 300, y: 214 },
  { id: 'short_corner', x: 424, y: 86 }
];

// Ball reversal circuit through every spot: down the right side, inside to the short corner and high post,
// then reversed to the left wing and corner before returning to the top
export const DEMO_SEQUENCE: readonly SpotId[] = ['top', 'r_wing', 'r_corner', 'short_corner', 'high_post', 'l_wing', 'l_corner'];

// Defense positions: D1, D2, D3, D4, D5
export const DEF_POS: Record<DefenseKey, Record<SpotId, Record<DefPlayerId, Point>>> = {
  '212': {
    top:          { D1:[252,272], D2:[348,272], D3:[176,134], D4:[424,134], D5:[300,206] },
    r_wing:       { D1:[284,214], D2:[456,208], D3:[246,98],  D4:[448,116], D5:[328,128] },
    l_wing:       { D1:[144,208], D2:[316,214], D3:[152,116], D4:[354,98],  D5:[272,128] },
    r_corner:     { D1:[294,162], D2:[380,176], D3:[266,90],  D4:[504,80],  D5:[364,98]  },
    l_corner:     { D1:[220,176], D2:[306,162], D3:[96,80],   D4:[334,90],  D5:[236,98]  },
    high_post:    { D1:[194,250], D2:[406,250], D3:[216,98],  D4:[384,98],  D5:[300,184] },
    short_corner: { D1:[264,196], D2:[406,198], D3:[276,96],  D4:[434,114], D5:[384,90]  }
  },
  '212_buzz': {
    top:          { D1:[246,304], D2:[354,304], D3:[172,116], D4:[428,116], D5:[300,214] },
    r_wing:       { D1:[288,224], D2:[464,216], D3:[244,98],  D4:[456,112], D5:[338,142] },
    l_wing:       { D1:[136,216], D2:[312,224], D3:[144,112], D4:[356,98],  D5:[262,142] },
    r_corner:     { D1:[288,184], D2:[392,188], D3:[264,92],  D4:[506,78],  D5:[372,112] },
    l_corner:     { D1:[208,188], D2:[312,184], D3:[94,78],   D4:[336,92],  D5:[228,112] },
    high_post:    { D1:[184,258], D2:[416,258], D3:[210,104], D4:[390,104], D5:[300,188] },
    short_corner: { D1:[262,210], D2:[414,202], D3:[274,98],  D4:[438,114], D5:[384,92]  }
  },
  '23': {
    top:          { D1:[246,266], D2:[354,266], D3:[168,108], D4:[432,108], D5:[300,108] },
    r_wing:       { D1:[268,212], D2:[456,206], D3:[256,86],  D4:[450,102], D5:[346,94]  },
    l_wing:       { D1:[144,206], D2:[332,212], D3:[150,102], D4:[344,86],  D5:[254,94]  },
    r_corner:     { D1:[284,158], D2:[376,166], D3:[264,84],  D4:[506,76],  D5:[368,86]  },
    l_corner:     { D1:[224,166], D2:[316,158], D3:[94,76],   D4:[336,84],  D5:[232,86]  },
    high_post:    { D1:[216,246], D2:[384,246], D3:[224,90],  D4:[376,90],  D5:[300,174] },
    short_corner: { D1:[278,168], D2:[404,184], D3:[264,86],  D4:[438,100], D5:[364,86]  }
  },
  '32': {
    top:          { D1:[300,294], D2:[446,224], D3:[154,224], D4:[368,104], D5:[232,104] },
    r_wing:       { D1:[346,250], D2:[468,216], D3:[210,206], D4:[388,96],  D5:[264,90]  },
    l_wing:       { D1:[254,250], D2:[390,206], D3:[132,216], D4:[336,90],  D5:[212,96]  },
    r_corner:     { D1:[294,186], D2:[418,176], D3:[222,164], D4:[506,78],  D5:[316,86]  },
    l_corner:     { D1:[306,186], D2:[378,164], D3:[182,176], D4:[284,86],  D5:[94,78]   },
    high_post:    { D1:[300,246], D2:[436,210], D3:[164,210], D4:[352,128], D5:[248,128] },
    short_corner: { D1:[330,196], D2:[446,188], D3:[220,168], D4:[416,108], D5:[296,86]  }
  },
  '131': {
    top:          { D1:[300,298], D2:[438,204], D3:[162,204], D4:[300,74],  D5:[300,204] },
    r_wing:       { D1:[398,254], D2:[466,212], D3:[236,168], D4:[406,80],  D5:[332,154] },
    l_wing:       { D1:[202,254], D2:[364,168], D3:[134,212], D4:[194,80],  D5:[268,154] },
    r_corner:     { D1:[342,198], D2:[472,122], D3:[248,148], D4:[498,76],  D5:[346,112] },
    l_corner:     { D1:[258,198], D2:[352,148], D3:[128,122], D4:[102,76],  D5:[254,112] },
    high_post:    { D1:[288,258], D2:[424,192], D3:[176,192], D4:[300,82],  D5:[300,192] },
    short_corner: { D1:[336,206], D2:[438,178], D3:[238,152], D4:[436,98],  D5:[376,108] }
  }
};

// Offense positions: O1, O2, O3, O4, O5
export const OFF_POS: Record<OffenseId, Record<SpotId, Record<OffPlayerId, Point>>> = {
  overload: {
    top:          { O1:[300,362], O2:[524,238], O3:[76,238],  O4:[300,202], O5:[374,72]  },
    r_wing:       { O1:[310,342], O2:[534,238], O3:[562,64],  O4:[336,198], O5:[402,74]  },
    l_wing:       { O1:[290,342], O2:[38,64],   O3:[66,238],  O4:[264,198], O5:[198,74]  },
    r_corner:     { O1:[318,338], O2:[516,226], O3:[564,62],  O4:[338,180], O5:[388,74]  },
    l_corner:     { O1:[282,338], O2:[36,62],   O3:[84,226],  O4:[262,180], O5:[212,74]  },
    high_post:    { O1:[300,346], O2:[528,194], O3:[72,194],  O4:[300,208], O5:[352,78]  },
    short_corner: { O1:[290,338], O2:[520,226], O3:[560,64],  O4:[274,146], O5:[426,76]  }
  },
  hilo: {
    top:          { O1:[300,362], O2:[522,228], O3:[78,228],  O4:[300,208], O5:[230,88]  },
    r_wing:       { O1:[290,344], O2:[534,236], O3:[52,96],   O4:[338,204], O5:[244,84]  },
    l_wing:       { O1:[310,344], O2:[548,96],  O3:[66,236],  O4:[262,204], O5:[356,84]  },
    r_corner:     { O1:[486,252], O2:[564,62],  O3:[88,228],  O4:[348,198], O5:[248,84]  },
    l_corner:     { O1:[114,252], O2:[512,228], O3:[36,62],   O4:[252,198], O5:[352,84]  },
    high_post:    { O1:[290,346], O2:[528,210], O3:[56,118],  O4:[300,208], O5:[244,82]  },
    short_corner: { O1:[280,342], O2:[518,232], O3:[62,148],  O4:[276,174], O5:[428,76]  }
  },
  gap: {
    top:          { O1:[300,362], O2:[524,236], O3:[76,236],  O4:[418,86],  O5:[182,86]  },
    r_wing:       { O1:[278,342], O2:[534,236], O3:[72,212],  O4:[422,82],  O5:[224,90]  },
    l_wing:       { O1:[322,342], O2:[528,212], O3:[66,236],  O4:[376,90],  O5:[178,82]  },
    r_corner:     { O1:[490,250], O2:[564,62],  O3:[78,232],  O4:[372,132], O5:[218,84]  },
    l_corner:     { O1:[110,250], O2:[522,232], O3:[36,62],   O4:[382,84],  O5:[228,132] },
    high_post:    { O1:[286,346], O2:[524,218], O3:[76,218],  O4:[300,208], O5:[196,84]  },
    short_corner: { O1:[280,342], O2:[518,232], O3:[72,212],  O4:[428,76],  O5:[234,88]  }
  }
};

// Coverage zone radii per defender for each defense
export const ZONE_RADII: Record<DefenseKey, Record<DefPlayerId, Point>> = {
  '212':      { D1:[62,48], D2:[62,48], D3:[60,46], D4:[60,46], D5:[66,54] },
  '212_buzz': { D1:[68,46], D2:[68,46], D3:[58,44], D4:[58,44], D5:[68,54] },
  '23':       { D1:[62,48], D2:[62,48], D3:[64,46], D4:[64,46], D5:[72,48] },
  '32':       { D1:[66,46], D2:[62,48], D3:[62,48], D4:[74,48], D5:[74,48] },
  '131':      { D1:[66,48], D2:[60,50], D3:[60,50], D4:[92,34], D5:[64,48] }
};

const DICTIONARIES = {
  en: {
    badge: `TACTICAL SIMULATOR`,
    meta: `ZONE SYSTEMS · 2-1-2 · 2-3 · 3-2 · 1-3-1`,
    title: `Basketball Zone Defense & Attack Tactics Board`,
    subtitle: `Interactive half-court simulator for zone rotations, bumping mechanics, high-post coverage, and offensive zone-breaking alignments.`,
    lblDefense: `Defensive System`,
    lblOffense: `Offensive Attack Scheme`,
    lblOverlays: `Court Overlays`,
    defNames: { '212': `2-1-2 Zone`, '23': `2-3 Zone`, '32': `3-2 Zone`, '131': `1-3-1 Zone` },
    buzzLabel: `Buzz Pressure`,
    offNames: { overload: `1-3-1 Overload`, hilo: `High-Low Attack`, gap: `3-Out 2-In & Gap` },
    ovNames: { zones: `Coverage Zones`, rotations: `Rotation Arrows`, lanes: `Passing Lanes` },
    courtTitle: `Half-Court Simulator`,
    spotNames: {
      top: `Top of Key`,
      r_wing: `Right Wing`,
      l_wing: `Left Wing`,
      r_corner: `Right Corner`,
      l_corner: `Left Corner`,
      high_post: `High Post`,
      short_corner: `Short Corner`
    },
    ballPrefix: `Ball:`,
    playSeq: `Play Ball Reversal Demo`,
    pauseSeq: `Pause Demo`,
    stepSeq: `Next Pass`,
    resetBtn: `Reset`,
    seqHint: `Click any spot on court or token to inspect`,
    seqPlaying: `Simulating possession rotation…`,
    legDef: `D1–D5 Defenders`,
    legOff: `O1–O5 Offense`,
    legBall: `Basketball`,
    legRot: `Defensive Shift`,
    legPass: `Passing Read`,
    annHighPost: `HIGH POST`,
    annShortCorner: `SHORT CORNER`,
    annPaint: `PAINT`,
    buzzLineLabel: `VOLLEYBALL LINE (BUZZ PICKUP)`,
    coachTitle: `Live Tactical Briefing`,
    focusRole: `System Readout`,
    hOnBall: `Primary On-Ball Coverage`,
    hHelp: `Paint Anchor & Help Rotation`,
    hWeak: `Weak-Side Denial & Rebounding`,
    hOffense: `Offensive Read & Counter`,
    inspTitle: `Player Role Spotlight`,
    sysNoteTitle: `System Profile & Key Risk`,
    secRulesTitle: `Four Non-Negotiable Zone Rules & Coaching Nuances`,
    secMatrixTitle: `Zone Defense Comparison Matrix`,
    secOffTitle: `Fundamental Principles of Attacking Zone Defenses`,
    thSys: `System`,
    thCenter: `Center / Anchor`,
    thMech: `Core Rotation Mechanic`,
    thPros: `Strengths`,
    thCons: `Vulnerabilities`,
    advYouthTitle: `Personnel & Youth Coaching Note`,
    advYouthBody: `The 2-1-2 requires a long, athletic, shot-blocking center able to cover from the free-throw line down to the rim. Coaches should NOT run 2-1-2 in youth basketball: while it disrupts youth offenses, player development requires man-to-man defensive principles first.`,
    advBuzzTitle: `The 2-1-2 Buzz Variation`,
    advBuzzBody: `In the Buzz variation, top defenders pick up near the volleyball line and stunt with inside hands/feet to force slow high wing entries. The middle player stays ~15 ft from the rim directly in line with ball and basket while the outer four jump passing lanes.`,
    footerSources: `Grounded in coaching guides: 2-1-2 Zone Defense Complete Coaching Guide & Comparative Zone Defense / Zone Offense Report (2-3, 2-1-2, 3-2, 1-3-1).`,
    backToSection: `Coaching materials`,

    // Player role descriptions per defense & offense
    playerRoles: {
      '212': {
        D1: `D1 · Left Top Guard — Guards above free-throw line extended, stunts at top, bumps wing off on left side, drops to elbow/paint when ball goes to corner or weakside.`,
        D2: `D2 · Right Top Guard — Controls top-right perimeter, sprints to bump off D4 on right wing passes, denies high-post entry from elbow, widens closeout on ball reversal.`,
        D3: `D3 · Left Low Wing — Covers below FT line extended on left, briefly takes left wing until bumped by D1, closes out left corner, and sinks to rim on weakside for lob defense.`,
        D4: `D4 · Right Low Wing — Covers right corner and short corner; stunts wing until D2 arrives, traps short corner with D5 from behind, and pinches block on high-post catch.`,
        D5: `D5 · Middle Anchor (Center) — The make-or-break piece. Starts at high post to deny middle passes, stops early penetration, plays 1-on-1 in the paint, and initiates short-corner traps.`
      },
      '23': {
        D1: `D1 · Left Top Guard — Guards top-left perimeter, bumps D3 off left wing passes, drops to free-throw line / elbow when ball moves to right side.`,
        D2: `D2 · Right Top Guard — Guards top-right perimeter, bumps D4 off right wing, helps deny high post when ball is on left.`,
        D3: `D3 · Left Low Wing — Guards left corner and low block, sprints out to hold left wing briefly until bumped by D1, protects weakside rim.`,
        D4: `D4 · Right Low Wing — Guards right corner and short corner, sprints out to contest right wing until bumped by D2.`,
        D5: `D5 · Deep Paint Center — Anchored near the rim to clog the lane and secure defensive rebounds; closes up to high post only on the catch.`
      },
      '32': {
        D1: `D1 · Top Chaser — Pressures ball at top of key and shifts toward ball-side gaps along the 3-point arc to disrupt perimeter rhythm.`,
        D2: `D2 · Right Wing — Dedicated perimeter defender on right 45° wing; contests 3-point shots directly without waiting for a bump.`,
        D3: `D3 · Left Wing — Dedicated perimeter defender on left 45° wing; stays attached to shooters and drops to elbow on opposite wing catches.`,
        D4: `D4 · Right Backline — Covers right low block, paint, and must scramble all the way out to close out right corner shooters.`,
        D5: `D5 · Left Backline — Covers left low block, rim protection, and sprints to cover left corner 3-point attempts.`
      },
      '131': {
        D1: `D1 · Top Chaser — Aggressively hounds the point guard, funnels passes to a sideline, and sprints to initiate wing traps with D2 or D3.`,
        D2: `D2 · Right Wing — Plays middle line on right flank; traps right wing with D1 and right corner with baseline runner D4.`,
        D3: `D3 · Left Wing — Plays middle line on left flank; traps left wing/corner and sinks to weakside elbow to intercept diagonal skip passes.`,
        D4: `D4 · Baseline Runner — Covers corner-to-corner along the baseline; traps corners with wings and protects against baseline cuts.`,
        D5: `D5 · Middle Anchor — Patrols the free-throw line / high-post hub; fronts post catches, breaks up middle drives, and defends rim on corner traps.`
      },
      off: {
        O1: `O1 · Point / Primary Handler — Controls tempo at top, initiates ball reversal, attacks perimeter gaps, and hits skip passes faster than zone shifts.`,
        O2: `O2 · Shooting Wing — Stretches right perimeter/corner, creates 3-on-2 overloads, and relocates to open 3-point windows on drive-and-kick.`,
        O3: `O3 · Weakside / Corner Wing — Holds weakside spacing for skip-pass catch-and-shoot 3s or slides into ball-side corner in overload sets.`,
        O4: `O4 · High-Post Flash / Forward — Flashes to free-throw line nail to break the zone's center, looking for turn-and-shoot, Hi-Lo seal, or kickouts.`,
        O5: `O5 · Low-Post / Short-Corner Big — Seals weakside block for High-Low lobs or operates in the short corner to split the zone's backline.`
      }
    },

    systemProfiles: {
      '212': `Classic X-formation / envelope. Starting D5 at the high post denies middle catches, simplifies box-outs, and halts drives early—but leaves smaller wings near the rim vulnerable to lobs and perimeter overloads.`,
      '212_buzz': `High-pressure 2-1-2 Buzz variant. Tops pick up near the volleyball line to force slow lob entries; D5 holds ~15 ft from the rim in line with ball and basket while all four perimeter defenders play passing lanes.`,
      '23': `Deep-paint fortress. D5 stays glued near the rim to protect the basket and rebound, but starting low leaves the high post (free-throw line) and 45° seams exposed until defenders close out.`,
      '32': `Perimeter-focused 3-man arc shuts down 3-point shooters and top entries, but stretches only two backline defenders across both corners and the paint.`,
      '131': `Disruptive diamond trap defense built to force sideline/corner turnovers and steal cross-court passes. Vulnerable to quick ball reversal and long diagonal skip passes to the weak corner.`
    },

    // Dynamic Tactical Guidance per Defense x Ball Spot
    tactics: {
      '212': {
        top: {
          onball: `D1 and D2 share the point—stunting and motioning toward the ball without over-committing so they stay close to the wings and choke off high-post passes.`,
          help: `D5 patrols the high post behind any flasher (or three-quarter fronts a dominant post). If no high-post player is present, D5 drops slightly toward mid-paint while watching cutters.`,
          weak: `D3 and D4 slide slightly up and out above the blocks, ready to jump out and take a wing pass briefly until bumped down by D1 or D2.`
        },
        r_wing: {
          onball: `D4 initially stunts/takes the right wing catch, then gets bumped off by D2 sprinting out. D4 slides down toward the baseline, staying wide enough to close out the corner.`,
          help: `D1 drops toward the free-throw line to front or put a hand in the high-post lane, allowing D5 to drop closer to the ball-side block.`,
          weak: `D3 sinks into help near the rim to deny lobs over the top and stay ready for a skip pass to the opposite side.`
        },
        l_wing: {
          onball: `D3 holds the left wing briefly until D1 sprints out to bump D3 down toward the left baseline and corner coverage.`,
          help: `D2 drops near the free-throw line to deny high-post entry, freeing D5 to drop and front any low-block threat on the ball side.`,
          weak: `D4 pulls into the paint near the rim to protect against lobs and track weakside cutters.`
        },
        r_corner: {
          onball: `D4 closes out hard on the right corner shooter, angling the closeout to take away the 3-point shot and completely deny baseline penetration.`,
          help: `D2 drops to the ball-side elbow to erase high-post passes. D5 fronts the ball-side low block to deny paint entry or stop middle drives.`,
          weak: `D1 drops into the middle of the paint ready to sprint to a skip pass; D3 stays in paint help to take away lobs.`
        },
        l_corner: {
          onball: `D3 closes out to contest the corner 3 while sealing off the baseline drive.`,
          help: `D1 drops to the left elbow to take away the high post; D5 fronts the left low block.`,
          weak: `D2 drops to the center of the paint to read skip passes, while D4 guards the rim against weakside lobs.`
        },
        high_post: {
          onball: `D5 immediately guards the high-post catch 1-on-1 like man-to-man defense—using length and athleticism to contest the shot or block vision.`,
          help: `D1 and D2 MUST NOT converge on the high post (that creates wide-open 3s). Both fan out to find perimeter shooters and take away kickout passes.`,
          weak: `D3 and D4 play inside-out: pinch to the low blocks first to take away any high-low pass for a layup, then widen out to shooters.`
        },
        short_corner: {
          onball: `TRAP! D5 initiates the trap on the short corner while sealing the baseline, and D4 completes the trap from behind to suffocate the handler.`,
          help: `D2 cheats out near the right wing to deny an easy outlet pass back up the sideline.`,
          weak: `D3 sprints to the middle of the paint to deny rim dives; D1 plays "centerfield" in the paint to intercept any cross-court skip pass.`
        }
      },
      '23': {
        top: {
          onball: `D1 and D2 mirror the point guard above the free-throw line extended, keeping hands up to deter direct seam passes into the high post.`,
          help: `D5 stays anchored deep near the rim to clog the lane and secure rebounds—leaving the high post temporarily open until a catch.`,
          weak: `D3 and D4 hold the low blocks, ready to run out on wing catches until bumped off by D1 or D2.`
        },
        r_wing: {
          onball: `D4 runs out to contest the wing catch immediately; D2 slides diagonally down to bump D4 off and take the ball.`,
          help: `Once bumped, D4 retreats to guard the right corner. D5 shifts to the ball-side block while D1 drops to the elbow/paint.`,
          weak: `D3 collapses into the middle paint to protect the rim and track weakside baseline cutters.`
        },
        l_wing: {
          onball: `D3 contests the left wing catch until D1 sprints across to bump D3 back toward the left corner.`,
          help: `D5 shifts to the left low block; D2 drops to the free-throw line area to help on high-post flashes.`,
          weak: `D4 protects the rim on the weakside and prepares to close out on reversal skips.`
        },
        r_corner: {
          onball: `D4 closes out to the right corner forcing the ball away from the baseline.`,
          help: `D5 fronts the ball-side low post; D2 drops to the ball-side elbow/short corner seam.`,
          weak: `D1 drops to the middle of the paint for skip-pass coverage; D3 holds the rim against backdoor cuts.`
        },
        l_corner: {
          onball: `D3 closes out to the left corner; D5 slides to front the left block.`,
          help: `D1 drops to the left elbow; D2 sinks to mid-paint to cover skips.`,
          weak: `D4 anchors the rim area to stop weakside dives and rebound.`
        },
        high_post: {
          onball: `D5 must sprint up from the rim to contest the high-post catch—exposing the classic 2-3 vulnerability behind him.`,
          help: `D3 and D4 must pinch tight toward the basket to take away the high-low pass and rim dives.`,
          weak: `D1 and D2 drop slightly to dig or recover out to perimeter kickouts.`
        },
        short_corner: {
          onball: `D4 steps out to contest the short corner while keeping baseline sealed.`,
          help: `D5 holds the ball-side low block to protect the rim; D2 drops toward the wing to deny the kickout.`,
          weak: `D3 slides under the basket for weakside rebounding and dive help; D1 watches the top/skip.`
        }
      },
      '32': {
        top: {
          onball: `D1 pressures the ball at the top of the key while D2 and D3 stay attached to both 45° wings, forming a tight 3-point wall.`,
          help: `D4 and D5 anchor the two low blocks, communicating cutters across the paint.`,
          weak: `Because three defenders stay high, D4 and D5 are responsible for all baseline and corner threats.`
        },
        r_wing: {
          onball: `D2 steps up directly on the right wing catch—no bump-off required, eliminating late perimeter closeouts.`,
          help: `D1 shifts into the ball-side gap to deter penetration; D4 slides out slightly toward the right short corner/block.`,
          weak: `D3 drops toward the high post; D5 protects the basket alone against middle dives.`
        },
        l_wing: {
          onball: `D3 contests the left wing shooter directly while D1 shades the top-left gap.`,
          help: `D5 slides toward the left block; D2 drops toward the free-throw line.`,
          weak: `D4 holds the rim and prepares for long corner rotations.`
        },
        r_corner: {
          onball: `D4 must sprint all the way from the block to close out the right corner—exposing the 3-2's main baseline weakness.`,
          help: `D2 drops toward the short-corner/wing line to help; D5 must slide across to guard the entire paint/rim.`,
          weak: `D1 and D3 collapse toward the elbows to deter high-post flashes and intercept skip passes.`
        },
        l_corner: {
          onball: `D5 sprints out to close out the left corner shooter while D4 slides across the lane to protect the rim.`,
          help: `D3 sinks to help on the left wing/elbow; D1 and D2 cover the middle and weakside skip.`,
          weak: `Long diagonal skip passes to the opposite corner force a desperate cross-paint sprint.`
        },
        high_post: {
          onball: `D1 digs down from the top while D4 and D5 step up from the blocks to bracket the high-post catch.`,
          help: `D2 and D3 stay wide on the 45° wings to prevent easy kickout 3-pointers.`,
          weak: `D4/D5 must communicate who seals the rim if an attacker dives behind them.`
        },
        short_corner: {
          onball: `D4 steps out to guard the short corner, forcing the offense away from the baseline.`,
          help: `D5 shifts to the middle of the lane to stop rim cuts; D2 drops to take away the wing outlet.`,
          weak: `D1 and D3 cover the high post and weakside shooters.`
        }
      },
      '131': {
        top: {
          onball: `D1 hounds the point guard aggressively, angling to force a slow lob pass to either wing.`,
          help: `D2, D5, and D3 form the horizontal 3-man wall across the free-throw line extended.`,
          weak: `D4 patrols the baseline under the basket, calling out cutters behind the middle line.`
        },
        r_wing: {
          onball: `D2 stops the wing catch and angles the ball toward the sideline as D1 sprints over to set a soft or hard wing trap.`,
          help: `D5 drops slightly to the ball-side mid-post; D4 sprints to the right baseline/corner to deny the baseline pass.`,
          weak: `D3 sinks to the weakside elbow/paint to anticipate and pick off long diagonal skip passes.`
        },
        l_wing: {
          onball: `D3 stops the left wing while D1 sprints to trap the sideline.`,
          help: `D5 guards the middle paint; D4 runs to the left baseline to cut off the corner pass.`,
          weak: `D2 sinks toward the right elbow to cover the cross-court skip.`
        },
        r_corner: {
          onball: `CORNER TRAP! D4 sprints up the baseline and D2 drops down to trap the right corner aggressively.`,
          help: `D5 fronts the ball-side block/paint to prevent a dump-off layup.`,
          weak: `D1 plays the wing passing lane while D3 drops deep into the paint—vulnerable only to a high skip pass to the opposite corner.`
        },
        l_corner: {
          onball: `CORNER TRAP! D4 and D3 converge to trap the left corner.`,
          help: `D5 fronts the left block; D1 denies the wing outlet.`,
          weak: `D2 drops deep to protect against weakside cuts and long skips.`
        },
        high_post: {
          onball: `D5 bodies the high-post catch immediately while D1 digs down from behind to disrupt the shooter's rhythm.`,
          help: `D2 and D3 hold the 45° wings so the high post cannot easily kick out for 3.`,
          weak: `D4 stays glued to the rim/baseline to deny any high-low dive behind D5.`
        },
        short_corner: {
          onball: `D4 and D5 squeeze the short corner together, taking away both baseline drive and rim dump.`,
          help: `D2 drops to deny the right wing outlet; D1 patrols the top passing lane.`,
          weak: `D3 sinks into the weakside lane to cover backdoor cuts and skips.`
        }
      }
    },

    // Offensive counter descriptions per Offense x Ball Spot
    offenseReads: {
      overload: {
        top: `Entry initiates the overload: O4 flashes to the high post while O5 prepares to slide along the baseline toward the ball side once the first pass goes to a wing.`,
        r_wing: `Classic 3-on-2 overload! O2 (wing), O3 (corner), and O5 (short corner) outnumber the two lower zone defenders on the right side while O4 occupies the middle.`,
        l_wing: `Left-side 3-on-2 overload: O3, O2 (corner), and O5 (short corner) force the lower defenders to choose between contesting the wing, corner, or short-corner dive.`,
        r_corner: `With the ball in the right corner, O5 seals inside or holds the short corner while O4 dives down the lane—forcing weakside help to over-rotate.`,
        l_corner: `Left corner catch stretches the baseline defender; look for O5 sealing the block or O4 flashing into the open mid-paint pocket.`,
        high_post: `High-post catch collapses the center of the zone. O5 dives behind the middle defender for a layup while O2 and O3 lift into clean 3-point sightlines.`,
        short_corner: `Ball in the short corner pulls the anchor/wing into a trap or split—read O4 diving down the middle of the lane or kick out to O3 in the corner.`
      },
      hilo: {
        top: `O1 probes the top to draw both guards up, opening the direct pocket pass to O4 at the free-throw line while O5 pins the weakside low defender.`,
        r_wing: `Wing entry opens a crisp angle to O4 at the ball-side elbow. As the center steps up to O4, O5 seals the opposite block for an immediate Hi-Lo lob.`,
        l_wing: `Left-wing angle feeds O4 at the left elbow; O5 seals the right block behind the shifting center for a quick high-low finish.`,
        r_corner: `Corner catch pulls the defense deep, opening the reversal back through O1/O4 or a quick skip to O3 if the weakside wing over-helps.`,
        l_corner: `Left corner stretches the zone horizontally; look for O4 flashing to the high post or O1 swinging the ball to O2 on the opposite arc.`,
        high_post: `THE KEY CATCH: O4 catches at the free-throw line. If the center guards 1-on-1, look immediately over the top to O5 sealing under the rim; if wings pinch, kick to O2/O3.`,
        short_corner: `Short-corner catch pulls the low defender off the block—O4 flashes into the middle seam while O3 spots up on the weakside for a skip 3.`
      },
      gap: {
        top: `O1 attacks the gap between the top defenders with dribble penetration, forcing two defenders to collapse and freeing O2 or O3 on the perimeter.`,
        r_wing: `O2 attacks the seam between top and wing, then reverses quickly through O1 to O3—moving the ball faster than the zone can close out.`,
        l_wing: `O3 probes the left gap; if defenders squeeze the drive, kick back to O1 for an immediate ball reversal to O2 or drop to O5 in the short corner.`,
        r_corner: `Corner catch draws the backline out. Hit O4 flashing to the mid-gap or fire a skip pass to O3 on the weakside wing before rotations arrive.`,
        l_corner: `Left corner stretches the defense; read the weakside skip pass to O2 or feed O5 flashing into the lane seam.`,
        high_post: `O4 flashes from the short corner into the high-post gap; wide 3-out spacing gives O2 and O3 clean catch-and-shoot windows if the top guards help.`,
        short_corner: `Short-corner catch breaks the backline horizontally; O5 dives to the rim from the opposite dunker spot while O3 lifts for a skip 3.`
      }
    },

    rules: [
      { num: `01`, title: `Hands Up Always`, body: `All five defenders keep hands up throughout every possession to shrink passing windows and eliminate quick, direct seam passes.` },
      { num: `02`, title: `Move on the Pass, Arrive on the Catch`, body: `Defenders must shift while the ball is in flight—the goal is to beat the ball to its destination and close out before the shooter catches.` },
      { num: `03`, title: `Constant Loud Communication`, body: `Because offensive players cut across zone boundaries and behind defenders, loud verbal callouts for cutters and screens are mandatory.` },
      { num: `04`, title: `1-on-1 in the Paint`, body: `When the ball enters high or low post, the center guards it 1-on-1. Tops fan out to shooters; wings pinch to blocks first, then widen out.` }
    ],

    matrix: [
      { id: `212`, name: `2-1-2 Zone`, center: `High Post / FT Line (mobile, shot-blocking athlete)`, mech: `Top bumps wing off; wings pinch inside-out on high post; short-corner traps`, pros: `Denies high post, immediate box-outs, stops early dribble penetration`, cons: `Vulnerable to multi-shooter overloads & lobs over smaller back wings` },
      { id: `23`, name: `2-3 Zone`, center: `Deep near rim (tall, less mobile rim protector)`, mech: `Low wing stunts wing until bumped diagonally by top guard; D5 clogs paint`, pros: `Maximum paint protection, strong rebounding, forces contested outside shots`, cons: `High post (FT line), corners, and 45° seams are initially open` },
      { id: `32`, name: `3-2 Zone`, center: `Two backline defenders splitting blocks & corners`, mech: `Three perimeter guards cover top & 45° wings directly without bumping`, pros: `Strong perimeter 3-point defense and ball pressure on the arc`, cons: `Corners and baseline stretched thin across only two lower defenders` },
      { id: `131`, name: `1-3-1 Zone`, center: `Middle hub at FT line + baseline runner (D4)`, mech: `Top chaser + wing traps on sidelines/corners; D4 sprints corner-to-corner`, pros: `Creates aggressive wing/corner traps and cross-court passing steals`, cons: `Exposed to rapid ball reversal, diagonal skip passes, and corner resets` }
    ],

    offPrinciples: [
      { num: `01`, title: `High-Post Entry`, body: `Catching at the free-throw line forces the zone center up, opening the High-Low pass under the rim, corner 3s, or an uncontested jumper.` },
      { num: `02`, title: `Strong-Side Overload`, body: `Stacking 3–4 attackers on one side (45° wing, corner, short corner) creates a 3-on-2 numerical advantage against the two low defenders.` },
      { num: `03`, title: `Short Corner Exploitation`, body: `Positioning a player outside the paint near the baseline splits the bottom line of the zone and forces wing defenders off the 3-point arc.` },
      { num: `04`, title: `Ball Reversal & Skip Passes`, body: `The ball travels faster than defenders can run. Quick top reversals or diagonal skip passes create open 3s before rotations complete.` },
      { num: `05`, title: `Penetrate the Gaps`, body: `Attack the seams between two zone defenders rather than dribbling straight at one man, forcing two defenders to commit for drive-and-kick reads.` }
    ]
  },

  // =======================================================================
  // ITALIAN (IT)
  // =======================================================================
  it: {
    badge: `SIMULATORE TATTICO`,
    meta: `SISTEMI A ZONA · 2-1-2 · 2-3 · 3-2 · 1-3-1`,
    title: `Lavagna Tattica: Difese a Zona e Attacchi Contro Zona`,
    subtitle: `Simulatore interattivo a metà campo per rotazioni difensive, meccanismi di bump-off, copertura del post alto e principi di attacco alla zona.`,
    lblDefense: `Sistema Difensivo`,
    lblOffense: `Schema d'Attacco`,
    lblOverlays: `Livelli Visivi`,
    defNames: { '212': `Zona 2-1-2`, '23': `Zona 2-3`, '32': `Zona 3-2`, '131': `Zona 1-3-1` },
    buzzLabel: `Variante Buzz`,
    offNames: { overload: `Overload 1-3-1`, hilo: `Attacco High-Low`, gap: `3-Out 2-In & Gap` },
    ovNames: { zones: `Aree di Copertura`, rotations: `Frecce Rotazione`, lanes: `Linee di Passaggio` },
    courtTitle: `Simulatore Metà Campo`,
    spotNames: {
      top: `Punta / Guardia`,
      r_wing: `Ala Destra`,
      l_wing: `Ala Sinistra`,
      r_corner: `Angolo Destro`,
      l_corner: `Angolo Sinistro`,
      high_post: `Post Alto (Lunetta)`,
      short_corner: `Angolo Corto`
    },
    ballPrefix: `Palla:`,
    playSeq: `Simula Circolazione`,
    pauseSeq: `Pausa Demo`,
    stepSeq: `Prossimo Passaggio`,
    resetBtn: `Ripristina`,
    seqHint: `Clicca una posizione sul campo o un giocatore`,
    seqPlaying: `Simulazione rotazione difensiva in corso…`,
    legDef: `D1–D5 Difensori`,
    legOff: `O1–O5 Attaccanti`,
    legBall: `Pallone`,
    legRot: `Spostamento Difesa`,
    legPass: `Lettura Passaggio`,
    annHighPost: `POST ALTO`,
    annShortCorner: `ANGOLO CORTO`,
    annPaint: `AREA`,
    buzzLineLabel: `LINEA PALLAVOLO (PRESSING BUZZ)`,
    coachTitle: `Analisi Tattica in Tempo Reale`,
    focusRole: `Lettura Sistema`,
    hOnBall: `Difensore Primario sulla Palla`,
    hHelp: `Centro Area & Rotazione d'Aiuto`,
    hWeak: `Lato Debole, Taglio & Rimbalzo`,
    hOffense: `Lettura Offensiva & Contromossa`,
    inspTitle: `Dettaglio Ruolo Giocatore`,
    sysNoteTitle: `Profilo del Sistema & Rischio Chiave`,
    secRulesTitle: `Quattro Regole Fondamentali della Zona & Note Tecniche`,
    secMatrixTitle: `Matrice Comparativa delle Difese a Zona`,
    secOffTitle: `Principi Fondamentali per Attaccare la Zona`,
    thSys: `Sistema`,
    thCenter: `Centro / Perno`,
    thMech: `Meccanica di Rotazione`,
    thPros: `Punti di Forza`,
    thCons: `Punti Deboli`,
    advYouthTitle: `Idoneità Atleti & Settore Giovanile`,
    advYouthBody: `La 2-1-2 richiede un centro lungo, atletico e stoppatore capace di coprire dalla lunetta fino al ferro. Evitare la zona 2-1-2 nel basket giovanile: pur frenando gli attacchi, lo sviluppo tecnico richiede i principi della difesa individuale a uomo.`,
    advBuzzTitle: `Variante Aggressiva: 2-1-2 Buzz`,
    advBuzzBody: `Nella Buzz i due alti prendono il portatore alla linea della pallavolo con mani interne attive per forzare passaggi lenti in ala. Il centro resta a ~4,5 metri dal ferro sulla linea palla-canestro mentre gli esterni giocano sulle linee di passaggio.`,
    footerSources: `Contenuti tratti dalle guide tecniche: 2-1-2 Zone Defense Complete Coaching Guide e Rapporto Comparativo Difese a Zona (2-3, 2-1-2, 3-2, 1-3-1).`,
    backToSection: `Materiali didattici`,

    playerRoles: {
      '212': {
        D1: `D1 · Guardia Alta Sinistra — Copre sopra il prolungamento del tiro libero, finta in punta, esegue il bump-off sull'ala sinistra e scende al gomito/area su palla in angolo.`,
        D2: `D2 · Guardia Alta Destra — Controlla il lato destro alto, scatta per rilevare D4 in ala destra (bump-off), nega il post alto dal gomito e allarga il closeout sul ribaltamento.`,
        D3: `D3 · Ala Bassa Sinistra — Responsabile sotto la linea del tiro libero a sinistra; contiene temporaneamente l'ala prima del cambio con D1, chiude l'angolo e protegge dai lob sul lato debole.`,
        D4: `D4 · Ala Bassa Destra — Copre angolo e short corner destro; esce in ala fino all'arrivo di D2, raddoppia l'angolo corto con D5 da dietro e chiude i blocchi su palla in post alto.`,
        D5: `D5 · Centro Mobile (Perno) — L'ago della bilancia. Parte in post alto per negare ricezioni centrali, ferma presto le penetrazioni, difende 1-contro-1 in area e avvia il trap in short corner.`
      },
      '23': {
        D1: `D1 · Guardia Alta Sinistra — Presidia il perimetro alto sinistro, rileva D3 in ala sinistra e scende in lunetta quando la palla va sul lato opposto.`,
        D2: `D2 · Guardia Alta Destra — Presidia il lato alto destro, esegue il bump-off su D4 in ala destra e aiuta a chiudere la linea di passaggio in post alto.`,
        D3: `D3 · Ala Bassa Sinistra — Copre angolo sinistro e blocco basso, esce brevemente sull'ala finché D1 non scivola in copertura, protegge il ferro dal lato debole.`,
        D4: `D4 · Ala Bassa Destra — Copre angolo destro e short corner, contiene temporaneamente l'ala destra in attesa della rotazione di D2.`,
        D5: `D5 · Centro d'Area — Ancorato vicino al ferro per proteggere il pitturato e garantire il rimbalzo; esce sul post alto solo dopo la ricezione.`
      },
      '32': {
        D1: `D1 · Difensore Centrale Alto — Fa pressione sulla punta e scivola verso i gap sul perimetro per togliere ritmo al tiro da tre punti.`,
        D2: `D2 · Ala Destra — Difensore perimetrale dedicato ai 45° destri; contesta direttamente i tiratori in ala senza bisogno di bump-off.`,
        D3: `D3 · Ala Sinistra — Difensore perimetrale dedicato ai 45° sinistri; segue i tiratori e scende al gomito su palla sul lato opposto.`,
        D4: `D4 · Lungo Basso Destro — Protegge il blocco basso destro e deve coprire in corsa fino all'angolo destro.`,
        D5: `D5 · Lungo Basso Sinistro — Protegge il lato sinistro dell'area e chiude i tiri dall'angolo sinistro.`
      },
      '131': {
        D1: `D1 · Inseguitore Alto (Chaser) — Mette pressione sul playmaker, indirizza il gioco verso le linee laterali e scatta per raddoppiare le ali con D2 o D3.`,
        D2: `D2 · Ala Destra — Presidia la fascia destra; raddoppia l'ala destra con D1 e l'angolo destro con il corridore di fondo D4.`,
        D3: `D3 · Ala Sinistra — Presidia la fascia sinistra; raddoppia in ala/angolo sinistro e scivola sul gomito debole per intercettare gli skip pass.`,
        D4: `D4 · Corridore di Fondo — Corre da un angolo all'altro lungo la linea di fondo; raddoppia negli angoli con le ali e nega i tagli sul fondo.`,
        D5: `D5 · Centro / Perno — Governa il post alto; anticipa i ricevitori centrali, chiude le penetrazioni e protegge il ferro durante i trap in angolo.`
      },
      off: {
        O1: `O1 · Playmaker — Gestisce il ritmo in punta, innesca i ribaltamenti rapidi, attacca i gap tra i difensori e lancia skip pass più veloci delle rotazioni.`,
        O2: `O2 · Guardia / Tiratore — Allarga il lato destro, crea sovraccarichi 3-contro-2 in ala/angolo e si fa trovare pronto sugli scarichi da penetrazione.`,
        O3: `O3 · Ala Lato Debole — Mantiene l'ampiezza sul lato opposto per tiri da tre su skip pass o completa il sovraccarico nell'angolo forte.`,
        O4: `O4 · Ala Grande in Post Alto — Taglia in lunetta per spaccare il cuore della zona, cercando il tiro fronte a canestro, il passaggio High-Low o lo scarico.`,
        O5: `O5 · Lungo in Area / Short Corner — Sigilla il blocco basso per ricevere l'High-Low oppure si muove nello short corner per dividere i lunghi difensivi.`
      }
    },

    systemProfiles: {
      '212': `Classica disposizione a "X" o busta. Posizionare D5 in post alto nega il cuore dell'area, facilita i tagliafuori e ferma le penetrazioni sul nascere—ma espone gli esterni bassi a lob sopra la testa e sovraccarichi sul perimetro.`,
      '212_buzz': `Variante ad alta pressione (Buzz). Le guardie alte pressano alla linea della pallavolo per forzare passaggi lenti in ala; D5 resta a 4,5 m dal ferro in asse palla-canestro e gli esterni anticipano le linee di passaggio.`,
      '23': `Fortezza d'area. D5 presidia stabilmente il ferro garantendo rimbalzi e protezione interna, ma lasciando scoperti il post alto (lunetta) e i gap a 45° prima delle rotazioni.`,
      '32': `Difesa perimetrale a tre uomini eccellente contro squadre di tiratori da tre punti, ma lascia solo due lunghi bassi a coprire l'area ed entrambi gli angoli.`,
      '131': `Zona a diamante aggressiva nata per provocare palle perse con raddoppi in ala e negli angoli. Esposta a ribaltamenti rapidi e lunghi skip pass diagonali sul lato debole.`
    },

    tactics: {
      '212': {
        top: {
          onball: `D1 e D2 controllano la punta insieme, fintando verso la palla senza scoprirsi troppo per restare vicini alle ali e chiudere la linea per il post alto.`,
          help: `D5 presidia il post alto alle spalle del tagliante (o anticipa a 3/4 se pericoloso). Senza post alto, D5 arretra leggermente a centro area pronto sui tagli.`,
          weak: `D3 e D4 salgono leggermente sopra i blocchi bassi, pronti a uscire temporaneamente sull'ala finché D1 o D2 non li rilevano.`
        },
        r_wing: {
          onball: `D4 finta/prende l'ala destra finché D2 non scatta a rilevarlo (bump-off). D4 scivola poi verso il fondo restando abbastanza largo per chiudere l'angolo.`,
          help: `D1 scende verso la lunetta per chiudere la linea di passaggio in post alto, permettendo a D5 di abbassarsi verso il blocco forte.`,
          weak: `D3 si stringe vicino al ferro sul lato debole per sventare lob sopra la difesa ed essere pronto sullo skip pass.`
        },
        l_wing: {
          onball: `D3 contiene brevemente l'ala sinistra finché D1 non scatta a rilevarlo, spingendo D3 verso il fondo e la copertura dell'angolo sinistro.`,
          help: `D2 scende in lunetta per negare il post alto; D5 scivola a proteggere il blocco basso sul lato palla.`,
          weak: `D4 entra in aiuto vicino al ferro per difendere dai lob e leggere eventuali tagli dal lato debole.`
        },
        r_corner: {
          onball: `D4 esegue un closeout aggressivo sull'angolo destro togliendo il tiro da tre e sigillando la linea di fondo.`,
          help: `D2 scende al gomito lato palla per negare il post alto; D5 anticipa il blocco basso forte per bloccare ingressi e penetrazioni.`,
          weak: `D1 scende a centro area pronto a coprire lo skip pass; D3 presidia il pitturato contro i lob.`
        },
        l_corner: {
          onball: `D3 chiude forte il tiratore in angolo sinistro negando l'attacco lungo la linea di fondo.`,
          help: `D1 scende al gomito sinistro; D5 anticipa il blocco basso sinistro.`,
          weak: `D2 scende al centro dell'area per leggere lo skip pass; D4 protegge il ferro dai lob.`
        },
        high_post: {
          onball: `D5 marca il ricevitore in post alto 1-contro-1 come a uomo, sfruttando altezza e atletismo per contestare tiro e visione.`,
          help: `D1 e D2 NON devono collassare sulla palla (lascerebbero tiri da tre facili): si allargano subito per trovare i tiratori sul perimetro.`,
          weak: `D3 e D4 giocano dentro-fuori: stringono prima sui blocchi per togliere il passaggio High-Low, poi si riaprono verso gli esterni.`
        },
        short_corner: {
          onball: `RADDOPPIO (TRAP)! D5 avvia il trap sull'angolo corto chiudendo il fondo e D4 completa la trappola da dietro.`,
          help: `D2 sale leggermente verso l'ala destra per togliere lo scarico facile lungo la fascia.`,
          weak: `D3 scatta a centro area per fermare i tagli al ferro; D1 gioca da "libero" a centro campo per intercettare lo skip pass.`
        }
      },
      '23': {
        top: {
          onball: `D1 e D2 schermano il portatore sopra la linea del tiro libero, tenendo le mani alte per oscurare i passaggi diretti in lunetta.`,
          help: `D5 resta ancorato vicino al ferro per chiudere l'area e prendere posizione a rimbalzo, lasciando il post alto aperto fino alla ricezione.`,
          weak: `D3 e D4 presidiano i blocchi bassi, pronti a uscire temporaneamente sulle ali fino al bump-off dei due alti.`
        },
        r_wing: {
          onball: `D4 esce subito sull'ala destra mentre D2 scivola in diagonale per rilevarlo (bump-off) e prendere la palla.`,
          help: `Dopo il cambio, D4 scende a coprire l'angolo destro; D5 si sposta sul blocco lato palla e D1 scende verso il gomito.`,
          weak: `D3 collassa a centro area per proteggere il ferro e controllare i tagli dal lato debole.`
        },
        l_wing: {
          onball: `D3 esce sull'ala sinistra finché D1 non scivola a rilevarlo, riportando D3 verso l'angolo sinistro.`,
          help: `D5 si sposta sul blocco sinistro; D2 scende in lunetta per contrastare i tagli in post alto.`,
          weak: `D4 protegge il ferro dal lato debole ed è pronto sul ribaltamento.`
        },
        r_corner: {
          onball: `D4 chiude l'angolo destro orientando l'attaccante lontano dalla linea di fondo.`,
          help: `D5 anticipa il post basso lato palla; D2 scende sul gomito/short corner in aiuto.`,
          weak: `D1 scende al centro dell'area per lo skip pass; D3 protegge il ferro dai tagli.`
        },
        l_corner: {
          onball: `D3 chiude l'angolo sinistro; D5 anticipa il blocco sinistro.`,
          help: `D1 scende sul gomito sinistro; D2 copre il centro area.`,
          weak: `D4 protegge il ferro e chiude il rimbalzo sul lato debole.`
        },
        high_post: {
          onball: `D5 deve uscire dal ferro per contestare la lunetta, esponendo la classica vulnerabilità alle sue spalle.`,
          help: `D3 e D4 stringono verso il ferro per negare il passaggio High-Low e i tagli al canestro.`,
          weak: `D1 e D2 si abbassano leggermente per sporcare la ricezione e recuperare poi sui tiratori.`
        },
        short_corner: {
          onball: `D4 esce sull'angolo corto chiudendo la penetrazione di fondo.`,
          help: `D5 protegge il blocco lato palla e il ferro; D2 scende verso l'ala per negare lo scarico.`,
          weak: `D3 tiene il centro area per rimbalzi e tagli; D1 controlla punta e skip.`
        }
      },
      '32': {
        top: {
          onball: `D1 pressa la palla in punta mentre D2 e D3 restano incollati ai tiratori a 45° formando un muro perimetrale.`,
          help: `D4 e D5 presidiano i due blocchi bassi comunicando continuamente i tagli in area.`,
          weak: `Con tre giocatori alti, D4 e D5 devono coprire da soli tutta l'area e entrambi gli angoli.`
        },
        r_wing: {
          onball: `D2 contesta subito l'ala destra senza necessità di cambi o bump-off.`,
          help: `D1 chiude il gap verso la punta; D4 scivola verso lo short corner destro.`,
          weak: `D3 scende verso il post alto; D5 protegge da solo il canestro dai tagli centrali.`
        },
        l_wing: {
          onball: `D3 contesta direttamente l'ala sinistra mentre D1 chiude il gap alto sinistro.`,
          help: `D5 scivola sul blocco sinistro; D2 scende verso la lunetta.`,
          weak: `D4 protegge il ferro pronto alle rotazioni lunghe verso l'angolo.`
        },
        r_corner: {
          onball: `D4 deve correre dal blocco fino all'angolo destro per contestare il tiro—mostrando la fragilità della 3-2 sul fondo.`,
          help: `D2 scende verso ala/short corner in aiuto; D5 deve coprire tutta l'area da solo.`,
          weak: `D1 e D3 stringono verso i gomiti per chiudere il post alto e leggere lo skip pass.`
        },
        l_corner: {
          onball: `D5 corre nell'angolo sinistro mentre D4 scivola attraverso l'area per proteggere il ferro.`,
          help: `D3 aiuta sull'ala sinistra; D1 e D2 controllano il centro e lo skip sul lato debole.`,
          weak: `Uno skip pass veloce sull'angolo opposto costringe il lungo a un recupero quasi impossibile.`
        },
        high_post: {
          onball: `D1 sporca da sopra mentre D4 e D5 salgono dai blocchi per chiudere a tenaglia il post alto.`,
          help: `D2 e D3 restano larghi sulle ali a 45° per togliere gli scarichi da tre punti.`,
          weak: `D4 e D5 devono comunicare chi resta al ferro su eventuali tagli alle spalle.`
        },
        short_corner: {
          onball: `D4 esce sull'angolo corto negando la linea di fondo.`,
          help: `D5 tiene il centro dell'area per fermare i tagli al ferro; D2 nega il ritorno in ala.`,
          weak: `D1 e D3 coprono il post alto e i tiratori sul lato debole.`
        }
      },
      '131': {
        top: {
          onball: `D1 aggredisce il playmaker indirizzandolo verso una delle due linee laterali.`,
          help: `D2, D5 e D3 formano la linea mediana orizzontale all'altezza del tiro libero.`,
          weak: `D4 pattuglia la linea di fondo sotto canestro chiamando tutti i tagli alle spalle.`
        },
        r_wing: {
          onball: `D2 ferma la palla in ala destra orientandola verso la linea laterale mentre D1 scatta per impostare il raddoppio (trap).`,
          help: `D5 scivola sul post medio lato palla; D4 corre sul fondo destro per negare il passaggio in angolo.`,
          weak: `D3 scende al gomito debole pronto a intercettare lunghi skip pass diagonali.`
        },
        l_wing: {
          onball: `D3 contiene l'ala sinistra mentre D1 scatta per raddoppiare sulla linea laterale.`,
          help: `D5 controlla il centro dell'area; D4 corre sul fondo sinistro per chiudere l'angolo.`,
          weak: `D2 scivola verso il gomito destro leggendo il cambio di lato.`
        },
        r_corner: {
          onball: `TRAPPOLA IN ANGOLO! D4 risale dal fondo e D2 scende dall'ala per raddoppiare aggressivamente in angolo destro.`,
          help: `D5 anticipa il blocco lato palla per impedire il passaggio ravvicinato sotto canestro.`,
          weak: `D1 gioca sulla linea di passaggio in ala e D3 scende in area—vulnerabile solo allo skip lungo nell'angolo opposto.`
        },
        l_corner: {
          onball: `TRAPPOLA IN ANGOLO! D4 e D3 convergono a raddoppiare nell'angolo sinistro.`,
          help: `D5 anticipa il blocco sinistro; D1 nega il passaggio di uscita in ala.`,
          weak: `D2 protegge il pitturato e le rotazioni sul lato debole.`
        },
        high_post: {
          onball: `D5 contesta immediatamente il post alto 1-contro-1 mentre D1 scende da dietro per sporcare il palleggio e la visione.`,
          help: `D2 e D3 restano larghi sulle ali a 45° per togliere il tiro da tre.`,
          weak: `D4 resta incollato al ferro e alla linea di fondo per fermare i tagli alle spalle di D5.`
        },
        short_corner: {
          onball: `D4 e D5 chiudono a tenaglia l'angolo corto togliendo sia il fondo che lo scarico al ferro.`,
          help: `D2 chiude il ritorno in ala destra; D1 pattuglia la linea di passaggio alta.`,
          weak: `D3 protegge l'area debole dai tagli e dagli skip pass.`
        }
      }
    },

    offenseReads: {
      overload: {
        top: `L'azione parte con O4 che taglia in post alto mentre O5 si prepara a scivolare lungo il fondo sul lato della palla appena parte il passaggio in ala.`,
        r_wing: `Classico sovraccarico 3-contro-2! O2 (ala), O3 (angolo) e O5 (short corner) creano superiorità numerica contro due difensori bassi mentre O4 fissa il centro.`,
        l_wing: `Sovraccarico 3-contro-2 a sinistra: O3, O2 (angolo) e O5 (short corner) costringono la difesa bassa a scegliere chi lasciare libero.`,
        r_corner: `Con la palla in angolo destro, O5 sigilla il centro o lo short corner mentre O4 taglia in area costringendo l'aiuto debole a ruotare in ritardo.`,
        l_corner: `L'angolo sinistro allunga il difensore di fondo: cerca O5 sul blocco basso o O4 nella sacca centrale lasciata libera.`,
        high_post: `La ricezione in lunetta attrae il centro della zona: O5 taglia alle spalle per l'appoggio facile mentre O2 e O3 si allargano sul perimetro.`,
        short_corner: `Palla nello short corner spacca la linea bassa o provoca il trap: leggi il taglio di O4 a centro area o lo scarico immediato a O3 in angolo.`
      },
      hilo: {
        top: `O1 attacca la punta per alzare le guardie e aprire la linea di passaggio verso O4 in lunetta mentre O5 sigilla il blocco debole.`,
        r_wing: `Dall'ala destra si apre l'angolo ottimale per servire O4 al gomito: appena il centro esce su O4, O5 sigilla il blocco opposto per il lob High-Low.`,
        l_wing: `Passaggio dall'ala sinistra a O4 al gomito sinistro; O5 prende posizione profonda sul blocco destro alle spalle del centro.`,
        r_corner: `La palla in angolo attrae la difesa sul fondo aprendo il ribaltamento verso O1/O4 o lo skip diretto verso O3 sul lato debole.`,
        l_corner: `L'angolo sinistro allunga la zona: cerca il taglio in post alto di O4 o il cambio lato veloce per O2.`,
        high_post: `RICEZIONE CHIAVE: O4 riceve in lunetta. Se il centro marca 1-contro-1 cerca subito O5 sotto canestro; se gli esterni stringono, scarica a O2 o O3.`,
        short_corner: `Palla in short corner attira il difensore basso lontano dal ferro: O4 taglia nel cuore dell'area mentre O3 è pronto sullo skip da tre punti.`
      },
      gap: {
        top: `O1 penetra nel gap tra le due guardie alte costringendole a chiudere e liberando i tiratori O2 e O3 sul perimetro.`,
        r_wing: `O2 attacca il varco tra ala e punta, poi ribalta subito via O1 verso O3 muovendo la palla più velocemente della rotazione difensiva.`,
        l_wing: `O3 attacca il gap sinistro: se la difesa collassa, scarico immediato a O1 per il ribaltamento su O2 o appoggio a O5 nello short corner.`,
        r_corner: `La ricezione in angolo tira fuori il lungo basso: cerca O4 nel gap centrale o uno skip pass diretto su O3 prima che la zona recuperi.`,
        l_corner: `L'angolo sinistro allarga la difesa: leggi lo skip pass su O2 oppure servi O5 che taglia nello spazio libero in area.`,
        high_post: `O4 sale dallo short corner nel varco centrale della lunetta; la spaziatura 3-Out garantisce tiri puliti a O2 e O3 su ogni aiuto.`,
        short_corner: `La palla in short corner spezza la seconda linea difensiva: O5 taglia al ferro dal lato opposto mentre O3 si alza per lo skip da tre.`
      }
    },

    rules: [
      { num: `01`, title: `Mani Sempre Alte`, body: `Tutti e cinque i difensori mantengono le mani alte per l'intero possesso per ridurre le finestre di passaggio e impedire passaggi diretti.` },
      { num: `02`, title: `Muoversi sul Passaggio, Arrivare sulla Presa`, body: `La difesa deve muoversi mentre la palla è in volo: l'obiettivo è anticipare la ricezione e chiudere il closeout prima del tiro.` },
      { num: `03`, title: `Comunicazione Costante`, body: `In zona gli attaccanti cambiano continuamente settore: chiamare ad alta voce tagli alle spalle e blocchi è vitale per non concedere canestri facili.` },
      { num: `04`, title: `1-contro-1 nel Pitturato`, body: `Se la palla entra in post alto o basso, il centro difende 1-contro-1. Gli alti si allargano sui tiratori; le ali stringono prima sui blocchi e poi escono.` }
    ],

    matrix: [
      { id: `212`, name: `Zona 2-1-2`, center: `Post Alto / Lunetta (lungo mobile e stoppatore)`, mech: `Bump-off sull'ala; ali dentro-fuori su post alto; trap nello short corner`, pros: `Chiude il post alto, tagliafuori immediato, ferma presto le penetrazioni`, cons: `Vulnerabile a sovraccarichi di tiratori e lob sopra le ali basse` },
      { id: `23`, name: `Zona 2-3`, center: `Vicino al ferro (lungo d'area puro)`, mech: `L'ala bassa esce sul lato finché la guardia non la rileva in diagonale (bump-off)`, pros: `Massima protezione dell'area, rimbalzi solidi, forza tiri da fuori`, cons: `Post alto (lunetta), angoli e varchi a 45° restano inizialmente aperti` },
      { id: `32`, name: `Zona 3-2`, center: `Due lunghi bassi tra blocchi e angoli`, mech: `Tre esterni presidiano punta e ali a 45° direttamente senza cambi`, pros: `Ottima pressione sul perimetro e neutralizzazione dei tiratori da 3`, cons: `Angoli e linea di fondo molto esposti con soli due difensori bassi` },
      { id: `131`, name: `Zona 1-3-1`, center: `Perno in lunetta + corridore di fondo (D4)`, mech: `Chaser alto + raddoppi aggressivi in ala/angolo; D4 corre lungo il fondo`, pros: `Genera trap efficaci sulle fasce e recuperi sui passaggi diagonali`, cons: `Soffre i ribaltamenti veloci, gli skip pass lunghi e i tiri dagli angoli` }
    ],

    offPrinciples: [
      { num: `01`, title: `Attacco al Post Alto`, body: `Ricevere in lunetta costringe il centro a uscire, aprendo il passaggio High-Low sotto canestro, lo scarico in angolo o il tiro dalla media.` },
      { num: `02`, title: `Sovraccarico (Overload)`, body: `Portare 3 o 4 attaccanti sullo stesso lato (45°, angolo, short corner) crea una superiorità numerica 3-contro-2 sui due difensori bassi.` },
      { num: `03`, title: `Uso dello Short Corner`, body: `Piazzare un uomo tra linea del tiro libero e fondo fuori dall'area spezza la seconda linea e obbliga l'ala bassa a lasciare il perimetro.` },
      { num: `04`, title: `Ribaltamento Rapido (Skip Pass)`, body: `La palla viaggia più veloce dei difensori: un giro palla rapido o uno skip pass diagonale creano tiri aperti prima che la zona completi la rotazione.` },
      { num: `05`, title: `Attaccare i Gap`, body: `Penetrare nei varchi tra due difensori anziché puntare l'uomo costringe due avversari a chiudere, liberando il tiratore (Drive & Kick).` }
    ]
  },

  // =======================================================================
  // UKRAINIAN (UK)
  // =======================================================================
  uk: {
    badge: `ТАКТИЧНИЙ СИМУЛЯТОР`,
    meta: `ЗОННІ ЗАХИСТИ · 2-1-2 · 2-3 · 3-2 · 1-3-1`,
    title: `Тактична дошка: Зонні захисти та напад проти зони`,
    subtitle: `Інтерактивний симулятор півмайданчика для ротацій зонного захисту, механіки зміщення (bump-off), контролю хай-поста та схем атаки проти зони.`,
    lblDefense: `Система захисту`,
    lblOffense: `Схема нападу`,
    lblOverlays: `Шари візуалізації`,
    defNames: { '212': `Зона 2-1-2`, '23': `Зона 2-3`, '32': `Зона 3-2`, '131': `Зона 1-3-1` },
    buzzLabel: `Пресинг Buzz`,
    offNames: { overload: `Перевантаження 1-3-1`, hilo: `Атака High-Low`, gap: `3-Out 2-In і Зазори` },
    ovNames: { zones: `Зони відповідальності`, rotations: `Стрілки ротації`, lanes: `Лінії передач` },
    courtTitle: `Симулятор півмайданчика`,
    spotNames: {
      top: `Верхівка дуги`,
      r_wing: `Правий фланг`,
      l_wing: `Лівий фланг`,
      r_corner: `Правий кут`,
      l_corner: `Лівий кут`,
      high_post: `Хай-пост (Штрафна)`,
      short_corner: `Шорт-корнер`
    },
    ballPrefix: `М'яч:`,
    playSeq: `Запустити комбінацію`,
    pauseSeq: `Пауза демо`,
    stepSeq: `Наступний пас`,
    resetBtn: `Скинути`,
    seqHint: `Натисніть точку на майданчику або гравця для розбору`,
    seqPlaying: `Симуляція руху м'яча та ротацій…`,
    legDef: `D1–D5 Захисники`,
    legOff: `O1–O5 Нападники`,
    legBall: `Баскетбольний м'яч`,
    legRot: `Зміщення захисту`,
    legPass: `Варіант передачі`,
    annHighPost: `ХАЙ-ПОСТ`,
    annShortCorner: `ШОРТ-КОРНЕР`,
    annPaint: `ФАРБА`,
    buzzLineLabel: `ВОЛЕЙБОЛЬНА ЛІНІЯ (BUZZ)`,
    coachTitle: `Тактичний розбір позиції`,
    focusRole: `Аналіз системи`,
    hOnBall: `Перший захисник на м'ячі`,
    hHelp: `Центровий та ротація підстраховки`,
    hWeak: `Слабкий бік, навіси та підбір`,
    hOffense: `Рішення нападу та контратака`,
    inspTitle: `Фокус на ролі гравця`,
    sysNoteTitle: `Профіль системи та головний ризик`,
    secRulesTitle: `Чотири головні правила зонного захисту та нюанси`,
    secMatrixTitle: `Порівняльна матриця зонних захистів`,
    secOffTitle: `Фундаментальні принципи нападу проти зони`,
    thSys: `Система`,
    thCenter: `Центровий / Якір`,
    thMech: `Ключова механіка ротації`,
    thPros: `Сильні сторони`,
    thCons: `Слабкі місця`,
    advYouthTitle: `Підбір виконавців і дитячий баскетбол`,
    advYouthBody: `Для 2-1-2 потрібен довгий, атлетичний центровий, здатний блокувати кидки і встигати від лінії штрафу до кільця. Не використовуйте 2-1-2 у юнацькому баскетболі: це гальмує розвиток гравців, яким необхідна база персонального захисту.`,
    advBuzzTitle: `Варіація пресингу 2-1-2 Buzz`,
    advBuzzBody: `У системі Buzz верхні захисники зустрічають м'яч біля волейбольної лінії, перекриваючи лінії передач, щоб змусити напад робити повільний пас на фланг. Центровий тримається за ~4,5 м від кільця на осі м'яч-кошик.`,
    footerSources: `Матеріали підготовлено на основі джерел: 2-1-2 Zone Defense Complete Coaching Guide та Звіт щодо зонних захистів і нападу проти них (2-3, 2-1-2, 3-2, 1-3-1).`,
    backToSection: `Навчальні матеріали`,

    playerRoles: {
      '212': {
        D1: `D1 · Лівий верхній захисник — Контролює ліву половину дуги, імітує тиск на розігруючого, витісняє D3 з лівого флангу (bump-off) та опускається на лікоть при пасі в кут.`,
        D2: `D2 · Правий верхній захисник — Закриває правий верх периметра, прискорюється для зміни D4 на правому фланзі, перекриває пас у хай-пост і широко закриває розворот м'яча.`,
        D3: `D3 · Лівий нижній фланг — Відповідає за зону нижче лінії штрафу зліва, тимчасово зустрічає фланг до приходу D1, закриває лівий кут і страхує кільце від навісів.`,
        D4: `D4 · Правий нижній фланг — Закриває правий кут і шорт-корнер; виходить на фланг до зміни з D2, ставить пастку з D5 у шорт-корнері та стискає блоки при вході в хай-пост.`,
        D5: `D5 · Центровий (Ключовий гравець) — Розташовується високо в хай-пості, блокує передачі в центр, рано зупиняє проходи, грає 1-в-1 у «фарбі» та ініціює пастки в шорт-корнері.`
      },
      '23': {
        D1: `D1 · Лівий верхній захисник — Опікає лівий периметр, змінює D3 на лівому фланзі, опускається до штрафної лінії при переводі м'яча направо.`,
        D2: `D2 · Правий верхній захисник — Опікає правий периметр, змінює D4 на правому фланзі та перекриває лінію передачі в хай-пост.`,
        D3: `D3 · Лівий нижній захисник — Закриває лівий кут і блок, тимчасово виходить на фланг до діагонального зміщення D1, страхує кільце зі слабкого боку.`,
        D4: `D4 · Правий нижній захисник — Закриває правий кут і шорт-корнер, зустрічає правий фланг до приходу D2.`,
        D5: `D5 · Центровий під кільцем — Утримує трисекундну зону та підбір під своїм щитом; виходить на хай-пост лише після прийому м'яча.`
      },
      '32': {
        D1: `D1 · Центральний на дузі — Тисне на розігруючого зверху та зміщується в зазори по дузі для зриву триочкових кидків.`,
        D2: `D2 · Правий вінг — Опікає правий фланг під 45° безпосередньо, без необхідності зміни знизу.`,
        D3: `D3 · Лівий вінг — Опікає лівий фланг під 45°, щільно тримає снайперів і страхує лікоть при пасі на протилежний бік.`,
        D4: `D4 · Правий нижній захисник — Закриває правий блок, «фарбу» та змушений вибігати аж у правий кут.`,
        D5: `D5 · Лівий нижній захисник — Захищає лівий блок, кільце і накриває кидки з лівого кута.`
      },
      '131': {
        D1: `D1 · Верхній переслідувач — Агресивно тисне на розігруючого, спрямовує паси до бокової лінії та біжить у пастку на фланг разом із D2 або D3.`,
        D2: `D2 · Правий фланг — Грає в середній лінії справа; ставить пастки на правому фланзі з D1 та в правому куті з бігуном D4.`,
        D3: `D3 · Лівий фланг — Грає в середній лінії зліва; бере участь у пастках зліва та перехоплює діагональні скіп-паси на слабкому боці.`,
        D4: `D4 · Гравець лицьової лінії — Курсує від кута до кута по лицьовій, ставить пастки в кутах із флангами та перекриває врізання під кільце.`,
        D5: `D5 · Центровий у середині — Патрулює хай-пост, перекриває входи в трисекундну зону та захищає кільце під час кутових пасток.`
      },
      off: {
        O1: `O1 · Розігруючий — Задає темп зверху, робить швидкий розворот м'яча (reversal), атакує зазори та віддає скіп-паси швидше за ротацію зони.`,
        O2: `O2 · Атакуючий захисник — Розтягує правий фланг/кут, створює перевантаження 3-проти-2 та відкривається під знижку після проходу.`,
        O3: `O3 · Снайпер слабкого боку — Тримає ширину на слабкому фланзі для скіп-пасів під 3-очковий або зміщується в сильний кут при перевантаженні.`,
        O4: `O4 · Форвард у хай-пості — Вривається на лінію штрафу, щоб розбити центр зони кидком, передачею High-Low або знижкою на дугу.`,
        O5: `O5 · Центровий — Бореться за позицію під кільцем для навісів High-Low або працює в шорт-корнері, розтягуючи нижню лінію захисту.`
      }
    },

    systemProfiles: {
      '212': `Класичний «конверт» або X-формація. Високе розташування D5 на лінії штрафу перекриває хай-пост, спрощує бокс-аут і гасить проходи на ранній стадії—але робить нижніх гравців уразливими до навісів і перевантаження флангу.`,
      '212_buzz': `Агресивна варіація Buzz. Верхні захисники зустрічають м'яч біля волейбольної лінії, змушуючи робити високий повільний пас на фланг; D5 тримається за ~4,5 м від кільця, а четвірка по периметру грає на перехопленнях.`,
      '23': `Глибокий захист трисекундної зони. D5 постійно страхує кільце й підбір, проте відкритий хай-пост і зазори під 45° дають нападу вікно до завершення ротації.`,
      '32': `Потужний периметр із трьома гравцями на дузі нейтралізує триочкові кидки, але залишає лише двох нижніх захисників проти обох кутів і лицьової лінії.`,
      '131': `Агресивна ромбоподібна схема для створення пасток на флангах і в кутах. Вразлива до швидкого розвороту м'яча та довгих діагональних скіп-пасів у протилежний кут.`
    },

    tactics: {
      '212': {
        top: {
          onball: `D1 і D2 контролюють верхівку удвох—виконують фейкові випади (stunts) без глибокого виходу, щоб залишатися ближче до флангів і перекривати пас у хай-пост.`,
          help: `D5 розташовується в хай-пості за спиною центрового нападу (або грає 3/4 попереду проти сильного снайпера). Якщо там нікого немає, D5 злегка опускається в центр «фарби».`,
          weak: `D3 і D4 трохи піднімаються від блоків, готові коротко зустріти флангову передачу до моменту, поки D1 або D2 їх не змінять.`
        },
        r_wing: {
          onball: `D4 спочатку приймає правий фланг, доки D2 не прискориться й не змінить його (bump-off). Після зміни D4 ковзає вниз до лицьової, готовий закрити правий кут.`,
          help: `D1 опускається до штрафної лінії, перекриваючи пас у хай-пост. Це дозволяє D5 зміститися ближче до кільця й блоку з боку м'яча.`,
          weak: `D3 стягується до кільця на слабкому боці, щоб перекрити навіс (lob) і бути готовим до скіп-пасу.`
        },
        l_wing: {
          onball: `D3 коротко зустрічає лівий фланг, після чого D1 прискорюється для зміни, а D3 опускається контролювати лівий кут і лицьову.`,
          help: `D2 опускається до лінії штрафу для перекриття хай-поста, даючи змогу D5 закривати лівий низький блок.`,
          weak: `D4 стягується під кільце для захисту від навісів і контролю слабкого боку.`
        },
        r_corner: {
          onball: `D4 щільно виходить у правий кут, забираючи триочковий кидок і повністю перекриваючи прохід по лицьовій лінії.`,
          help: `D2 опускається на правий лікоть, закриваючи хай-пост. D5 грає спереду на правому блоці, перекриваючи пас у «фарбу» та страхуючи прохід.`,
          weak: `D1 опускається в центр трисекундної, готовий до скіп-пасу на протилежний бік; D3 залишається в «фарбі» проти навісів.`
        },
        l_corner: {
          onball: `D3 закриває лівий кут і не пускає гравця по лицьовій лінії.`,
          help: `D1 опускається на лівий лікоть; D5 перекриває лівий низький блок.`,
          weak: `D2 зміщується в центр «фарби» для контролю скіп-пасів, а D4 страхує кільце від навісів.`
        },
        high_post: {
          onball: `D5 грає з гравцем у хай-пості жорстко 1-в-1, як у персональному захисті, використовуючи зріст і атлетизм для блокування кидка чи огляду.`,
          help: `D1 і D2 НЕ ПОВИННІ звужуватися на м'яч (це відкриє вільні 3-очкові): вони розходяться до снайперів на периметрі.`,
          weak: `D3 і D4 діють зсередини-назовні: спершу стягуються на блоки, щоб перекрити пас хай-лоу, а потім виходять на своїх снайперів.`
        },
        short_corner: {
          onball: `ПАСТКА (TRAP)! D5 ініціює пастку в шорт-корнері, закриваючи лицьову, а D4 завершує подвійну опіку ззаду.`,
          help: `D2 висувається ближче до правого флангу, перекриваючи легку зворотну передачу вгору.`,
          weak: `D3 забігає в центр «фарби» проти врізання під кільце; D1 грає «центрального захисника» для перехоплення скіп-пасу.`
        }
      },
      '23': {
        top: {
          onball: `D1 і D2 тримають верхівку дуги з піднятими руками, ускладнюючи прямий пас у середину.`,
          help: `D5 залишається глибоко біля кільця, цементуючи «фарбу» і готуючись до підбору (хай-пост відкритий до прийому).`,
          weak: `D3 і D4 стоять на блоках, готові тимчасово вийти на фланги до зміщення верхніх захисників.`
        },
        r_wing: {
          onball: `D4 вибігає на правий фланг, а D2 зміщується по діагоналі вниз, щоб змінити D4 (bump-off).`,
          help: `Після зміни D4 повертається в правий кут; D5 переходить на ближній блок, а D1 опускається до штрафного ліктя.`,
          weak: `D3 стягується в середину трисекундної зони для захисту кільця і контролю врізань.`
        },
        l_wing: {
          onball: `D3 зустрічає лівий фланг до діагонального прискорення D1, після чого відходить у лівий кут.`,
          help: `D5 зміщується на лівий блок; D2 опускається до лінії штрафу.`,
          weak: `D4 страхує кільце зі слабкого боку й готується до розвороту.`
        },
        r_corner: {
          onball: `D4 закриває правий кут і не пускає в лицьову; D5 перекриває ближній блок.`,
          help: `D2 опускається на правий лікоть/шорт-корнер; D1 контролює центр «фарби» проти скіп-пасів.`,
          weak: `D3 тримає кільце і страхує від проривів зі слабкого боку.`
        },
        l_corner: {
          onball: `D3 закриває лівий кут; D5 перекриває лівий блок.`,
          help: `D1 опускається на лікоть; D2 контролює середину «фарби».`,
          weak: `D4 страхує кошик і підбір зі слабкого боку.`
        },
        high_post: {
          onball: `D5 змушений вибігати з-під кільця на лінію штрафу—це оголює простір за його спиною (головна слабкість 2-3).`,
          help: `D3 і D4 максимально звужуються під кошик, щоб перекрити передачу хай-лоу.`,
          weak: `D1 і D2 трохи підсідають для тиску на пас і повертаються на периметр.`
        },
        short_corner: {
          onball: `D4 виходить на шорт-корнер і закриває лицьову лінію.`,
          help: `D5 тримає ближній блок і кільце; D2 перекриває скидку на фланг.`,
          weak: `D3 контролює центр «фарби» і підбір; D1 стежить за верхом і скіпами.`
        }
      },
      '32': {
        top: {
          onball: `D1 тисне на верхівку дуги, тоді як D2 і D3 щільно тримають фланги під 45°—створюючи стіну проти триочкових.`,
          help: `D4 і D5 утримують два нижніх блоки, постійно підказуючи про врізання в «фарбу».`,
          weak: `Оскільки троє грають високо, D4 і D5 відповідають одночасно і за кільце, і за обидва кути.`
        },
        r_wing: {
          onball: `D2 одразу виходить на правий фланг без потреби чекати зміни знизу.`,
          help: `D1 зміщується в зазор на боці м'яча; D4 злегка висувається до правого шорт-корнера.`,
          weak: `D3 опускається ближче до хай-поста; D5 самотужки страхує кільце.`
        },
        l_wing: {
          onball: `D3 закриває лівий фланг напряму, а D1 звужується в лівий зазор.`,
          help: `D5 зміщується на лівий блок; D2 опускається до штрафної лінії.`,
          weak: `D4 тримає кільце й готується до довгих ривків у кут.`
        },
        r_corner: {
          onball: `D4 змушений бігти з блоку аж у правий кут—класична вразливість схеми 3-2 уздовж лицьової лінії.`,
          help: `D2 підсідає до флангу; D5 має встигати перекрити всю трисекундну зону сам.`,
          weak: `D1 і D3 стягуються до ліктів, щоб завадити пасу в хай-пост і перехопити скіп.`
        },
        l_corner: {
          onball: `D5 вибігає в лівий кут, а D4 перетинає всю «фарбу» до кільця.`,
          help: `D3 допомагає на лівому фланзі; D1 і D2 перекривають центр і скіп-лінії.`,
          weak: `Швидкий діагональний скіп-пас у протилежний кут дає майже гарантований вільний кидок.`
        },
        high_post: {
          onball: `D1 тисне ззаду зверху, а D4 і D5 піднімаються з блоків, затискаючи хай-пост у лещата.`,
          help: `D2 і D3 залишаються широко на крилах під 45°, забираючи триочкові скидки.`,
          weak: `D4 і D5 мають чітко домовитися, хто залишається біля кільця при врізанні.`
        },
        short_corner: {
          onball: `D4 виходить на шорт-корнер і блокує лицьову лінію.`,
          help: `D5 зміщується в центр «фарби» проти врізань; D2 перекриває пас на фланг.`,
          weak: `D1 і D3 страхують хай-пост та слабкий бік периметра.`
        }
      },
      '131': {
        top: {
          onball: `D1 агресивно пресингує розігруючого, змушуючи віддавати пас до однієї з бокових ліній.`,
          help: `D2, D5 і D3 формують середню лінію з трьох гравців на рівні штрафної лінії.`,
          weak: `D4 патрулює лицьову лінію під кошиком і підказує про врізання за спини.`
        },
        r_wing: {
          onball: `D2 зупиняє правий фланг і спрямовує до ауту, поки D1 прискорюється для постановки флангової пастки.`,
          help: `D5 опускається на ближній півпост; D4 біжить на правий бік лицьової, перекриваючи кут.`,
          weak: `D3 звужується до лівого ліктя, готуючись перехопити діагональний скіп-пас.`
        },
        l_wing: {
          onball: `D3 тримає лівий фланг, а D1 летить у подвійний відбір біля бокової лінії.`,
          help: `D5 закриває центр; D4 перебігає на лівий край лицьової лінії.`,
          weak: `D2 звужується до правого ліктя для контролю переведення.`
        },
        r_corner: {
          onball: `КУТОВА ПАСТКА! D4 вибігає з лицьової, а D2 падає зверху для агресивного трапу в правому куті.`,
          help: `D5 грає спереду на ближньому блоці, забираючи скидку під кільце.`,
          weak: `D1 контролює вихід на фланг, D3 тримає «фарбу»—головний ризик лише довгий скіп у протилежний кут.`
        },
        l_corner: {
          onball: `КУТОВА ПАСТКА! D4 і D3 затискають лівий кут.`,
          help: `D5 перекриває лівий блок; D1 закриває лінію повернення на фланг.`,
          weak: `D2 опускається в «фарбу» проти врізань і дальніх скіпів.`
        },
        high_post: {
          onball: `D5 одразу щільно бере хай-пост 1-в-1, поки D1 опускається ззаду для тиску на м'яч.`,
          help: `D2 і D3 утримують фланги під 45°, не даючи скинути на вільну «трійку».`,
          weak: `D4 залишається під кільцем і контролює лицьову проти врізань за спину D5.`
        },
        short_corner: {
          onball: `D4 і D5 разом затискають шорт-корнер, забираючи і прохід по лицьовій, і пас під кільце.`,
          help: `D2 перекриває вихід на фланг; D1 патрулює верхню лінію передачі.`,
          weak: `D3 страхує слабкий бік трисекундної від врізань і скіп-пасів.`
        }
      }
    },

    offenseReads: {
      overload: {
        top: `Початок комбінації: O4 вривається в хай-пост, а O5 готується ковзати вздовж лицьової на сильний бік одразу після пасу на фланг.`,
        r_wing: `Перевантаження 3-проти-2 справа! O2 (фланг), O3 (кут) і O5 (шорт-корнер) створюють чисельну перевагу проти двох нижніх захисників, поки O4 зв'язує центр.`,
        l_wing: `Лівостороннє перевантаження 3-проти-2: O3, O2 (кут) і O5 (шорт-корнер) змушують нижніх захисників розриватися між трьома точками.`,
        r_corner: `М'яч у правому куті: O5 займає позицію в шорт-корнері або під кільцем, а O4 вривається в «фарбу»—змушуючи слабкий бік спізнюватися з ротацією.`,
        l_corner: `Лівий кут розтягує лицьового захисника: шукай O5 на блоці або O4 у вільній центральній кишені.`,
        high_post: `Прийом у хай-пості стягує центр зони: O5 пірнає за спину центровому під легкий кидок, а O2 та O3 піднімаються під чисті триочкові.`,
        short_corner: `М'яч у шорт-корнері ламає нижню лінію або викликає пастку: шукай врізання O4 по центру або швидку скидку в кут на O3.`
      },
      hilo: {
        top: `O1 тисне на верхівку, піднімаючи захисників і відкриваючи пас на O4 на лінію штрафу, поки O5 блокує слабкого нижнього гравця.`,
        r_wing: `Правий фланг дає ідеальний кут для входу на O4 на лікоть: щойно центровий виходить на O4, O5 приймає навіс High-Low на протилежному блоці.`,
        l_wing: `Лівий фланг живить O4 на лівому лікті; O5 «садить» захисника на правий блок для завершення High-Low.`,
        r_corner: `Кут опускає захист глибоко вниз, відкриваючи швидкий розворот через O1/O4 або скіп-пас на O3 на слабкий бік.`,
        l_corner: `Лівий кут розтягує зону по горизонталі: шукай вихід O4 у хай-пост або переведення м'яча на O2.`,
        high_post: `КЛЮЧОВИЙ ПРИЙОМ: O4 з м'ячем на лінії штрафу. Якщо центровий грає 1-в-1, одразу віддавай навіс на O5 під кільце; якщо фланги стискаються—скидка на O2 або O3.`,
        short_corner: `Шорт-корнер відтягує нижнього захисника від кільця: O4 вривається в середину, а O3 чекає скіп-пас під триочковий.`
      },
      gap: {
        top: `O1 атакує з веденням зазор між двома верхніми захисниками, змушуючи обох стягнутися та відкриваючи вільних O2 чи O3 на дузі.`,
        r_wing: `O2 атакує щілину між верхом і флангом, після чого блискавично розвертає м'яч через O1 на O3 швидше за ротацію зони.`,
        l_wing: `O3 прориває лівий зазор: при стягуванні захисту миттєвий пас на O1 для розвороту на O2 або скидка на O5 у шорт-корнер.`,
        r_corner: `Прийом у куті витягує нижнього захисника: віддавай на O4 у середній зазор або ріж зону діагональним скіпом на O3.`,
        l_corner: `Лівий кут розтягує захист: читай діагональний скіп-пас на O2 або вхід на O5 у вільний коридор трисекундної.`,
        high_post: `O4 вискакує із шорт-корнера в зазор на лінії штрафу; широка розстановка 3-Out дає O2 та O3 вільні кидки при будь-якій підстраховці.`,
        short_corner: `Пас у шорт-корнер розриває задню лінію: O5 врізається до кільця з протилежного боку, а O3 піднімається під скіп-пас.`
      }
    },

    rules: [
      { num: `01`, title: `Руки завжди вгору`, body: `Усі 5 захисників тримають руки піднятими протягом усього володіння, щоб звузити вікна та завадити швидким прямим передачам.` },
      { num: `02`, title: `Рух під час пасу, прибуття на прийом`, body: `Захисники зміщуються, поки м'яч летить у повітрі—мета полягає в тому, щоб випередити пас і закрити кидок до прийому.` },
      { num: `03`, title: `Постійна голосна комунікація`, body: `Нападники постійно перетинають межі зон і заходять за спини; гучні підказки про врізання та заслони є обов'язковими.` },
      { num: `04`, title: `1-в-1 у трисекундній зоні`, body: `При вході м'яча в хай- або лоу-пост центровий грає 1-в-1. Верхні розходяться до снайперів; фланги спершу страхують блоки, потім виходять на дугу.` }
    ],

    matrix: [
      { id: `212`, name: `Зона 2-1-2`, center: `Хай-пост / Штрафна (мобільний, стрибучий блокер)`, mech: `Bump-off на фланзі; крила зсередини-назовні на хай-пості; пастки в шорт-корнері`, pros: `Закриває хай-пост, зручний бокс-аут, рано зупиняє проходи`, cons: `Вразлива до перевантаження снайперами та навісів за спину нижнім гравцям` },
      { id: `23`, name: `Зона 2-3`, center: `Глибоко під кільцем (високий, менш мобільний)`, mech: `Нижній крайній зустрічає фланг до діагональної зміни верхнім захисником`, pros: `Максимальний захист «фарби», надійний підбір, провокує дальні кидки`, cons: `Хай-пост (штрафна лінія), кути та зазори під 45° відкриті до ротації` },
      { id: `32`, name: `Зона 3-2`, center: `Два нижніх захисники ділять блоки та кути`, mech: `Три захисники по дузі закривають верх і фланги 45° напряму без змін`, pros: `Чудовий тиск на периметр, нейтралізація триочкових команд`, cons: `Кути й лицьова лінія вразливі через навантаження на двох нижніх гравців` },
      { id: `131`, name: `Зона 1-3-1`, center: `Центр у хай-пості + бігун по лицьовій (D4)`, mech: `Верхній переслідувач + агресивні пастки на флангах і в кутах; D4 по лицьовій`, pros: `Агресивні трапи на флангах і перехоплення поперечних передач`, cons: `Вразлива до довгих діагональних скіп-пасів і швидких скидок у кути` }
    ],

    offPrinciples: [
      { num: `01`, title: `Атака хай-поста`, body: `Прийом на штрафній лінії змушує центрового вийти вперед, відкриваючи пас хай-лоу під кільце, вільний кут або середній кидок.` },
      { num: `02`, title: `Перевантаження (Overload)`, body: `Зміщення 3–4 нападників на один бік (45°, кут, шорт-корнер) створює чисельну перевагу 3-проти-2 над двома нижніми захисниками.` },
      { num: `03`, title: `Використання шорт-корнера`, body: `Позиція між штрафною й лицьовою поза «фарбою» розбиває нижню лінію зони й витягує крайнього захисника з периметра.` },
      { num: `04`, title: `Швидкий розворот (Skip Pass)`, body: `М'яч летить швидше за біг захисників. Швидкий перевід через верх або діагональний скіп-пас дають вільний кидок до завершення ротації.` },
      { num: `05`, title: `Атака зазорів (Gaps)`, body: `Прохід із веденням у щілину між двома зонами змушує обох захисників стягнутися й звільняє партнера на дузі (Drive & Kick).` }
    ]
  }
};

// Every language must have the same shape as English: a missing key fails the type check, an extra one the tests
export type BoardMessages = typeof DICTIONARIES.en;
export const I18N: Record<BoardLang, BoardMessages> = DICTIONARIES;
