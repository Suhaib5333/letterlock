import { memo, useMemo } from 'react';
import { boardGeometry, pathThroughCells } from '../board/geometry';
import type { GameState, TeamId } from '../core/models';

interface BoardProps {
  game: GameState;
  selectedCell: number | null;
  lastClaimCell: number | null;
  pickable: boolean;
  onPick: (cell: number) => void;
  hideLetters?: boolean;
}

const TEAM_FILL: Record<TeamId, string> = { A: 'url(#fillA)', B: 'url(#fillB)' };
const TEAM_STROKE: Record<TeamId, string> = { A: 'var(--ta-stroke)', B: 'var(--tb-stroke)' };

function BoardInner({
  game,
  selectedCell,
  lastClaimCell,
  pickable,
  onPick,
  hideLetters,
}: BoardProps) {
  // Letterless packs (flags, logos, songs, melodies, charades, clips) hide the
  // per-hex letters → players can't say "I'll take K" any more. Give them
  // chess-style coordinates instead: column numbers on top, row letters on
  // the side, so calls like "B3" or "D5" work the same way as chess notation.
  const geo = useMemo(
    () => boardGeometry(game.size, 40, 18, hideLetters ? 36 : 0),
    [game.size, hideLetters],
  );
  const winSet = useMemo(() => new Set(game.winningPath ?? []), [game.winningPath]);
  const tracePath = useMemo(
    () => (game.winningPath ? pathThroughCells(geo, game.winningPath) : ''),
    [geo, game.winningPath],
  );

  // Which edges belong to which team this game (for the colored frame).
  const topBottomTeam: TeamId = game.directions.A === 'vertical' ? 'A' : 'B';
  const leftRightTeam: TeamId = game.directions.A === 'horizontal' ? 'A' : 'B';
  const edgeColor: Record<TeamId, string> = { A: 'var(--ta)', B: 'var(--tb)' };

  return (
    <svg
      className="ll-board"
      viewBox={geo.viewBox}
      role="grid"
      aria-label={`${game.size} by ${game.size} Letterlock board`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="fillA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ta-light)" />
          <stop offset="100%" stopColor="var(--ta-deep)" />
        </linearGradient>
        <linearGradient id="fillB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tb-light)" />
          <stop offset="100%" stopColor="var(--tb-deep)" />
        </linearGradient>
        <linearGradient id="fillNeutral" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#28324f" />
          <stop offset="100%" stopColor="#19223e" />
        </linearGradient>
        <linearGradient id="fillNeutralHover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#36436c" />
          <stop offset="100%" stopColor="#222e52" />
        </linearGradient>
        <linearGradient id="fillSelected" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a6b9c" />
          <stop offset="100%" stopColor="#3a4775" />
        </linearGradient>

        {/* Patterns so ownership is encoded beyond colour (plan §7.3) */}
        <pattern id="patA" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="1.6" fill="rgba(255,255,255,0.22)" />
        </pattern>
        <pattern id="patB" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3" height="3" x="4" y="4" fill="rgba(0,0,0,0.18)" />
        </pattern>

        <filter id="hexGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.45" />
        </filter>
        <filter id="traceGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Chess-style coordinate labels for letterless packs (cols 1..N on top,
          rows A..N on the left). Rendered before the edges so the frame draws
          on top of nothing important. */}
      {hideLetters && (
        <g className="ll-coords" aria-hidden="true">
          {geo.coords.cols.map((c) => (
            <text
              key={`col-${c.text}`}
              className="ll-coord ll-coord-col"
              x={c.x}
              y={c.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={geo.coords.fontSize}
            >
              {c.text}
            </text>
          ))}
          {geo.coords.rows.map((r) => (
            <text
              key={`row-${r.text}`}
              className="ll-coord ll-coord-row"
              x={r.x}
              y={r.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={geo.coords.fontSize}
            >
              {r.text}
            </text>
          ))}
        </g>
      )}

      {/* colored edge frame */}
      <g className="ll-edges" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <polyline points={geo.edges.top} stroke={edgeColor[topBottomTeam]} strokeWidth="7" opacity="0.9" />
        <polyline points={geo.edges.bottom} stroke={edgeColor[topBottomTeam]} strokeWidth="7" opacity="0.9" />
        <polyline points={geo.edges.left} stroke={edgeColor[leftRightTeam]} strokeWidth="7" opacity="0.9" />
        <polyline points={geo.edges.right} stroke={edgeColor[leftRightTeam]} strokeWidth="7" opacity="0.9" />
      </g>

      {/* hexes */}
      <g>
        {geo.cells.map((c) => {
          const owner = game.owners[c.cell];
          const isSelected = selectedCell === c.cell;
          const isWin = winSet.has(c.cell);
          const isLast = lastClaimCell === c.cell;
          const claimable = pickable && owner === null;
          const fill =
            owner === 'A'
              ? TEAM_FILL.A
              : owner === 'B'
                ? TEAM_FILL.B
                : 'url(#fillNeutral)';
          return (
            <g
              key={c.cell}
              className={[
                'll-hex',
                owner ? 'owned' : 'neutral',
                claimable ? 'claimable' : '',
                isSelected ? 'selected' : '',
                isWin ? 'win' : '',
                isLast ? 'just-claimed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-cell={c.cell}
              data-owner={owner ?? 'none'}
              data-letter={game.letters[c.cell]}
              role="gridcell"
              aria-label={`Hex ${game.letters[c.cell]}, ${
                owner ? `owned by team ${owner}` : 'unclaimed'
              }`}
              tabIndex={claimable ? 0 : -1}
              onClick={claimable ? () => onPick(c.cell) : undefined}
              onKeyDown={
                claimable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPick(c.cell);
                      }
                    }
                  : undefined
              }
            >
              <polygon className="hex-base" points={c.pointsAttr} fill={fill} filter="url(#hexGlow)" />
              {owner && (
                <polygon className="hex-pattern" points={c.pointsAttr} fill={`url(#pat${owner})`} />
              )}
              <polygon
                className="hex-stroke"
                points={c.pointsAttr}
                fill="none"
                stroke={owner ? TEAM_STROKE[owner] : 'rgba(160,185,235,0.25)'}
                strokeWidth={owner ? 2 : 1.5}
              />
              {!hideLetters && (
                <text
                  className="hex-letter"
                  x={c.cx}
                  y={c.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={owner ? '#fff' : '#9fb0d8'}
                  fontSize={geo.hexSize * 0.95}
                >
                  {game.letters[c.cell]}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* winning lightning trace (plan §7.5) */}
      {tracePath && (
        <g className="ll-trace" filter="url(#traceGlow)">
          <path
            d={tracePath}
            fill="none"
            stroke={game.winner ? edgeColor[game.winner] : '#fff'}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          />
          <path
            className="trace-spark"
            d={tracePath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

export const Board = memo(BoardInner);
