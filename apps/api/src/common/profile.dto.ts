import type { Profile } from '../generated/prisma/client';

/**
 * Wire shape of a profile: snake_case, identical to the `Profile` type the client
 * already uses for the old `profiles` table, plus the Remove-Ads fields.
 */
export interface ProfileDto {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'player' | 'moderator' | 'admin';
  banned_at: string | null;
  created_at: string;
  updated_at: string;
  username_changed_at: string | null;
  xp: number;
  level: number;
  prestige: number;
  total_xp: number;
  full_access: boolean;
  ads_removed: boolean;
  ads_removed_source: string | null;
  ads_removed_at: string | null;
}

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

export function toProfileDto(p: Profile): ProfileDto {
  return {
    id: p.id,
    username: p.username,
    display_name: p.displayName,
    avatar_url: p.avatarUrl,
    role: p.role,
    banned_at: iso(p.bannedAt),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    username_changed_at: iso(p.usernameChangedAt),
    xp: p.xp,
    level: p.level,
    prestige: p.prestige,
    total_xp: Number(p.totalXp),
    full_access: p.fullAccess,
    ads_removed: p.adsRemoved,
    ads_removed_source: p.adsRemovedSource,
    ads_removed_at: iso(p.adsRemovedAt),
  };
}
