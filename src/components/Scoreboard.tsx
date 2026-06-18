import type { GameState, TeamConfig, TeamId } from '../core/models';

interface Props {
  teams: Record<TeamId, TeamConfig>;
  game: GameState;
  series: { A: number; B: number; gamesNeeded: number };
  mode: string;
  pack: { name: string; emoji?: string };
  canSwitch?: boolean;
  onSwitchTurn?: () => void;
}

function dirLabel(game: GameState, team: TeamId) {
  return game.directions[team] === 'horizontal' ? 'L↔R' : 'T↕B';
}

function TeamPanel({
  team,
  teams,
  game,
  series,
}: {
  team: TeamId;
  teams: Record<TeamId, TeamConfig>;
  game: GameState;
  series: { A: number; B: number; gamesNeeded: number };
}) {
  const active = game.status === 'playing' && game.turn === team;
  return (
    <div className={`team-panel team-${team} ${active ? 'active' : ''}`} data-testid={`team-panel-${team}`}>
      <div className="team-panel-top">
        <span className="team-chip">
          <span className={`dot team-${team}`} />
          {teams[team].name}
        </span>
        <span className="team-dir" title="Direction this game">
          {dirLabel(game, team)}
        </span>
      </div>
      <div className="team-score" data-testid={`series-${team}`}>
        {series[team]}
        <span className="team-score-need">/{series.gamesNeeded}</span>
      </div>
      {series.gamesNeeded > 1 && (
        <div className="series-pips" aria-label={`${series[team]} of ${series.gamesNeeded} games won`}>
          {Array.from({ length: series.gamesNeeded }, (_, i) => (
            <span key={i} className={`pip ${i < series[team] ? 'filled' : ''}`} />
          ))}
        </div>
      )}
      <div className="team-stats">
        <span title="Hexes claimed">⬡ {game.stats[team].claimed}</span>
        <span title="Blocks">🛡 {game.stats[team].blocks}</span>
      </div>
      {active && <div className="turn-flare" aria-hidden="true" />}
    </div>
  );
}

export function Scoreboard({ teams, game, series, mode, pack, canSwitch, onSwitchTurn }: Props) {
  return (
    <div className="scoreboard">
      <TeamPanel team="A" teams={teams} game={game} series={series} />
      <div className="score-mid">
        <span className="pack-tag" data-testid="pack-tag" title={pack.name}>
          {pack.emoji && <span className="pack-tag-emoji" aria-hidden="true">{pack.emoji}</span>}
          <span className="pack-tag-name">{pack.name}</span>
        </span>
        <span className="mode-tag">{mode}</span>
        <span className="vs-badge">VS</span>
        {canSwitch && (
          <button
            className="vs-switch"
            data-testid="switch-turn"
            aria-label="Switch turn to the other team"
            title="Switch whose turn it is (host intervention)"
            onClick={onSwitchTurn}
          >
            ⇄ <span className="vs-switch-label">switch</span>
          </button>
        )}
      </div>
      <TeamPanel team="B" teams={teams} game={game} series={series} />
    </div>
  );
}
