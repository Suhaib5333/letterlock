/**
 * Team color palette. Curated to stay distinguishable for colorblind players
 * (Okabe-Ito inspired) — no red/green pairing. Each entry carries the shades the
 * UI + board need, applied at runtime as CSS variables.
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
  { id: 'blue', name: 'Blue', base: '#0a84ff', light: '#3aa0ff', deep: '#0a5bbd', glow: '#38bdf8', stroke: '#7cc4ff' },
  { id: 'amber', name: 'Amber', base: '#ff9f0a', light: '#ffb43a', deep: '#d97b00', glow: '#ffcb47', stroke: '#ffd27a' },
  { id: 'teal', name: 'Teal', base: '#12b5a6', light: '#2dd4bf', deep: '#0c8a7f', glow: '#5eead4', stroke: '#9af0e4' },
  { id: 'violet', name: 'Violet', base: '#9b6bff', light: '#b794ff', deep: '#7338e0', glow: '#c9b6ff', stroke: '#d8c8ff' },
  { id: 'sky', name: 'Sky', base: '#56b4e9', light: '#7cc6f0', deep: '#2e8fc8', glow: '#a8dcff', stroke: '#c4e8ff' },
  { id: 'rose', name: 'Rose', base: '#f0609a', light: '#f582ad', deep: '#c43b73', glow: '#ffa6c8', stroke: '#ffc4dc' },
];

export function colorById(id: string): TeamColor {
  return TEAM_COLORS.find((c) => c.id === id) ?? TEAM_COLORS[0];
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
