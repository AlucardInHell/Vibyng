import { db } from "./db";
import { pointsRedemptions, pointsTransactions, users } from "@shared/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export const DAILY_POINTS_CAP = 50;

export const POINT_RULES = {
  post_create: { points: 10, dailyLimit: 1 },
  comment_post: { points: 5, dailyLimit: 6, minLength: 8 },
  comment_photo: { points: 5, dailyLimit: 6, minLength: 8 },
  comment_video: { points: 5, dailyLimit: 6, minLength: 8 },
  follow_artist: { points: 3, dailyLimit: 5 },
  attend_event: { points: 10, dailyLimit: 2 },
  support_sent: { points: 50, dailyLimit: 1 },
  support_received: { points: 25, dailyLimit: 2 },
} as const;

export const FAN_REWARDS_CATALOG = {
  exclusive_content: {
    label: "Contenuto esclusivo",
    description: "Accesso a demo, backstage o contenuti riservati",
    cost: 500,
  },
  supporter_badge: {
    label: "Badge Supporter",
    description: "Badge reputazionale visibile nella community",
    cost: 1000,
  },
  early_access: {
    label: "Early access",
    description: "Accesso anticipato a release o live private",
    cost: 1500,
  },
  partner_perk: {
    label: "Vantaggio partner",
    description: "Coupon o vantaggio presso partner selezionati",
    cost: 2500,
  },
} as const;

export const ARTIST_REWARDS_CATALOG = {
  sponsored_profile_feed: {
    label: "Profilo sponsorizzato nel feed",
    description: "Boost gratuito del profilo nel feed di Vibyng",
    cost: 500,
  },
  sponsored_video_flow: {
    label: "Video sponsorizzato in Flow",
    description: "Promozione di un video nella sezione Flow",
    cost: 1000,
  },
  partner_discount_25: {
    label: "Sconto partner 25%",
    description: "25% di sconto per un solo acquisto presso partner aderenti",
    cost: 1500,
  },
  indie_single_recording: {
    label: "Registrazione singolo",
    description: "Possibilità di registrare un singolo presso partner aderenti, previa disponibilità",
    cost: 2500,
  },
} as const;

export type PointsAction = keyof typeof POINT_RULES;
export type FanRewardCode = keyof typeof FAN_REWARDS_CATALOG;
export type ArtistRewardCode = keyof typeof ARTIST_REWARDS_CATALOG;
export type RewardCode = FanRewardCode | ArtistRewardCode;

type AwardPointsInput = {
  userId: number;
  action: PointsAction;
  referenceType: string;
  referenceId: number;
  content?: string | null;
};

type AwardPointsResult = {
  awarded: number;
  reason:
    | "awarded"
    | "daily_cap_partial"
    | "daily_cap_reached"
    | "action_daily_limit_reached"
    | "already_awarded"
    | "invalid_comment"
    | "user_not_found";
};

type RedeemPointsInput = {
  userId: number;
  rewardCode: RewardCode;
};

function getRewardsCatalogForRole(role?: string) {
  return role === "artist" ? ARTIST_REWARDS_CATALOG : FAN_REWARDS_CATALOG;
}

export function getTodayWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function isMeaningfulComment(content: string): boolean {
  const normalized = String(content ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length < 8) return false;

  const withoutMentions = normalized.replace(/@[A-Za-z0-9._-]+/g, "").trim();
  if (withoutMentions.length < 8) return false;

  const alphaNumCount = (withoutMentions.match(/[A-Za-zÀ-ÿ0-9]/g) ?? []).length;
  return alphaNumCount >= 3;
}

async function getTodayEarnedPoints(userId: number): Promise<number> {
  const { start, end } = getTodayWindow();

  const result = await db.execute(sql`
    SELECT COALESCE(SUM(points), 0)::int AS total
    FROM points_transactions
    WHERE user_id = ${userId}
      AND created_at >= ${start}
      AND created_at <= ${end}
  `);

  return Number(result.rows[0]?.total ?? 0);
}

async function getTodayActionCount(
  userId: number,
  action: PointsAction
): Promise<number> {
  const { start, end } = getTodayWindow();

  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM points_transactions
    WHERE user_id = ${userId}
      AND action = ${action}
      AND created_at >= ${start}
      AND created_at <= ${end}
  `);

  return Number(result.rows[0]?.total ?? 0);
}

async function hasExistingAward(
  userId: number,
  action: PointsAction,
  referenceType: string,
  referenceId: number
): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT id
    FROM points_transactions
    WHERE user_id = ${userId}
      AND action = ${action}
      AND reference_type = ${referenceType}
      AND reference_id = ${referenceId}
    LIMIT 1
  `);

  return result.rows.length > 0;
}

export async function awardPoints(
  input: AwardPointsInput
): Promise<AwardPointsResult> {
  const { userId, action, referenceType, referenceId, content } = input;

  const rule = POINT_RULES[action];

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return { awarded: 0, reason: "user_not_found" };
  }

  if ("minLength" in rule && rule.minLength) {
    if (!isMeaningfulComment(content ?? "")) {
      return { awarded: 0, reason: "invalid_comment" };
    }
  }

  const alreadyAwarded = await hasExistingAward(
    userId,
    action,
    referenceType,
    referenceId
  );

  if (alreadyAwarded) {
    return { awarded: 0, reason: "already_awarded" };
  }

  const todayActionCount = await getTodayActionCount(userId, action);
  if (todayActionCount >= rule.dailyLimit) {
    return { awarded: 0, reason: "action_daily_limit_reached" };
  }

  const todayEarned = await getTodayEarnedPoints(userId);
  if (todayEarned >= DAILY_POINTS_CAP) {
    return { awarded: 0, reason: "daily_cap_reached" };
  }

  const remainingToday = DAILY_POINTS_CAP - todayEarned;
  const awardedPoints = Math.min(rule.points, remainingToday);

  if (awardedPoints <= 0) {
    return { awarded: 0, reason: "daily_cap_reached" };
  }

  await db.insert(pointsTransactions).values({
    userId,
    action,
    points: awardedPoints,
    referenceType,
    referenceId,
  });

  await db
    .update(users)
    .set({
      vibyngPoints: sql`${users.vibyngPoints} + ${awardedPoints}`,
    })
    .where(eq(users.id, userId));

  return {
    awarded: awardedPoints,
    reason: awardedPoints < rule.points ? "daily_cap_partial" : "awarded",
  };
}

export async function redeemPoints(
  input: RedeemPointsInput
): Promise<RedeemPointsResult> {
  const { userId, rewardCode } = input;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return { success: false, pointsSpent: 0, reason: "user_not_found" };
  }

  const rewardsCatalog = getRewardsCatalogForRole(user.role);
  const reward = rewardsCatalog[rewardCode as keyof typeof rewardsCatalog];

  if (!reward) {
    return { success: false, pointsSpent: 0, reason: "reward_not_found" };
  }

  if ((user.vibyngPoints ?? 0) < reward.cost) {
    return { success: false, pointsSpent: 0, reason: "insufficient_points" };
  }

  await db
    .update(users)
    .set({
      vibyngPoints: sql`${users.vibyngPoints} - ${reward.cost}`,
    })
    .where(eq(users.id, userId));

  await db.insert(pointsRedemptions).values({
    userId,
    rewardCode,
    pointsSpent: reward.cost,
  });

  return {
    success: true,
    pointsSpent: reward.cost,
    reason: "redeemed",
  };
}

export async function getPointsStatus(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    return null;
  }

  const todayEarned = await getTodayEarnedPoints(userId);
  const remainingToday = Math.max(0, DAILY_POINTS_CAP - todayEarned);

  const recentTransactions = await db
    .select()
    .from(pointsTransactions)
    .where(eq(pointsTransactions.userId, userId))
    .orderBy(desc(pointsTransactions.createdAt))
    .limit(20);

  const recentRedemptions = await db
    .select()
    .from(pointsRedemptions)
    .where(eq(pointsRedemptions.userId, userId))
    .orderBy(desc(pointsRedemptions.createdAt))
    .limit(20);

  const rewardsCatalog = getRewardsCatalogForRole(user.role);

  const rewards = Object.entries(rewardsCatalog).map(([code, reward]) => ({
    code,
    ...reward,
  }));

  return {
    balance: user.vibyngPoints ?? 0,
    todayEarned,
    dailyCap: DAILY_POINTS_CAP,
    remainingToday,
    userRole: user.role,
    rewards,
    recentTransactions,
    recentRedemptions,
  };
}
