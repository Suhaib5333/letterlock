import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ScoreRow {
  user_id: string;
  username: string;
  score: number;
  moves: number;
  duration_ms: number;
  level: number;
  prestige: number;
}
export interface RankRow {
  id: string;
  username: string;
  level: number;
  prestige: number;
  total_xp: number;
  rank: number;
}
export interface MyRank {
  rank: number;
  total_xp: number;
  level: number;
  prestige: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** pack_leaderboard(p_pack, p_limit, p_offset): distinct best score per player + total. */
  async page(pack: string, limit: number, offset: number): Promise<{ rows: ScoreRow[]; total: number; limit: number; offset: number }> {
    const lim = Math.max(1, Math.min(100, limit || 25));
    const off = Math.max(0, offset || 0);
    const raw = await this.prisma.$queryRaw<(ScoreRow & { total: bigint | number; duration_ms: bigint | number })[]>`
      select * from pack_leaderboard(${pack}, ${lim}::int, ${off}::int)`;
    const total = raw.length ? Number(raw[0].total) : offset > 0 ? await this.countDistinct(pack) : 0;
    const rows = raw.map(({ total: _t, ...r }) => ({ ...r, duration_ms: Number(r.duration_ms) }));
    return { rows, total, limit: lim, offset: off };
  }

  private async countDistinct(pack: string): Promise<number> {
    const r = await this.prisma.$queryRaw<{ n: bigint }[]>`
      select count(distinct user_id) as n from leaderboard where (${pack} = 'all' or pack_id = ${pack})`;
    return Number(r[0]?.n ?? 0);
  }

  /** submit_score(p_user_id, ...): username derived server-side, banned refused, bounds enforced. */
  async submit(userId: string, packId: string, score: number, moves: number, durationMs: number): Promise<{ ok: true }> {
    try {
      await this.prisma.$executeRaw`select submit_score(${userId}::uuid, ${packId}, ${score}::int, ${moves}::int, ${durationMs}::bigint)`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/no profile/.test(msg)) throw new NotFoundException({ message: 'Claim a username first', code: 'no_profile' });
      if (/banned/.test(msg)) throw new ForbiddenException({ message: 'Account is banned', code: 'banned' });
      if (/bad (score|moves|duration)/.test(msg)) throw new BadRequestException({ message: 'Score out of bounds', code: 'bad_score' });
      throw e;
    }
    return { ok: true };
  }

  /** global_ranks(p_limit) */
  async ranks(limit: number): Promise<RankRow[]> {
    const raw = await this.prisma.$queryRaw<(RankRow & { total_xp: bigint; rank: bigint })[]>`
      select * from global_ranks(${Math.max(1, Math.min(500, limit || 100))}::int)`;
    return raw.map((r) => ({ ...r, total_xp: Number(r.total_xp), rank: Number(r.rank) }));
  }

  /** my_global_rank(p_user_id) */
  async myRank(userId: string): Promise<MyRank> {
    const raw = await this.prisma.$queryRaw<(MyRank & { rank: bigint; total_xp: bigint })[]>`
      select * from my_global_rank(${userId}::uuid)`;
    const r = raw[0];
    if (!r) throw new NotFoundException({ message: 'Claim a username first', code: 'no_profile' });
    return { rank: Number(r.rank), total_xp: Number(r.total_xp), level: r.level, prestige: r.prestige };
  }
}
