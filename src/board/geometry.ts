import { colOf, rowOf } from '../core/topology';

export interface HexCell {
  cell: number;
  row: number;
  col: number;
  cx: number;
  cy: number;
  corners: [number, number][]; // 6 corners, pointy-top, index 0 = top vertex
  pointsAttr: string; // ready for an SVG <polygon points="…">
}

export interface CoordLabel {
  text: string;
  x: number;
  y: number;
}

export interface BoardGeometry {
  size: number;
  hexSize: number;
  cells: HexCell[];
  viewBox: string;
  width: number;
  height: number;
  edges: Record<'top' | 'bottom' | 'left' | 'right', string>; // SVG polyline point strings
  /** Chess-style coordinate labels — column numbers (1..N) along the top,
   *  row letters (A..) down the left side. Used for letterless packs where
   *  per-hex letters are hidden but players still need to reference cells.
   *  Positions live in the (extended) viewBox; render only when needed. */
  coords: {
    cols: CoordLabel[];
    rows: CoordLabel[];
    fontSize: number;
  };
}

const SQRT3 = Math.sqrt(3);

/** Pointy-top hex corners, index 0 = top vertex, going clockwise. */
function hexCorners(cx: number, cy: number, size: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 180) * (60 * i - 90);
    pts.push([cx + size * Math.cos(ang), cy + size * Math.sin(ang)]);
  }
  return pts;
}

function polyline(cells: HexCell[], cornerIdx: number[]): string {
  const pts: string[] = [];
  for (const c of cells) {
    for (const idx of cornerIdx) {
      const [x, y] = c.corners[idx];
      pts.push(`${round(x)},${round(y)}`);
    }
  }
  return pts.join(' ');
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute the full pixel layout for an N×N Game-of-Hex rhombus (pointy-top,
 * leaning right as rows descend). Pure + deterministic, so it can be unit-tested.
 * The SVG scales to any display size via the returned viewBox.
 */
export function boardGeometry(
  size: number,
  hexSize = 40,
  margin = 18,
  /** Extra padding (in SVG units) reserved on the top and left edges for
   *  chess-style coordinate labels. Pass 0 to keep the old behaviour. */
  labelPad = 0,
): BoardGeometry {
  const cells: HexCell[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let cell = 0; cell < size * size; cell++) {
    const row = rowOf(cell, size);
    const col = colOf(cell, size);
    const cx = hexSize * SQRT3 * (col + row / 2);
    const cy = hexSize * 1.5 * row;
    const corners = hexCorners(cx, cy, hexSize);
    for (const [x, y] of corners) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    cells.push({
      cell,
      row,
      col,
      cx,
      cy,
      corners,
      pointsAttr: corners.map(([x, y]) => `${round(x)},${round(y)}`).join(' '),
    });
  }

  const x0 = minX - margin - labelPad;
  const y0 = minY - margin - labelPad;
  const width = maxX - minX + margin * 2 + labelPad;
  const height = maxY - minY + margin * 2 + labelPad;

  const topRow = cells.filter((c) => c.row === 0);
  const bottomRow = cells.filter((c) => c.row === size - 1);
  const leftCol = cells.filter((c) => c.col === 0);
  const rightCol = cells.filter((c) => c.col === size - 1);

  const edges = {
    // Upper corners across the top row: upper-left(5) → top(0) → upper-right(1).
    top: polyline(topRow, [5, 0, 1]),
    // Lower corners across the bottom row: lower-left(4) → bottom(3) → lower-right(2).
    bottom: polyline(bottomRow, [4, 3, 2]),
    // Left-facing corners down the left column: top(0) → upper-left(5) → lower-left(4).
    left: polyline(leftCol, [0, 5, 4]),
    // Right-facing corners down the right column: top(0) → upper-right(1) → lower-right(2).
    right: polyline(rightCol, [0, 1, 2]),
  };

  // Chess-style coordinate labels:
  //   columns 1..N along the top, row letters A..Z down the left side.
  // Numbers go on top because rows skew rightward as they descend — they
  // visually mark each column the way ranks/files do in chess notation.
  const labelOffset = hexSize * 0.55; // gap between hex edge and label
  const fontSize = hexSize * 0.62;
  const cols: CoordLabel[] = [];
  const rows: CoordLabel[] = [];
  for (let k = 0; k < size; k++) {
    // Column header: above the top vertex of the row-0 cell in column k.
    const top = cells.find((c) => c.row === 0 && c.col === k)!;
    cols.push({
      text: String(k + 1),
      x: top.cx,
      y: top.cy - hexSize - labelOffset,
    });
    // Row header: to the left of the LEFT vertex of the col-0 cell in row k.
    const lefty = cells.find((c) => c.row === k && c.col === 0)!;
    rows.push({
      text: String.fromCharCode('A'.charCodeAt(0) + k),
      x: lefty.cx - hexSize * (SQRT3 / 2) - labelOffset,
      y: lefty.cy,
    });
  }

  return {
    size,
    hexSize,
    cells,
    viewBox: `${round(x0)} ${round(y0)} ${round(width)} ${round(height)}`,
    width,
    height,
    edges,
    coords: { cols, rows, fontSize },
  };
}

/** SVG path "d" through the centres of the given cells — used for the winning trace. */
export function pathThroughCells(geo: BoardGeometry, cellIds: number[]): string {
  const byId = new Map(geo.cells.map((c) => [c.cell, c]));
  return cellIds
    .map((id, i) => {
      const c = byId.get(id)!;
      return `${i === 0 ? 'M' : 'L'} ${round(c.cx)} ${round(c.cy)}`;
    })
    .join(' ');
}
