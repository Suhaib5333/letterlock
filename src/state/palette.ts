/**
 * Team color palette. Six plainly-named colors, one per region of the color wheel,
 * so any two picks look obviously different across a room: Blue, Orange, Green,
 * Purple, Pink, Yellow.
 *
 * Rewritten 2026-09-10 at Suhaib's request. The old set had Blue AND Sky (two
 * blues) plus Teal sitting between them, and named things Amber / Violet / Rose,
 * which read as paint swatches rather than team names. Nothing here is a shade of
 * anything else now, and every name is a color a child would name.
 *
 * Accessibility is unchanged in substance: the DEFAULT pairing is still the
 * Okabe-Ito-style Blue vs Orange, the safest pair across all types of color
 * blindness, and ownership on the board is always encoded by a per-team PATTERN
 * (dots vs diamonds) as well as by color, so a player who deliberately picks
 * Green against Orange can still read the board.
 */
export interface TeamColor {
  id: string;
  name: string;
  base: string;
  light: string;
  deep: string;
  glow: string;
  stroke: string;
}

export const TEAM_COLORS: TeamColor[] = [
  { id: 'blue', name: 'Blue', base: '#0a84ff', light: '#4d9bff', deep: '#0a58bd', glow: '#38bdf8', stroke: '#93c8ff' },
  { id: 'orange', name: 'Orange', base: '#ff7a1a', light: '#ff9647', deep: '#c24d00', glow: '#ffab5e', stroke: '#ffc79a' },
  { id: 'green', name: 'Green', base: '#23c552', light: '#4bd873', deep: '#12873a', glow: '#6ee88b', stroke: '#a7f0bc' },
  { id: 'purple', name: 'Purple', base: '#9b4dff', light: '#b478ff', deep: '#6b21d6', glow: '#c9a0ff', stroke: '#dcc4ff' },
  { id: 'pink', name: 'Pink', base: '#ff4d94', light: '#ff74ac', deep: '#c9166b', glow: '#ff8fbe', stroke: '#ffbdd8' },
  { id: 'yellow', name: 'Yellow', base: '#f2c200', light: '#ffd633', deep: '#a87f00', glow: '#ffe066', stroke: '#ffeb9e' },
];

/**
 * Colors saved by an older build. Without this, a returning player's stored pick
 * (or a saved mid-match game) would fall back to Blue and both teams could end up
 * the same color. `sky` maps to Yellow rather than Blue for exactly that reason:
 * it used to be the second blue, and the point of the rewrite is that no two
 * choices look alike.
 */
const LEGACY_IDS: Record<string, string> = {
  amber: 'orange',
  teal: 'green',
  violet: 'purple',
  rose: 'pink',
  sky: 'yellow',
};

export function colorById(id: string): TeamColor {
  const wanted = LEGACY_IDS[id] ?? id;
  return TEAM_COLORS.find((c) => c.id === wanted) ?? TEAM_COLORS[0];
}

/** Push the two teams' colors into CSS variables on the document root. */
export function applyTeamColors(aId: string, bId: string) {
  const a = colorById(aId);
  const b = colorById(bId);
  const r = document.documentElement.style;
  r.setProperty('--ta', a.base);
  r.setProperty('--ta-light', a.light);
  r.setProperty('--ta-deep', a.deep);
  r.setProperty('--ta-glow', a.glow);
  r.setProperty('--ta-stroke', a.stroke);
  r.setProperty('--tb', b.base);
  r.setProperty('--tb-light', b.light);
  r.setProperty('--tb-deep', b.deep);
  r.setProperty('--tb-glow', b.glow);
  r.setProperty('--tb-stroke', b.stroke);
}
