import { boardGeometry } from '../board/geometry';
import type { PlayerTeam } from '../lib/lobby';

/**
 * Read-only mini hex board for the player's phone — mirrors the live game so
 * players can see how it's going. No interaction; just owner-coloured tiles.
 */
export function MiniBoard({
  owners,
  size,
  colorA,
  colorB,
}: {
  owners: (PlayerTeam | null)[];
  size: number;
  colorA: string;
  colorB: string;
}) {
  if (!size || size < 2) return null;
  const geo = boardGeometry(size, 22, 8);
  return (
    <svg className="mini-board" viewBox={geo.viewBox} role="img" aria-label="Live board" data-testid="mini-board">
      {geo.cells.map((c) => {
        const o = owners[c.cell] ?? null;
        const fill = o === 'A' ? colorA : o === 'B' ? colorB : 'rgba(255,255,255,0.06)';
        const stroke = o ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.16)';
        return (
          <polygon
            key={c.cell}
            points={c.pointsAttr}
            fill={fill}
            stroke={stroke}
            strokeWidth={o ? 2 : 1.5}
          />
        );
      })}
    </svg>
  );
}
