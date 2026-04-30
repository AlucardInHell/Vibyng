import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { api } from "@shared/routes";
import { awardPoints, getPointsStatus, redeemPoints } from "./vibyng-points";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import crypto from "crypto";
import { Resend } from "resend";
import Stripe from "stripe";

const resend = new Resend(process.env.RESEND_API_KEY);
const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;


function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function sendMentionNotifications(content: string, authorId: number) {
  try {
    const mentions = content.match(/@[A-Za-z0-9._-]+/g);
    if (!mentions) return;
    for (const mention of mentions) {
      const username = mention.substring(1);
      const mentionedUser = await storage.getUserByUsername(username);
      if (mentionedUser && mentionedUser.id !== authorId) {
        const author = await storage.getUser(authorId);
        await storage.createNotification({
          userId: mentionedUser.id,
          type: "mention",
          message: `${author?.displayName || "Qualcuno"} ti ha taggato`,
          relatedUserId: authorId,
        });
      }
    }
  } catch {}
}

async function hasAnyUserBlock(userAId: number, userBId: number): Promise<boolean> {
  if (!userAId || !userBId) return false;

  const result = await db.execute(sql`
    SELECT id
    FROM user_blocks
    WHERE
      (blocker_id = ${userAId} AND blocked_id = ${userBId})
      OR
      (blocker_id = ${userBId} AND blocked_id = ${userAId})
    LIMIT 1
  `);

  return result.rows.length > 0;
}

async function denyIfBlocked(
  res: any,
  actorId: number,
  targetOwnerId: number,
  message = "Interazione non consentita perché tra questi profili esiste un blocco."
): Promise<boolean> {
  if (!actorId || !targetOwnerId) return false;
  if (Number(actorId) === Number(targetOwnerId)) return false;

  const blocked = await hasAnyUserBlock(Number(actorId), Number(targetOwnerId));

  if (blocked) {
    res.status(403).json({
      message,
      code: "USER_BLOCKED",
    });
    return true;
  }

  return false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

await db.execute(sql`
  ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0
`);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS comment_likes (
    id serial PRIMARY KEY,
    comment_id integer NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now()
  )
`);

await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS comment_likes_comment_user_idx
  ON comment_likes (comment_id, user_id)
`);
  
  await db.execute(sql`
    ALTER TABLE photo_comments
    ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS photo_comment_likes (
      id serial PRIMARY KEY,
      comment_id integer NOT NULL REFERENCES photo_comments(id) ON DELETE CASCADE,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS photo_comment_likes_comment_user_idx
    ON photo_comment_likes (comment_id, user_id)
  `);

  await db.execute(sql`
  ALTER TABLE artist_videos
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0
`);

  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS video_likes (
    id serial PRIMARY KEY,
    video_id integer NOT NULL REFERENCES artist_videos(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now()
  )
`);

await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS video_likes_video_user_idx
  ON video_likes (video_id, user_id)
`);

await db.execute(sql`
  ALTER TABLE video_comments
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0
`);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS video_comment_likes (
    id serial PRIMARY KEY,
    comment_id integer NOT NULL REFERENCES video_comments(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now()
  )
`);

await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS video_comment_likes_comment_user_idx
  ON video_comment_likes (comment_id, user_id)
`);

 await db.execute(sql`
  CREATE TABLE IF NOT EXISTS story_likes (
    id serial PRIMARY KEY,
    story_id integer NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now()
  )
`);

await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS story_likes_story_user_idx
  ON story_likes (story_id, user_id)
`);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS points_transactions (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action text NOT NULL,
    points integer NOT NULL,
    reference_type text NOT NULL,
    reference_id integer NOT NULL,
    created_at timestamp DEFAULT now()
  )
`);

await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS points_transactions_unique_action_ref_idx
  ON points_transactions (user_id, action, reference_type, reference_id)
`);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS points_redemptions (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_code text NOT NULL,
    points_spent integer NOT NULL,
    created_at timestamp DEFAULT now()
  )
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS goal_id integer REFERENCES artist_goals(id) ON DELETE SET NULL
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS message text
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS is_subscription boolean NOT NULL DEFAULT false
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid'
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS stripe_session_id text
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text
`);

await db.execute(sql`
  ALTER TABLE supports
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()
`);

await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS supports_stripe_session_id_idx
  ON supports (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL
`);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS user_blocks (
    id serial PRIMARY KEY,
    blocker_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now(),
    CONSTRAINT user_blocks_no_self_block CHECK (blocker_id <> blocked_id)
  )
`);

await db.execute(sql`
  CREATE UNIQUE INDEX IF NOT EXISTS user_blocks_blocker_blocked_idx
  ON user_blocks (blocker_id, blocked_id)
`);

await db.execute(sql`
  CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx
  ON user_blocks (blocked_id)
`);

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS content_reports (
    id serial PRIMARY KEY,
    reporter_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type text NOT NULL,
    target_id text NOT NULL,
    target_owner_id integer REFERENCES users(id) ON DELETE SET NULL,
    reason text NOT NULL,
    details text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp DEFAULT now()
  )
`);

await db.execute(sql`
  CREATE INDEX IF NOT EXISTS content_reports_target_idx
  ON content_reports (target_type, target_id)
`);

await db.execute(sql`
  CREATE INDEX IF NOT EXISTS content_reports_reporter_idx
  ON content_reports (reporter_id)
`);

await db.execute(sql`
  CREATE INDEX IF NOT EXISTS content_reports_status_idx
  ON content_reports (status)
`);

// === BLOCKS & REPORTS ===
  app.post("/api/users/:blockerId/block/:blockedId", async (req, res) => {
    try {
      const blockerId = Number(req.params.blockerId);
      const blockedId = Number(req.params.blockedId);

      if (!blockerId || !blockedId) {
        return res.status(400).json({ message: "ID utente non valido" });
      }

      if (blockerId === blockedId) {
        return res.status(400).json({ message: "Non puoi bloccare il tuo stesso profilo" });
      }

      const blocker = await storage.getUser(blockerId);
      const blocked = await storage.getUser(blockedId);

      if (!blocker || !blocked) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

     await db.execute(sql`
  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (${blockerId}, ${blockedId})
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING
`);

await db.execute(sql`
  DELETE FROM followers
  WHERE
    (fan_id = ${blockerId} AND artist_id = ${blockedId})
    OR
    (fan_id = ${blockedId} AND artist_id = ${blockerId})
`);

res.json({ success: true, blocked: true });
    } catch (err: any) {
      console.error("[block-user] error:", err?.message || err);
      res.status(400).json({
        message: "Errore nel blocco del profilo",
        detail: err?.message,
      });
    }
  });

  app.delete("/api/users/:blockerId/block/:blockedId", async (req, res) => {
    try {
      const blockerId = Number(req.params.blockerId);
      const blockedId = Number(req.params.blockedId);

      if (!blockerId || !blockedId) {
        return res.status(400).json({ message: "ID utente non valido" });
      }

      await db.execute(sql`
        DELETE FROM user_blocks
        WHERE blocker_id = ${blockerId}
          AND blocked_id = ${blockedId}
      `);

      res.json({ success: true, blocked: false });
    } catch (err: any) {
      console.error("[unblock-user] error:", err?.message || err);
      res.status(400).json({
        message: "Errore nello sblocco del profilo",
        detail: err?.message,
      });
    }
  });

  app.get("/api/users/:viewerId/blocked/:targetId", async (req, res) => {
    try {
      const viewerId = Number(req.params.viewerId);
      const targetId = Number(req.params.targetId);

      if (!viewerId || !targetId) {
        return res.status(400).json({ message: "ID utente non valido" });
      }

      const directBlock = await db.execute(sql`
        SELECT id
        FROM user_blocks
        WHERE blocker_id = ${viewerId}
          AND blocked_id = ${targetId}
        LIMIT 1
      `);

      const reverseBlock = await db.execute(sql`
        SELECT id
        FROM user_blocks
        WHERE blocker_id = ${targetId}
          AND blocked_id = ${viewerId}
        LIMIT 1
      `);

      res.json({
        blockedByViewer: directBlock.rows.length > 0,
        blockedViewer: reverseBlock.rows.length > 0,
        anyBlock: directBlock.rows.length > 0 || reverseBlock.rows.length > 0,
      });
    } catch (err: any) {
      console.error("[check-block] error:", err?.message || err);
      res.status(400).json({
        message: "Errore nella verifica del blocco",
        detail: err?.message,
      });
    }
  });

  app.get("/api/users/:userId/blocked-users", async (req, res) => {
    try {
      const userId = Number(req.params.userId);

      if (!userId) {
        return res.status(400).json({ message: "ID utente non valido" });
      }

      const result = await db.execute(sql`
        SELECT
          u.id,
          u.username,
          u.display_name,
          u.avatar_url,
          u.role,
          ub.created_at AS blocked_at
        FROM user_blocks ub
        JOIN users u ON u.id = ub.blocked_id
        WHERE ub.blocker_id = ${userId}
        ORDER BY ub.created_at DESC
      `);

      res.json(result.rows);
    } catch (err: any) {
      console.error("[blocked-users] error:", err?.message || err);
      res.status(400).json({
        message: "Errore nel recupero dei profili bloccati",
        detail: err?.message,
      });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const reporterId = Number(req.body.reporterId);
      const targetType = String(req.body.targetType || "").trim();
      const targetId = String(req.body.targetId || "").trim();
      const targetOwnerId = req.body.targetOwnerId ? Number(req.body.targetOwnerId) : null;
      const reason = String(req.body.reason || "").trim();
      const details = req.body.details ? String(req.body.details).trim() : null;

      const allowedTargetTypes = new Set([
        "user",
        "post",
        "photo",
        "video",
        "comment",
        "story",
        "message",
      ]);

      const allowedReasons = new Set([
        "offensive",
        "violent",
        "pornographic",
        "harassment",
        "hate",
        "spam",
        "self_harm",
        "fake_profile",
        "other",
      ]);

      if (!reporterId) {
        return res.status(400).json({ message: "Reporter non valido" });
      }

      if (!allowedTargetTypes.has(targetType)) {
        return res.status(400).json({ message: "Tipo contenuto non valido" });
      }

      if (!targetId) {
        return res.status(400).json({ message: "ID contenuto non valido" });
      }

      if (!allowedReasons.has(reason)) {
        return res.status(400).json({ message: "Motivo segnalazione non valido" });
      }

      const reporter = await storage.getUser(reporterId);

      if (!reporter) {
        return res.status(404).json({ message: "Utente segnalante non trovato" });
      }

     const result = await db.execute(sql`
  INSERT INTO content_reports (
    reporter_id,
    target_type,
    target_id,
    target_owner_id,
    reason,
    details,
    status
  )
  VALUES (
    ${reporterId},
    ${targetType},
    ${targetId},
    ${targetOwnerId},
    ${reason},
    ${details},
    'pending'
  )
  RETURNING *
`);

try {
  const reportsEmail = process.env.REPORTS_EMAIL?.trim();

  if (reportsEmail) {
    const reportedUser = targetOwnerId ? await storage.getUser(targetOwnerId) : null;

    await resend.emails.send({
      from: "Vibyng <noreply@mail.vibyng.com>",
      to: reportsEmail,
      subject: `Nuova segnalazione Vibyng: ${targetType}`,
      html: `
        <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
          <h2>Nuova segnalazione su Vibyng</h2>

          <p><strong>ID segnalazione:</strong> ${result.rows[0]?.id}</p>
          <p><strong>Tipo contenuto:</strong> ${targetType}</p>
          <p><strong>ID contenuto/profilo:</strong> ${targetId}</p>
          <p><strong>Motivo:</strong> ${reason}</p>
          <p><strong>Dettagli:</strong> ${details || "Nessun dettaglio fornito"}</p>

          <hr />

          <p><strong>Segnalante ID:</strong> ${reporterId}</p>
          <p><strong>Segnalante:</strong> ${reporter.displayName} (@${reporter.username})</p>

          ${
            reportedUser
              ? `
                <p><strong>Profilo segnalato ID:</strong> ${reportedUser.id}</p>
                <p><strong>Profilo segnalato:</strong> ${reportedUser.displayName} (@${reportedUser.username})</p>
              `
              : ""
          }

          <p><strong>Status:</strong> pending</p>
        </div>
      `,
    });
  }
} catch (emailErr: any) {
  console.error("[report-email] error:", emailErr?.message || emailErr);
}

res.status(201).json({
  success: true,
  report: result.rows[0],
});
    } catch (err: any) {
      console.error("[create-report] error:", err?.message || err);
      res.status(400).json({
        message: "Errore nella creazione della segnalazione",
        detail: err?.message,
      });
    }
  });
  
  // === USERS ===
  app.get(api.users.artists.path, async (_req, res) => {
    const artists = await storage.getArtists();
    res.json(artists);
  });

  app.get("/api/users", async (_req, res) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers);
  });

 app.get("/api/users/search", async (req, res) => {
  const query = req.query.q as string || "";
  const role = req.query.role as string || "all";
  const results = await storage.searchUsers(query || "", role !== "all" ? role : undefined);
  res.json(results);
});

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
   if (!user.emailVerified) {
      return res.status(401).json({ message: "Devi confermare la tua email prima di accedere. Controlla la tua casella di posta." });
    }
    res.json(user);
  });

  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === UPDATE USER ===
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { displayName, username, email, bio, avatarUrl } = req.body;
      const updated = await storage.updateUser(id, { displayName, username, email, bio, avatarUrl });
      if (!updated) {
        return res.status(404).json({ message: "Utente non trovato" });
      }
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Errore nell'aggiornamento del profilo" });
    }
  });

app.get("/api/vpoints/:userId/status", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const status = await getPointsStatus(userId);

      if (!status) {
        return res.status(404).json({ message: "Utente non trovato" });
      }

      res.json(status);
    } catch (err: any) {
      res.status(400).json({ message: "Errore nel recupero stato VibyngPoints", detail: err?.message });
    }
  });

  app.post("/api/vpoints/redeem", async (req, res) => {
    try {
      const userId = Number(req.body.userId);
      const rewardCode = String(req.body.rewardCode ?? "");

      const result = await redeemPoints({
        userId,
        rewardCode: rewardCode as any,
      });

      if (!result.success) {
        const statusCode =
          result.reason === "user_not_found" ? 404 :
          result.reason === "reward_not_found" ? 400 :
          result.reason === "insufficient_points" ? 400 :
          400;

        return res.status(statusCode).json(result);
      }

      const status = await getPointsStatus(userId);

      res.json({
        ...result,
        status,
      });
    } catch (err: any) {
      res.status(400).json({ message: "Errore nel riscatto dei VibyngPoints", detail: err?.message });
    }
  });

// === STRIPE SUPPORT CHECKOUT ===
  app.post("/api/stripe/create-support-checkout-session", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({
          message: "Configurazione Stripe mancante",
          detail: "STRIPE_SECRET_KEY non è impostata nelle variabili ambiente",
        });
      }

      const fanId = Number(req.body.fanId);
      const artistId = Number(req.body.artistId);
      const goalId = req.body.goalId ? Number(req.body.goalId) : null;
      const mode = String(req.body.mode || "one_time");
      const amount = Number(req.body.amount);

      if (!fanId || !artistId) {
        return res.status(400).json({
          message: "Dati mancanti",
          detail: "fanId e artistId sono obbligatori",
        });
      }

      if (fanId === artistId) {
        return res.status(400).json({
          message: "Operazione non consentita",
          detail: "Non puoi supportare economicamente il tuo stesso profilo",
        });
      }

      const fan = await storage.getUser(fanId);
      const artist = await storage.getUser(artistId);

      if (!fan) {
        return res.status(404).json({
          message: "Fan non trovato",
        });
      }

      if (!artist) {
        return res.status(404).json({
          message: "Artista non trovato",
        });
      }

      const isMonthly = mode === "monthly";
      const checkoutMode: Stripe.Checkout.SessionCreateParams.Mode = isMonthly
        ? "subscription"
        : "payment";

      const monthlyPriceId = process.env.STRIPE_MONTHLY_SUPPORT_PRICE_ID?.trim();
      const applicationFeePercentRaw = process.env.STRIPE_APPLICATION_FEE_PERCENT?.trim();
      const applicationFeePercent = applicationFeePercentRaw
        ? Number(applicationFeePercentRaw)
        : null;

      const finalAmount = isMonthly ? 4.99 : amount;

      if (!Number.isFinite(finalAmount) || finalAmount < 1) {
        return res.status(400).json({
          message: "Importo non valido",
          detail: "L'importo deve essere almeno pari a 1 euro",
        });
      }

      if (
        applicationFeePercent !== null &&
        (!Number.isFinite(applicationFeePercent) ||
          applicationFeePercent < 0 ||
          applicationFeePercent > 100)
      ) {
        return res.status(400).json({
          message: "Commissione piattaforma non valida",
          detail: "STRIPE_APPLICATION_FEE_PERCENT deve essere un numero tra 0 e 100",
        });
      }

      const unitAmount = Math.round(finalAmount * 100);

      const appUrl = (
        process.env.APP_URL ||
        req.headers.origin ||
        "https://vibyng-production.up.railway.app"
      ).replace(/\/$/, "");

      const productName = isMonthly
        ? `Supporto mensile a ${artist.displayName}`
        : `Supporto a ${artist.displayName}`;

     const lineItem: Stripe.Checkout.SessionCreateParams.LineItem =
        isMonthly && monthlyPriceId
          ? {
              price: monthlyPriceId,
              quantity: 1,
            }
          : {
              price_data: {
                currency: "eur",
                product_data: {
                  name: productName,
                  description: goalId
                    ? "Supporto economico collegato a un obiettivo artista su Vibyng"
                    : "Supporto economico artista su Vibyng",
                },
                unit_amount: unitAmount,
                ...(isMonthly
                  ? {
                      recurring: {
                        interval: "month",
                      },
                    }
                  : {}),
              },
              quantity: 1,
            };

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: checkoutMode,
        payment_method_types: ["card"],
        customer_email: fan.email || undefined,
        line_items: [lineItem],
        success_url: `${appUrl}/artist/${artistId}?support=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/artist/${artistId}?support=cancelled`,
        client_reference_id: `support_${fanId}_${artistId}_${Date.now()}`,
        submit_type: isMonthly ? "subscribe" : "donate",
        metadata: {
          fanId: String(fanId),
          artistId: String(artistId),
          goalId: goalId ? String(goalId) : "",
          mode,
          amount: String(finalAmount),
          source: "vibyng_support",
        },
      };

      const artistConnectedAccountId = artist.stripeConnectedAccountId;
      const artistStripeReady = Boolean(
        artistConnectedAccountId && artist.stripeOnboardingComplete
      );

      if (artistStripeReady && applicationFeePercent !== null) {
        if (isMonthly) {
          sessionParams.subscription_data = {
            application_fee_percent: applicationFeePercent,
            transfer_data: {
              destination: artistConnectedAccountId!,
            },
          };
        } else {
          sessionParams.payment_intent_data = {
            application_fee_amount: Math.round(unitAmount * (applicationFeePercent / 100)),
            transfer_data: {
              destination: artistConnectedAccountId!,
            },
          };
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        return res.status(500).json({
          message: "URL Stripe non generato",
        });
      }

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[stripe-support-checkout] error:", err?.message || err);

      res.status(500).json({
        message: "Errore nella creazione del pagamento Stripe",
        detail: err?.message,
      });
    }
  });

  // === STRIPE WEBHOOK ===
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({
          message: "Configurazione Stripe mancante",
          detail: "STRIPE_SECRET_KEY non è impostata nelle variabili ambiente",
        });
      }

      if (!stripeWebhookSecret) {
        return res.status(500).json({
          message: "Configurazione webhook Stripe mancante",
          detail: "STRIPE_WEBHOOK_SECRET non è impostata nelle variabili ambiente",
        });
      }

      const signature = req.headers["stripe-signature"];

      if (!signature || typeof signature !== "string") {
        return res.status(400).json({
          message: "Firma Stripe mancante",
        });
      }

      const rawBody = req.rawBody;

      if (!Buffer.isBuffer(rawBody)) {
        return res.status(400).json({
          message: "Raw body non disponibile per la verifica Stripe",
        });
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          stripeWebhookSecret
        );
      } catch (err: any) {
        console.error("[stripe-webhook] signature error:", err?.message || err);

        return res.status(400).json({
          message: "Firma webhook Stripe non valida",
          detail: err?.message,
        });
      }

      if (event.type !== "checkout.session.completed") {
        return res.json({
          received: true,
          ignored: true,
          type: event.type,
        });
      }

      const session = event.data.object as Stripe.Checkout.Session;

      const fanId = Number(session.metadata?.fanId);
      const artistId = Number(session.metadata?.artistId);
      const goalIdRaw = session.metadata?.goalId;
      const goalId = goalIdRaw ? Number(goalIdRaw) : null;
      const mode = session.metadata?.mode || "one_time";
      const amountFromMetadata = Number(session.metadata?.amount);
      const amountFromStripe = session.amount_total
        ? session.amount_total / 100
        : null;

      const finalAmount = Number.isFinite(amountFromMetadata) && amountFromMetadata > 0
        ? amountFromMetadata
        : amountFromStripe;

      if (!fanId || !artistId || !finalAmount || !Number.isFinite(finalAmount)) {
        return res.status(400).json({
          message: "Metadata pagamento Stripe non valide",
          detail: {
            fanId,
            artistId,
            goalId,
            mode,
            finalAmount,
          },
        });
      }

      const support = await storage.createSupport({
        fanId,
        artistId,
        goalId,
        amount: finalAmount.toFixed(2),
        message: null,
        isSubscription: mode === "monthly",
        status: "paid",
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        stripeSubscriptionId:
          typeof session.subscription === "string"
            ? session.subscription
            : null,
        stripeInvoiceId:
          typeof session.invoice === "string"
            ? session.invoice
            : null,
      });

      try {
        await awardPoints({
          userId: fanId,
          action: "support_sent",
          referenceType: "support",
          referenceId: Number(support.id),
        });
      } catch (pointsErr: any) {
        console.error("[points-support-sent]", pointsErr?.message || pointsErr);
      }

      try {
        const fan = await storage.getUser(fanId);

        await storage.createNotification({
          userId: artistId,
          type: "support",
          message: `${fan?.displayName || "Un fan"} ti ha supportato con €${finalAmount.toFixed(2)}`,
          relatedUserId: fanId,
        });
      } catch (notificationErr: any) {
        console.error("[support-notification]", notificationErr?.message || notificationErr);
      }

      res.json({
        received: true,
        supportId: support.id,
      });
    } catch (err: any) {
      const message = String(err?.message || "");

      if (
        message.includes("supports_stripe_session_id_idx") ||
        message.includes("duplicate key value")
      ) {
        return res.json({
          received: true,
          duplicate: true,
        });
      }

      console.error("[stripe-webhook] error:", err?.message || err);

      res.status(500).json({
        message: "Errore nella gestione del webhook Stripe",
        detail: err?.message,
      });
    }
  });

  // === OBJECT STORAGE ===
  // === AUTH ===
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, username, displayName, role } = req.body;
    if (!email || !password || !username || !displayName) {
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
    }
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ message: "Username già in uso" });
    }
    const allUsers = await storage.getAllUsers();
    const emailExists = allUsers.find(u => u.email === email);
    if (emailExists) {
      return res.status(400).json({ message: "Email già registrata" });
    }
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const user = await storage.createUser({
      email,
      password: hashPassword(password),
      username,
      displayName,
      role: role || "fan",
      emailVerified: false,
      verificationToken,
    });
    const verifyUrl = `${process.env.APP_URL || "https://vibyng-production.up.railway.app"}/api/auth/verify?token=${verificationToken}`;
    await resend.emails.send({
     from: "Vibyng <noreply@mail.vibyng.com>",
      to: email,
      subject: "Conferma il tuo account Vibyng",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0f0a1e; color: white; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #7c3aed; font-size: 28px; margin: 0;">vibyng</h1>
            <p style="color: #9c88cc; margin-top: 8px;">La community della musica indipendente</p>
          </div>
          <h2 style="color: white;">Benvenuto, ${displayName}! 🎵</h2>
          <p style="color: #9c88cc;">Grazie per esserti registrato. Clicca il pulsante qui sotto per confermare il tuo account:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="background: linear-gradient(135deg, #7c3aed, #db2777); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; max-width: 80%; word-break: break-word; box-sizing: border-box;">
              Conferma Account
            </a>
              Conferma Account
            </a>
          </div>
          <p style="color: #5a4a7a; font-size: 12px; text-align: center;">Se non hai creato un account su Vibyng, ignora questa email.</p>
        </div>
      `,
    });
    res.status(201).json({ message: "Registrazione completata! Controlla la tua email per confermare l'account." });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Errore durante la registrazione" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email e password sono obbligatori" });
    }
    const allUsers = await storage.getAllUsers();
    const user = allUsers.find(u => u.email === email);
   if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Email o password non corretti" });
    }
    if (!user.emailVerified) {
      return res.status(401).json({ message: "Devi confermare la tua email prima di accedere. Controlla la tua casella di posta." });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ message: "Errore durante il login" });
  }
});
  app.get("/api/auth/verify", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send("Token mancante");
    }
    const allUsers = await storage.getAllUsers();
    const user = allUsers.find(u => u.verificationToken === token);
    if (!user) {
      return res.status(400).send("Token non valido o già utilizzato");
    }
    await storage.updateUser(user.id, { emailVerified: true, verificationToken: null } as any);
    res.redirect("https://vibyng-production.up.railway.app?verified=true");
  } catch (err) {
    res.status(500).send("Errore durante la verifica");
  }
});
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ success: true, message: "Se l'email esiste, riceverai un link di recupero" });
      }
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      await storage.setPasswordResetToken(user.id, token);
      const resetLink = `${process.env.APP_URL || "https://vibyng-production.up.railway.app"}/reset-password?token=${token}`;
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Vibyng <noreply@mail.vibyng.com>",
        to: email,
        subject: "Recupero password Vibyng",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Recupero password</h2>
            <p>Hai richiesto di reimpostare la tua password su Vibyng.</p>
            <p>Clicca sul link qui sotto per creare una nuova password:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Reimposta password
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">Il link scade tra 1 ora. Se non hai richiesto il recupero, ignora questa email.</p>
          </div>
        `,
      });
      res.json({ success: true });
   }  catch (err: any) {
      console.error(`[forgot-password] error:`, err?.message || err);
    res.status(400).json({ message: "Errore nell'invio dell'email", detail: err?.message });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Token non valido o scaduto" });
      }
      const crypto = await import("crypto");
      const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
      await storage.resetPassword(user.id, hashedPassword);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: "Errore nel reset della password" });
    }
  });
  // === AUDIO UPLOAD (Cloudinary) ===
  app.post("/api/uploads/audio", async (req, res) => {
    try {
      const { audioData, title, artistId } = req.body;
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const result = await cloudinary.uploader.upload(audioData, {
        resource_type: "video",
        folder: "vibyng/songs",
        public_id: `song_${artistId}_${Date.now()}`,
      });
      res.json({ url: result.secure_url });
    } catch (err: any) {
      console.error("[upload-audio] error:", err?.message);
      res.status(400).json({ message: "Errore nel caricamento audio", detail: err?.message });
    }
  });

  // === CLOUDINARY SIGNED VIDEO UPLOAD ===
app.post("/api/cloudinary/sign-video-upload", async (req, res) => {
  try {
    const userId = Number(req.body.userId);

    if (!userId) {
      return res.status(400).json({ message: "User ID mancante" });
    }

    const { v2: cloudinary } = await import("cloudinary");

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({ message: "Configurazione Cloudinary mancante" });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = "vibyng/videos";
    const publicId = `video_${userId}_${Date.now()}`;

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
        public_id: publicId,
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      publicId,
      signature,
    });
  } catch (err: any) {
    console.error("[cloudinary-sign-video-upload] error:", err?.message);
    res.status(400).json({
      message: "Errore nella firma dell'upload video",
      detail: err?.message,
    });
  }
});
  // === VIDEO UPLOAD (Cloudinary) ===
  app.post("/api/uploads/video", async (req, res) => {
    try {
      const { videoData, userId } = req.body;
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const result = await cloudinary.uploader.upload(videoData, {
        resource_type: "video",
        folder: "vibyng/videos",
        public_id: `video_${userId}_${Date.now()}`,
      });
      res.json({ url: result.secure_url });
    } catch (err: any) {
      console.error("[upload-video] error:", err?.message);
      res.status(400).json({ message: "Errore nel caricamento video", detail: err?.message });
    }
  });
  // === IMAGE UPLOAD (base64) ===
app.post("/api/uploads/image", async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: "Missing imageData" });
    }
    res.json({ objectPath: imageData });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});
  // === AVATAR UPLOAD ===
app.post("/api/uploads/avatar", async (req, res) => {
  try {
    const { imageData, userId } = req.body;
    if (!imageData || !userId) {
      return res.status(400).json({ error: "Missing imageData or userId" });
    }
    const updated = await storage.updateUser(Number(userId), { avatarUrl: imageData });
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ avatarUrl: imageData });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});;

  // === POSTS ===
 app.get(api.posts.list.path, async (_req, res) => {
  const posts = await storage.getPosts();
  const photos = await storage.getAllPhotosForFeed();
  const videos = await storage.getAllVideosForFeed();

  const photoItems = photos.map((p: any) => ({
    id: `photo_${p.id}`,
    type: "photo",
    authorId: p.artist_id,
    content:
      (p.description && p.description !== "Foto")
        ? p.description
        : (p.title && p.title !== "Foto" ? p.title : ""),
    mediaUrl: p.image_url,
    createdAt: p.created_at,
    likesCount: p.likes_count || 0,
    author: {
      id: p.artist_id,
      displayName: p.display_name,
      username: p.username,
      avatarUrl: p.avatar_url,
      role: p.role,
    },
    photoId: p.id,
  }));

  const videoItems = videos.map((v: any) => ({
    id: `video_${v.id}`,
    type: "video",
    authorId: v.artist_id,
    content: (v.title && v.title !== "Video") ? v.title : "",
    mediaUrl: v.video_url,
    thumbnailUrl: v.thumbnail_url,
    createdAt: v.created_at,
    likesCount: Number(v.likes_count ?? 0),
    author: {
      id: v.artist_id,
      displayName: v.display_name,
      username: v.username,
      avatarUrl: v.avatar_url,
      role: v.role,
    },
    videoId: v.id,
  }));

  const combined = [...posts, ...photoItems, ...videoItems].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json(combined);
});
  
  app.post(api.posts.create.path, async (req, res) => {
  try {
    const input = api.posts.create.input.parse(req.body);
    const post = await storage.createPost(input);

    try {
      await awardPoints({
        userId: Number(post.authorId),
        action: "post_create",
        referenceType: "post",
        referenceId: Number(post.id),
      });
    } catch (pointsErr: any) {
      console.error("[points-post-create]", pointsErr?.message);
    }

    await sendMentionNotifications(String(post.content ?? ""), Number(post.authorId));

    res.status(201).json(post);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: err.errors[0].message,
        field: err.errors[0].path.join('.'),
      });
    }
    throw err;
  }
});
app.get("/api/posts", async (req, res) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : null;
      let posts;
      if (userId) {
        const following = await storage.getFollowingByFan(userId);
        if (following.length > 0) {
          posts = await storage.getPostsByFollowing(following.map(f => f.id));
        } else {
          posts = await storage.getPosts();
        }
      } else {
        posts = await storage.getPosts();
      }
   res.json(posts);
    } catch (err) {
      res.status(400).json({ message: "Errore nel recupero post" });
    }
  });
  // === USER POSTS ===
  app.get("/api/users/:userId/posts", async (req, res) => {
    const userPosts = await storage.getPostsByUser(Number(req.params.userId));
    res.json(userPosts);
  });

// === LIKE POST ===
 app.post("/api/posts/:postId/like", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const userId = Number(req.body.userId);

    if (!postId || !userId) {
      return res.status(400).json({ message: "Dati like post non validi" });
    }

    const post = await storage.getPost(postId);

    if (!post) {
      return res.status(404).json({ message: "Post non trovato" });
    }

    if (await denyIfBlocked(
      res,
      userId,
      Number(post.authorId),
      "Non puoi interagire con questo post perché tra voi esiste un blocco."
    )) return;

    await storage.likePost(postId, userId);

    const updatedPost = await storage.getPost(postId);

    if (post.authorId !== userId) {
      const liker = await storage.getUser(userId);

      await storage.createNotification({
        userId: post.authorId,
        type: "like",
        message: `${liker?.displayName || "Qualcuno"} ha messo like al tuo post`,
        relatedUserId: userId,
        relatedPostId: postId,
      });
    }

    res.json({ success: true, likesCount: updatedPost?.likesCount ?? 0 });
  } catch (err: any) {
    console.error("[post-like]", err?.message || err);
    res.status(400).json({ message: "Errore nel mettere like" });
  }
});

  app.post("/api/posts/:postId/unlike", async (req, res) => {
    try {
      const postId = Number(req.params.postId);
      const { userId } = req.body;
      await storage.unlikePost(postId, userId);
      const post = await storage.getPost(postId);
      res.json({ success: true, likesCount: post?.likesCount ?? 0 });
    } catch (err) {
      res.status(400).json({ message: "Errore nel rimuovere like" });
    }
  });

  app.get("/api/posts/:postId/liked/:userId", async (req, res) => {
    try {
      const postId = Number(req.params.postId);
      const userId = Number(req.params.userId);
      const liked = await storage.hasLikedPost(postId, userId);
      res.json({ liked });
    } catch (err) {
      res.status(400).json({ message: "Errore" });
    }
  });

  // === COMMENTS ===
app.get("/api/posts/:postId/comments", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const postComments = await storage.getCommentsByPost(Number(req.params.postId));

    const commentsWithLikes = await Promise.all(
      postComments.map(async (c) => {
        const likesResult = await db.execute(sql`
          SELECT COUNT(*)::int AS count
          FROM comment_likes
          WHERE comment_id = ${c.id}
        `);

        const realLikesCount = Number(likesResult.rows[0]?.count ?? 0);

        if (Number(c.likesCount ?? 0) !== realLikesCount) {
          await db.execute(sql`
            UPDATE comments
            SET likes_count = ${realLikesCount}
            WHERE id = ${c.id}
          `);
        }

        if (!userId) {
          return {
            ...c,
            likesCount: realLikesCount,
            likedByMe: false,
          };
        }

        const likedResult = await db.execute(sql`
          SELECT id
          FROM comment_likes
          WHERE comment_id = ${c.id}
            AND user_id = ${userId}
          LIMIT 1
        `);

        return {
          ...c,
          likesCount: realLikesCount,
          likedByMe: likedResult.rows.length > 0,
        };
      })
    );

    res.json(commentsWithLikes);
  } catch (err: any) {
    console.error("[post-comments-get]", err?.message || err);
    res.status(400).json({
      message: "Errore nel recupero dei commenti",
      detail: err?.message,
    });
  }
});

app.post("/api/posts/:postId/comments", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const authorId = Number(req.body.authorId);
    const content = req.body.content;

    if (!postId || !authorId || !String(content ?? "").trim()) {
      return res.status(400).json({ message: "Dati commento non validi" });
    }

    const post = await storage.getPost(postId);

    if (!post) {
      return res.status(404).json({ message: "Post non trovato" });
    }

    if (await denyIfBlocked(
      res,
      authorId,
      Number(post.authorId),
      "Non puoi commentare questo post perché tra voi esiste un blocco."
    )) return;

    const comment = await storage.createComment({
      postId,
      authorId,
      content,
    });

    try {
      await awardPoints({
        userId: Number(authorId),
        action: "comment_post",
        referenceType: "comment",
        referenceId: Number(comment.id),
        content,
      });
    } catch (pointsErr: any) {
      console.error("[points-comment-post]", pointsErr?.message);
    }

    await sendMentionNotifications(String(content ?? ""), Number(authorId));

    res.status(201).json(comment);
  } catch (err: any) {
    console.error("[post-comment-create]", err?.message || err);
    res.status(400).json({ message: "Errore nel creare il commento" });
  }
});
  
  app.get("/api/posts/:postId/comments/count", async (req, res) => {
    const count = await storage.getCommentsCount(Number(req.params.postId));
    res.json({ count });
  });

  app.post("/api/comments/:commentId/like", async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = Number(req.body.userId);

    if (!commentId || !userId) {
      return res.status(400).json({ message: "Dati like commento non validi" });
    }

    const commentResult = await db.execute(sql`
      SELECT
        c.id,
        c.author_id,
        c.post_id,
        p.author_id AS post_author_id
      FROM comments c
      JOIN posts p ON p.id = c.post_id
      WHERE c.id = ${commentId}
      LIMIT 1
    `);

    const commentRow = commentResult.rows[0] as any;

    if (!commentRow) {
      return res.status(404).json({ message: "Commento non trovato" });
    }

    if (await denyIfBlocked(
      res,
      userId,
      Number(commentRow.author_id),
      "Non puoi mettere like a questo commento perché tra voi esiste un blocco."
    )) return;

    if (await denyIfBlocked(
      res,
      userId,
      Number(commentRow.post_author_id),
      "Non puoi interagire con questo post perché tra voi esiste un blocco."
    )) return;

    await db.execute(sql`
      INSERT INTO comment_likes (comment_id, user_id)
      VALUES (${commentId}, ${userId})
      ON CONFLICT (comment_id, user_id) DO NOTHING
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM comment_likes
      WHERE comment_id = ${commentId}
    `);

    const likesCount = Number(countResult.rows[0]?.count ?? 0);

    await db.execute(sql`
      UPDATE comments
      SET likes_count = ${likesCount}
      WHERE id = ${commentId}
    `);

    res.json({
      success: true,
      liked: true,
      likesCount,
    });
  } catch (err: any) {
    console.error("[comment-like]", err?.message || err);
    res.status(400).json({ message: "Errore nel like", detail: err?.message });
  }
});
 app.post("/api/comments/:commentId/unlike", async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const userId = Number(req.body.userId);

    if (!commentId || !userId) {
      return res.status(400).json({ message: "Dati unlike commento non validi" });
    }

    await db.execute(sql`
      DELETE FROM comment_likes
      WHERE comment_id = ${commentId}
        AND user_id = ${userId}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM comment_likes
      WHERE comment_id = ${commentId}
    `);

    const likesCount = Number(countResult.rows[0]?.count ?? 0);

    await db.execute(sql`
      UPDATE comments
      SET likes_count = ${likesCount}
      WHERE id = ${commentId}
    `);

    res.json({
      success: true,
      liked: false,
      likesCount,
    });
  } catch (err: any) {
    console.error("[comment-unlike]", err?.message || err);
    res.status(400).json({ message: "Errore nel unlike", detail: err?.message });
  }
});

  app.get("/api/comments/:commentId/liked/:userId", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const userId = Number(req.params.userId);
      const result = await db.execute(sql`SELECT id FROM comment_likes WHERE comment_id = ${commentId} AND user_id = ${userId}`);
      res.json({ liked: result.rows.length > 0 });
    } catch (err) {
      res.json({ liked: false });
    }
  });

  app.delete("/api/comments/:commentId", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      await storage.deleteComment(commentId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nell'eliminazione" });
    }
  });

  // === GOALS ===
  app.get(api.goals.listByArtist.path, async (req, res) => {
    const goals = await storage.getGoalsByArtist(Number(req.params.artistId));
    res.json(goals);
  });

  app.post(api.goals.create.path, async (req, res) => {
    try {
      const input = api.goals.create.input.parse(req.body);
      const goal = await storage.createGoal(input);
      res.status(201).json(goal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete("/api/goals/:goalId", async (req, res) => {
  try {
    const goalId = Number(req.params.goalId);
    const artistId = Number(req.body.artistId);

    if (!goalId || !artistId) {
      return res.status(400).json({ message: "Dati mancanti" });
    }

    const deleted = await storage.deleteGoal(goalId, artistId);

    if (!deleted) {
      return res.status(404).json({ message: "Obiettivo non trovato o non autorizzato" });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({
      message: "Errore nell'eliminazione dell'obiettivo",
      detail: err?.message,
    });
  }
}); 
  
  // === SUPPORTS ===
app.post(api.supports.create.path, async (req, res) => {
    try {
      const input = api.supports.create.input.parse(req.body);
      const support = await storage.createSupport(input);

      try {
        await awardPoints({
          userId: Number(input.fanId),
          action: "support_sent",
          referenceType: "support",
          referenceId: Number(support.id),
        });
      } catch (pointsErr: any) {
        console.error("[points-support-sent]", pointsErr?.message);
      }

      try {
        await awardPoints({
          userId: Number(input.artistId),
          action: "support_received",
          referenceType: "support",
          referenceId: Number(support.id),
        });
      } catch (pointsErr: any) {
        console.error("[points-support-received]", pointsErr?.message);
      }

      res.status(201).json(support);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === PHOTOS ===
  app.get(api.photos.listByArtist.path, async (req, res) => {
    const photos = await storage.getPhotosByArtist(Number(req.params.artistId));
    res.json(photos);
  });

  app.post(api.photos.create.path, async (req, res) => {
  try {
    const input = api.photos.create.input.parse(req.body);
    const photo = await storage.createPhoto(input);

    await sendMentionNotifications(String(input.title ?? ""), Number(input.artistId));

    res.status(201).json(photo);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: err.errors[0].message,
        field: err.errors[0].path.join('.'),
      });
    }
    throw err;
  }
});

app.post("/api/photos/:photoId/like", async (req, res) => {
  try {
    const photoId = Number(req.params.photoId);
    const { userId } = req.body;

    const inserted = await db.execute(sql`
      INSERT INTO photo_likes (photo_id, user_id)
      VALUES (${photoId}, ${userId})
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    if ((inserted.rows?.length ?? 0) > 0) {
      await db.execute(sql`
        UPDATE artist_photos
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = ${photoId}
      `);
    }

    const result = await db.execute(sql`
      SELECT likes_count, artist_id
      FROM artist_photos
      WHERE id = ${photoId}
    `);

    const photo = result.rows[0];

    if ((inserted.rows?.length ?? 0) > 0 && photo && userId && Number(photo.artist_id) !== Number(userId)) {
      const liker = await storage.getUser(userId);
      await storage.createNotification({
        userId: Number(photo.artist_id),
        type: "like",
        message: `${liker?.displayName || "Qualcuno"} ha messo like alla tua foto`,
        relatedUserId: userId,
      });
    }

    res.json({ success: true, likesCount: photo?.likes_count ?? 0 });
  } catch (err: any) {
    console.error("[photo-like]", err?.message);
    res.status(400).json({ message: "Errore nel like", detail: err?.message });
  }
});
 app.post("/api/photos/:photoId/unlike", async (req, res) => {
  try {
    const photoId = Number(req.params.photoId);
    const { userId } = req.body;

    const deleted = await db.execute(sql`
      DELETE FROM photo_likes
      WHERE photo_id = ${photoId} AND user_id = ${userId}
      RETURNING id
    `);

    if ((deleted.rows?.length ?? 0) > 0) {
      await db.execute(sql`
        UPDATE artist_photos
        SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
        WHERE id = ${photoId}
      `);
    }

    const result = await db.execute(sql`
      SELECT likes_count
      FROM artist_photos
      WHERE id = ${photoId}
    `);

    res.json({ success: true, likesCount: result.rows[0]?.likes_count ?? 0 });
  } catch (err: any) {
    res.status(400).json({ message: "Errore nel like" });
  }
});
  app.get("/api/photos/:photoId/liked/:userId", async (req, res) => {
    try {
      const photoId = Number(req.params.photoId);
      const userId = Number(req.params.userId);
      const result = await db.execute(sql`SELECT id FROM photo_likes WHERE photo_id = ${photoId} AND user_id = ${userId}`);
      res.json({ liked: result.rows.length > 0 });
    } catch (err) {
      res.json({ liked: false });
    }
  });

  // === VIDEOS ===
  app.get(api.videos.listByArtist.path, async (req, res) => {
  try {
    const artistId = Number(req.params.artistId);
    const result = await db.execute(sql`
      SELECT
        id,
        artist_id AS "artistId",
        title,
        video_url AS "videoUrl",
        thumbnail_url AS "thumbnailUrl",
        likes_count AS "likesCount",
        created_at AS "createdAt"
      FROM artist_videos
      WHERE artist_id = ${artistId}
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(400).json({ message: "Errore nel recupero video", detail: err?.message });
  }
});

  app.post(api.videos.create.path, async (req, res) => {
  try {
    const input = api.videos.create.input.parse(req.body);
    const video = await storage.createVideo(input);

    await sendMentionNotifications(String(input.title ?? ""), Number(input.artistId));

    res.status(201).json(video);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: err.errors[0].message,
        field: err.errors[0].path.join('.'),
      });
    }
    throw err;
  }
});

app.post("/api/videos/:videoId/like", async (req, res) => {
  try {
    const videoId = Number(req.params.videoId);
    const { userId } = req.body;

    const inserted = await db.execute(sql`
      INSERT INTO video_likes (video_id, user_id)
      VALUES (${videoId}, ${userId})
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    if ((inserted.rows?.length ?? 0) > 0) {
      await db.execute(sql`
        UPDATE artist_videos
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = ${videoId}
      `);
    }

    const result = await db.execute(sql`
      SELECT likes_count, artist_id
      FROM artist_videos
      WHERE id = ${videoId}
    `);

    const video = result.rows[0];

    if ((inserted.rows?.length ?? 0) > 0 && video && userId && Number(video.artist_id) !== Number(userId)) {
      const liker = await storage.getUser(userId);
      await storage.createNotification({
        userId: Number(video.artist_id),
        type: "like",
        message: `${liker?.displayName || "Qualcuno"} ha messo like al tuo video`,
        relatedUserId: userId,
      });
    }

    res.json({ success: true, likesCount: Number(video?.likes_count ?? 0) });
  } catch (err: any) {
    console.error("[video-like]", err?.message);
    res.status(400).json({ message: "Errore nel like", detail: err?.message });
  }
});

app.post("/api/videos/:videoId/unlike", async (req, res) => {
  try {
    const videoId = Number(req.params.videoId);
    const { userId } = req.body;

    const deleted = await db.execute(sql`
      DELETE FROM video_likes
      WHERE video_id = ${videoId} AND user_id = ${userId}
      RETURNING id
    `);

    if ((deleted.rows?.length ?? 0) > 0) {
      await db.execute(sql`
        UPDATE artist_videos
        SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
        WHERE id = ${videoId}
      `);
    }

    const result = await db.execute(sql`
      SELECT likes_count
      FROM artist_videos
      WHERE id = ${videoId}
    `);

    res.json({ success: true, likesCount: Number(result.rows[0]?.likes_count ?? 0) });
  } catch (err: any) {
    console.error("[video-unlike]", err?.message);
    res.status(400).json({ message: "Errore nel unlike", detail: err?.message });
  }
});

app.get("/api/videos/:videoId/liked/:userId", async (req, res) => {
  try {
    const videoId = Number(req.params.videoId);
    const userId = Number(req.params.userId);

    const result = await db.execute(sql`
      SELECT id
      FROM video_likes
      WHERE video_id = ${videoId} AND user_id = ${userId}
    `);

    res.json({ liked: result.rows.length > 0 });
  } catch (err: any) {
    console.error("[video-liked]", err?.message);
    res.json({ liked: false });
  }
});
  
app.post("/api/artists/:artistId/songs", async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const { title, audioUrl, coverUrl, duration } = req.body;

if (!audioUrl) {
  return res.status(400).json({ message: "Audio URL mancante" });
}

const alreadyExists = await storage.songAlreadyExistsForArtist(
  artistId,
  String(audioUrl)
);

if (alreadyExists) {
  return res.status(409).json({
    message: "Canzone già presente nella playlist",
    code: "SONG_ALREADY_IN_PLAYLIST",
  });
}
      const song = await storage.createSong({ artistId, title, audioUrl, coverUrl, duration });
      res.status(201).json(song);
    } catch (err: any) {
      console.error("[create-song] error:", err?.message);
      res.status(400).json({ message: "Errore nel salvare la canzone" });
    }
  });
  
  // === SONGS ===
  app.get(api.songs.listByArtist.path, async (req, res) => {
    const songs = await storage.getSongsByArtist(Number(req.params.artistId));
    res.json(songs);
  });

  app.post(api.songs.create.path, async (req, res) => {
    try {
      const input = api.songs.create.input.parse(req.body);
      const song = await storage.createSong(input);
      res.status(201).json(song);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

app.delete("/api/songs/:songId", async (req, res) => {
    try {
      const songId = Number(req.params.songId);
      await storage.deleteSong(songId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nell'eliminazione della canzone" });
    }
  });

  app.delete("/api/users/:userId/playlist/:songId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const songId = Number(req.params.songId);
      await storage.removeFromPlaylist(userId, songId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nella rimozione dalla playlist" });
    }
  });
  
  // === FOLLOWERS ===
  app.get("/api/artists/:artistId/followers/count", async (req, res) => {
    const count = await storage.getFollowersCount(Number(req.params.artistId));
    res.json({ count });
  });

  app.get("/api/users/:userId/following", async (req, res) => {
    const following = await storage.getFollowingByFan(Number(req.params.userId));
    res.json(following);
  });

app.get("/api/users/:userId/followers", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const followersList = await storage.getFollowersByUser(userId);
      res.json(followersList);
    } catch (err) {
      res.status(400).json({ message: "Errore nel recupero follower" });
    }
  });
  
 app.post("/api/users/:userId/follow/:artistId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const artistId = Number(req.params.artistId);

    if (!userId || !artistId) {
      return res.status(400).json({ message: "ID utente non valido" });
    }

    if (await denyIfBlocked(
      res,
      userId,
      artistId,
      "Non puoi seguire questo profilo perché tra voi esiste un blocco."
    )) return;

    await storage.followArtist(userId, artistId);

    try {
      await awardPoints({
        userId,
        action: "follow_artist",
        referenceType: "artist",
        referenceId: artistId,
      });
    } catch (pointsErr: any) {
      console.error("[points-follow-artist]", pointsErr?.message);
    }

    const follower = await storage.getUser(userId);

    await storage.createNotification({
      userId: artistId,
      type: "follow",
      message: `${follower?.displayName || "Qualcuno"} ha iniziato a seguirti`,
      relatedUserId: userId,
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("[follow-user]", err?.message || err);
    res.status(400).json({ message: "Errore nel seguire l'artista" });
  }
});
  app.delete("/api/users/:userId/follow/:artistId", async (req, res) => {
    try {
      await storage.unfollowArtist(Number(req.params.userId), Number(req.params.artistId));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nello smettere di seguire" });
    }
  });

  app.get("/api/users/:userId/following/:artistId", async (req, res) => {
    const isFollowing = await storage.isFollowing(Number(req.params.userId), Number(req.params.artistId));
    res.json({ isFollowing });
  });

  // === USER MEDIA ===
  const photoInputSchema = z.object({
    title: z.string().optional(),
    imageUrl: z.string().url(),
  });

  const videoInputSchema = z.object({
    title: z.string().min(1),
    videoUrl: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
  });

  app.get("/api/users/:userId/photos", async (req, res) => {
    const photos = await storage.getPhotosByUser(Number(req.params.userId));
    res.json(photos);
  });

app.post("/api/users/:userId/photos", async (req, res) => {
  try {
    const { title, imageUrl, description } = req.body;
    const userId = Number(req.params.userId);

    const photo = await storage.createPhoto({
      artistId: userId,
      title: title || null,
      imageUrl,
      description: description || null,
    });

    await sendMentionNotifications(
      [title, description].filter(Boolean).join(" "),
      userId
    );

    res.status(201).json(photo);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(400).json({ message: "Errore nel salvare la foto" });
  }
});
app.delete("/api/posts/:postId", async (req, res) => {
    try {
      const postId = Number(req.params.postId);
      const post = await storage.getPost(postId);
      await storage.deletePost(postId);
      if (post?.mediaUrl) {
        await storage.deletePhotoByUrl(post.mediaUrl);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[delete-post]", err?.message);
      res.status(400).json({ message: "Errore nell'eliminazione del post", detail: err?.message });
    }
  });
app.delete("/api/users/:userId/photos/:photoId", async (req, res) => {
    try {
      const photoId = Number(req.params.photoId);
      await storage.deletePhoto(photoId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nell'eliminazione della foto" });
    }
  });

  app.get("/api/users/:userId/videos", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const result = await db.execute(sql`
      SELECT
        id,
        artist_id AS "artistId",
        title,
        video_url AS "videoUrl",
        thumbnail_url AS "thumbnailUrl",
        likes_count AS "likesCount",
        created_at AS "createdAt"
      FROM artist_videos
      WHERE artist_id = ${userId}
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(400).json({ message: "Errore nel recupero video", detail: err?.message });
  }
});

 app.post("/api/users/:userId/videos", async (req, res) => {
  try {
    const input = videoInputSchema.parse(req.body);
    const userId = Number(req.params.userId);

    const video = await storage.createVideo({
      artistId: userId,
      title: input.title,
      videoUrl: input.videoUrl,
      thumbnailUrl: input.thumbnailUrl || null,
    });

    await sendMentionNotifications(String(input.title ?? ""), userId);

    res.status(201).json(video);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(400).json({ message: "Errore nel salvare il video" });
  }
});
app.get("/api/content/:type/:id", async (req, res) => {
  try {
    const type = String(req.params.type);
    const id = Number(req.params.id);

    if (!["post", "photo", "video"].includes(type) || !id) {
      return res.status(400).json({ message: "Tipo contenuto non valido" });
    }

    if (type === "post") {
      const post = await storage.getPost(id);

      if (!post) {
        return res.status(404).json({ message: "Contenuto non trovato" });
      }

      const author = await storage.getUser(Number(post.authorId));

      return res.json({
        type: "post",
        id: post.id,
        authorId: post.authorId,
        content: post.content ?? "",
        mediaUrl: post.mediaUrl ?? null,
        createdAt: post.createdAt,
        likesCount: post.likesCount ?? 0,
        author: author
          ? {
              id: author.id,
              displayName: author.displayName,
              username: author.username,
              avatarUrl: author.avatarUrl,
              role: author.role,
            }
          : null,
      });
    }

    if (type === "photo") {
      const result = await db.execute(sql`
        SELECT
          p.id,
          p.artist_id AS "authorId",
          COALESCE(NULLIF(p.description, ''), NULLIF(p.title, 'Foto'), '') AS content,
          p.image_url AS "mediaUrl",
          p.created_at AS "createdAt",
          COALESCE(p.likes_count, 0) AS "likesCount",
          u.id AS "userId",
          u.display_name AS "displayName",
          u.username AS username,
          u.avatar_url AS "avatarUrl",
          u.role AS role
        FROM artist_photos p
        JOIN users u ON u.id = p.artist_id
        WHERE p.id = ${id}
        LIMIT 1
      `);

      const row = result.rows[0] as any;

      if (!row) {
        return res.status(404).json({ message: "Contenuto non trovato" });
      }

      return res.json({
        type: "photo",
        id: row.id,
        authorId: row.authorId,
        content: row.content ?? "",
        mediaUrl: row.mediaUrl,
        createdAt: row.createdAt,
        likesCount: Number(row.likesCount ?? 0),
        author: {
          id: row.userId,
          displayName: row.displayName,
          username: row.username,
          avatarUrl: row.avatarUrl,
          role: row.role,
        },
      });
    }

    const result = await db.execute(sql`
      SELECT
        v.id,
        v.artist_id AS "authorId",
        COALESCE(NULLIF(v.title, 'Video'), '') AS content,
        v.video_url AS "mediaUrl",
        v.created_at AS "createdAt",
        COALESCE(v.likes_count, 0) AS "likesCount",
        u.id AS "userId",
        u.display_name AS "displayName",
        u.username AS username,
        u.avatar_url AS "avatarUrl",
        u.role AS role
      FROM artist_videos v
      JOIN users u ON u.id = v.artist_id
      WHERE v.id = ${id}
      LIMIT 1
    `);

    const row = result.rows[0] as any;

    if (!row) {
      return res.status(404).json({ message: "Contenuto non trovato" });
    }

    return res.json({
      type: "video",
      id: row.id,
      authorId: row.authorId,
      content: row.content ?? "",
      mediaUrl: row.mediaUrl,
      createdAt: row.createdAt,
      likesCount: Number(row.likesCount ?? 0),
      author: {
        id: row.userId,
        displayName: row.displayName,
        username: row.username,
        avatarUrl: row.avatarUrl,
        role: row.role,
      },
    });
  } catch (err: any) {
    res.status(400).json({
      message: "Errore nel recupero contenuto",
      detail: err?.message,
    });
  }
});
 // === MESSAGES ===
  app.get("/api/messages/unread/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      if (isNaN(userId)) return res.json(0);
      const count = await storage.getUnreadMessagesCount(userId);
      res.json(count);
    } catch (err) {
      res.json(0);
    }
  });

  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    try {
      const userId1 = Number(req.params.userId1);
      const userId2 = Number(req.params.userId2);

      if (isNaN(userId1) || isNaN(userId2)) {
        return res.json([]);
      }

      const blocked = await hasAnyUserBlock(userId1, userId2);

      if (blocked) {
        return res.status(403).json({
          message: "Non puoi visualizzare questa conversazione perché tra voi esiste un blocco.",
          code: "USER_BLOCKED",
        });
      }

      const messages = await storage.getConversation(userId1, userId2);
      res.json(messages);
    } catch (err) {
      res.json([]);
    }
  });

  app.post("/api/messages/read/:userId/:otherUserId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const otherUserId = Number(req.params.otherUserId);
      await storage.markMessagesRead(userId, otherUserId);
      res.json({ success: true });
    } catch (err) {
      res.json({ success: false });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { content } = req.body;

      const senderId = Number(req.body.senderId);
      const receiverId = Number(req.body.receiverId);

      if (!senderId || !receiverId) {
        return res.status(400).json({
          message: "Mittente o destinatario non valido",
        });
      }

      const blocked = await hasAnyUserBlock(senderId, receiverId);

      if (blocked) {
        return res.status(403).json({
          message: "Non puoi inviare messaggi a questo profilo perché tra voi esiste un blocco.",
          code: "USER_BLOCKED",
        });
      }
      const message = await storage.sendMessage({ senderId, receiverId, content });
      res.status(201).json(message);
    } catch (err) {
      res.status(400).json({ message: "Errore nell'invio del messaggio" });
    }
  });
  
  app.get("/api/messages/unread-from/:senderId/:receiverId", async (req, res) => {
    try {
      const senderId = Number(req.params.senderId);
      const receiverId = Number(req.params.receiverId);
      if (isNaN(senderId) || isNaN(receiverId)) return res.json(0);
      const result = await storage.getUnreadFromSender(senderId, receiverId);
      res.json(result);
    } catch (err) {
      res.json(0);
    }
  });
  
  // === STORIES ===
app.get("/api/stories", async (req, res) => {
  try {
    const currentUserId = Number(req.query.userId) || 0;
    const activeStories = await storage.getActiveStories();

    const likedRows = currentUserId
      ? await db.execute(sql`
          SELECT story_id
          FROM story_likes
          WHERE user_id = ${currentUserId}
        `)
      : { rows: [] };

    const likedStoryIds = new Set(
      (likedRows.rows || []).map((row: any) => Number(row.story_id))
    );

    const storiesWithLikes = await Promise.all(
      activeStories.map(async (story) => {
        const likesResult = await db.execute(sql`
          SELECT COUNT(*)::int AS count
          FROM story_likes
          WHERE story_id = ${story.id}
        `);

        return {
          ...story,
          likesCount: Number(likesResult.rows[0]?.count ?? 0),
          likedByMe: likedStoryIds.has(Number(story.id)),
        };
      })
    );

    res.json(storiesWithLikes);
  } catch (err: any) {
    console.error("[stories-list]", err?.message);
    res.status(400).json({ message: "Errore nel recupero delle storie", detail: err?.message });
  }
});
  
  app.get("/api/users/:userId/stories", async (req, res) => {
    const userStories = await storage.getStoriesByUser(Number(req.params.userId));
    res.json(userStories);
  });

  app.post("/api/stories", async (req, res) => {
  try {
    const { userId, imageUrl, content } = req.body;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await storage.createStory({ userId, imageUrl, content, expiresAt });

    await sendMentionNotifications(String(content ?? ""), Number(userId));

    res.status(201).json(story);
  } catch (err) {
    res.status(400).json({ message: "Errore nella creazione della storia" });
  }
});

  app.delete("/api/stories/:storyId/:userId", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    const userId = Number(req.params.userId);

    if (!storyId || !userId) {
      return res.status(400).json({ message: "storyId o userId mancanti" });
    }

    const deleted = await storage.deleteStory(storyId, userId);

    if (!deleted) {
      return res.status(404).json({ message: "Storia non trovata o non autorizzato" });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[delete-story]", err?.message);
    res.status(400).json({ message: "Errore nell'eliminazione della storia", detail: err?.message });
  }
});

app.post("/api/stories/:storyId/reply", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    const { senderId, content } = req.body;
    const trimmedContent = String(content ?? "").trim();

    if (!storyId || !senderId || !trimmedContent) {
      return res.status(400).json({ message: "storyId, senderId o contenuto mancanti" });
    }

    const result = await db.execute(sql`
      SELECT user_id, image_url, content
      FROM stories
      WHERE id = ${storyId}
      LIMIT 1
    `);

    const story = result.rows[0] as any;

    if (!story) {
      return res.status(404).json({ message: "Storia non trovata" });
    }

    const receiverId = Number(story.user_id);

    if (receiverId === Number(senderId)) {
      return res.status(400).json({ message: "Non puoi rispondere alla tua stessa storia" });
    }

    const sender = await storage.getUser(Number(senderId));

    const messagePayload = {
      type: "story_reply",
      storyId,
      storyImageUrl: String(story.image_url ?? ""),
      storyContent: String(story.content ?? ""),
      reply: trimmedContent,
    };

    const notificationPayload = {
      type: "story_reply_notification",
      senderName: sender?.displayName || "Qualcuno",
      storyId,
      storyImageUrl: String(story.image_url ?? ""),
      storyContent: String(story.content ?? ""),
      reply: trimmedContent,
    };

    const message = await storage.sendMessage({
      senderId: Number(senderId),
      receiverId,
      content: `__STORY_REPLY__${JSON.stringify(messagePayload)}`,
    });

    await storage.createNotification({
      userId: receiverId,
      type: "message",
      message: `__STORY_REPLY_NOTIFICATION__${JSON.stringify(notificationPayload)}`,
      relatedUserId: Number(senderId),
    });

    res.status(201).json(message);
  } catch (err: any) {
    console.error("[story-reply]", err?.message);
    res.status(400).json({ message: "Errore nell'invio della risposta alla storia", detail: err?.message });
  }
});
  
app.post("/api/stories/:storyId/like", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    const { userId } = req.body;

    if (!storyId || !userId) {
      return res.status(400).json({ message: "storyId o userId mancanti" });
    }

    await db.execute(sql`
      INSERT INTO story_likes (story_id, user_id)
      VALUES (${storyId}, ${userId})
      ON CONFLICT DO NOTHING
    `);

    const likesResult = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM story_likes
      WHERE story_id = ${storyId}
    `);

    res.json({
      success: true,
      likesCount: Number(likesResult.rows[0]?.count ?? 0),
    });
  } catch (err: any) {
    console.error("[story-like]", err?.message);
    res.status(400).json({ message: "Errore nel like alla storia", detail: err?.message });
  }
});

app.post("/api/stories/:storyId/unlike", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    const { userId } = req.body;

    if (!storyId || !userId) {
      return res.status(400).json({ message: "storyId o userId mancanti" });
    }

    await db.execute(sql`
      DELETE FROM story_likes
      WHERE story_id = ${storyId} AND user_id = ${userId}
    `);

    const likesResult = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM story_likes
      WHERE story_id = ${storyId}
    `);

    res.json({
      success: true,
      likesCount: Number(likesResult.rows[0]?.count ?? 0),
    });
  } catch (err: any) {
    console.error("[story-unlike]", err?.message);
    res.status(400).json({ message: "Errore nell'unlike alla storia", detail: err?.message });
  }
});
  // === EVENTS ===
  app.get("/api/artists/:artistId/events", async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const artistEvents = await storage.getEventsByArtist(artistId);
      res.json(artistEvents);
    } catch (err) {
      res.status(400).json({ message: "Errore nel recupero eventi" });
    }
  });

  app.post("/api/artists/:artistId/events", async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      console.log(`[create-event] body:`, JSON.stringify(req.body));
      const eventData = { ...req.body, artistId, eventDate: new Date(req.body.eventDate) };
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (err: any) {
      console.error(`[create-event] error:`, err?.message);
      res.status(400).json({ message: "Errore nella creazione evento", detail: err?.message });
    }
  });

 app.delete("/api/events/:eventId", async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);
      await storage.deleteEvent(eventId);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[delete-event] error:`, err?.message);
      res.status(400).json({ message: "Errore nell'eliminazione evento", detail: err?.message });
    }
  });
  // === EVENT ATTENDEES ===
  app.delete("/api/events/:eventId/attend", async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);
      const { userId } = req.body;
      await storage.unattendEvent(eventId, Number(userId));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore" });
    }
  });
  
 app.post("/api/events/:eventId/attend", async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);
      const { userId } = req.body;

      await storage.attendEvent(eventId, userId);

      try {
        await awardPoints({
          userId: Number(userId),
          action: "attend_event",
          referenceType: "event",
          referenceId: eventId,
        });
      } catch (pointsErr: any) {
        console.error("[points-attend-event]", pointsErr?.message);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore" });
    }
  });
  
  app.get("/api/users/:userId/events/attending", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const events = await storage.getAttendingEvents(userId);
      res.json(events);
    } catch (err) {
      res.status(400).json({ message: "Errore" });
    }
  });
  
  app.get("/api/users/:userId/conversations", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (err) {
      res.status(400).json({ message: "Errore" });
    }
  });
  // === PHOTO COMMENTS ===
 app.get("/api/photos/:photoId/comments", async (req, res) => {
    try {
      const photoId = Number(req.params.photoId);
      const userId = Number(req.query.userId);
      const comments = await storage.getPhotoComments(photoId);
      if (!userId) return res.json(comments);
      const commentsWithLikes = await Promise.all(comments.map(async (c: any) => {
        const result = await db.execute(sql`SELECT id FROM photo_comment_likes WHERE comment_id = ${c.id} AND user_id = ${userId}`);
        return { ...c, likedByMe: result.rows.length > 0 };
      }));
      res.json(commentsWithLikes);
    } catch (err) {
      res.status(400).json({ message: "Errore nel recupero commenti" });
    }
  });
 app.post("/api/photos/:photoId/comments", async (req, res) => {
  try {
    const photoId = Number(req.params.photoId);
    const { authorId, content } = req.body;
    console.log(`[photo-comment] photoId=${photoId} authorId=${authorId} content=${content}`);

    const comment = await storage.createPhotoComment({ photoId, authorId, content });

    try {
      await awardPoints({
        userId: Number(authorId),
        action: "comment_photo",
        referenceType: "photo_comment",
        referenceId: Number(comment.id),
        content,
      });
    } catch (pointsErr: any) {
      console.error("[points-comment-photo]", pointsErr?.message);
    }

    await sendMentionNotifications(String(content ?? ""), Number(authorId));

    res.status(201).json(comment);
  } catch (err: any) {
    console.error(`[photo-comment] error:`, err?.message);
    res.status(400).json({ message: "Errore nel creare il commento", detail: err?.message });
  }
});

  app.post("/api/photos/:photoId/comments/:commentId/like/:userId", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      console.log("[photo-comment-like] body:", req.body, "query:", req.query);
      const userId = Number(req.params.userId);
      console.log("[photo-comment-like] FULL body:", JSON.stringify(req.body), "query:", JSON.stringify(req.query), "headers:", req.headers['content-type']);
      if (!userId) throw new Error("userId mancante");
      const result = await db.execute(sql`INSERT INTO photo_comment_likes (comment_id, user_id) VALUES (${commentId}, ${userId}) ON CONFLICT DO NOTHING RETURNING id`);
      if (result.rows.length > 0) {
        await db.execute(sql`UPDATE photo_comments SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ${commentId}`);
      }
      const updated = await db.execute(sql`SELECT likes_count FROM photo_comments WHERE id = ${commentId}`);
      res.json({ success: true, likesCount: updated.rows[0]?.likes_count ?? 0 });
    } catch (err: any) {
      console.error("[photo-comment-like]", err?.message);
      res.status(400).json({ message: "Errore nel like" });
    }
  });

  app.post("/api/photos/:photoId/comments/:commentId/unlike/:userId", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const userId = Number(req.params.userId);
      if (!userId) throw new Error("userId mancante");
      const result = await db.execute(sql`DELETE FROM photo_comment_likes WHERE comment_id = ${commentId} AND user_id = ${userId} RETURNING id`);
      if (result.rows.length > 0) {
        await db.execute(sql`UPDATE photo_comments SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = ${commentId}`);
      }
      const updated = await db.execute(sql`SELECT likes_count FROM photo_comments WHERE id = ${commentId}`);
      res.json({ success: true, likesCount: updated.rows[0]?.likes_count ?? 0 });
    } catch (err: any) {
      console.error("[photo-comment-unlike]", err?.message);
      res.status(400).json({ message: "Errore nel like" });
    }
  });

  app.get("/api/photos/:photoId/comments/:commentId/liked/:userId", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const userId = Number(req.params.userId);
      const result = await db.execute(sql`SELECT id FROM photo_comment_likes WHERE comment_id = ${commentId} AND user_id = ${userId}`);
      res.json({ liked: result.rows.length > 0 });
    } catch (err) {
      res.json({ liked: false });
    }
  });

  app.delete("/api/photos/:photoId/comments/:commentId", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      await storage.deletePhotoComment(commentId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nell'eliminazione" });
    }
  });
 // === VIDEO COMMENTS ===
app.get("/api/videos/:videoId/comments", async (req, res) => {
  try {
    const videoId = Number(req.params.videoId);
    const userId = Number(req.query.userId);

    const result = await db.execute(sql`
      SELECT
        vc.id,
        vc.video_id,
        vc.author_id,
        vc.content,
        vc.likes_count,
        vc.created_at,
        u.display_name,
        u.avatar_url
      FROM video_comments vc
      JOIN users u ON vc.author_id = u.id
      WHERE vc.video_id = ${videoId}
      ORDER BY vc.created_at ASC
    `);

    const comments = Array.isArray(result.rows) ? result.rows : [];

    if (!userId) {
      return res.json(comments);
    }

    const commentsWithLikes = await Promise.all(
      comments.map(async (c: any) => {
        const likeResult = await db.execute(sql`
          SELECT id
          FROM video_comment_likes
          WHERE comment_id = ${c.id} AND user_id = ${userId}
        `);

        return {
          ...c,
          likedByMe: likeResult.rows.length > 0,
        };
      })
    );

    res.json(commentsWithLikes);
  } catch (err: any) {
    console.error("[video-comments]", err?.message);
    res.status(400).json({ message: "Errore nel recupero commenti", detail: err?.message });
  }
});

app.post("/api/videos/:videoId/comments", async (req, res) => {
  try {
    const videoId = Number(req.params.videoId);
    const { authorId, content } = req.body;

    const comment = await storage.createVideoComment({ videoId, authorId, content });

    try {
      await awardPoints({
        userId: Number(authorId),
        action: "comment_video",
        referenceType: "video_comment",
        referenceId: Number(comment.id),
        content,
      });
    } catch (pointsErr: any) {
      console.error("[points-comment-video]", pointsErr?.message);
    }

    await sendMentionNotifications(String(content ?? ""), Number(authorId));

    res.status(201).json(comment);
  } catch (err: any) {
    res.status(400).json({ message: "Errore nel creare il commento", detail: err?.message });
  }
});

app.post("/api/videos/:videoId/comments/:commentId/like", async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId mancante" });
    }

    const inserted = await db.execute(sql`
      INSERT INTO video_comment_likes (comment_id, user_id)
      VALUES (${commentId}, ${userId})
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    if ((inserted.rows?.length ?? 0) > 0) {
      await db.execute(sql`
        UPDATE video_comments
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = ${commentId}
      `);
    }

    const updated = await db.execute(sql`
      SELECT likes_count
      FROM video_comments
      WHERE id = ${commentId}
    `);

    res.json({ success: true, likesCount: updated.rows[0]?.likes_count ?? 0 });
  } catch (err: any) {
    console.error("[video-comment-like]", err?.message);
    res.status(400).json({ message: "Errore nel like", detail: err?.message });
  }
});

app.post("/api/videos/:videoId/comments/:commentId/unlike", async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId mancante" });
    }

    const deleted = await db.execute(sql`
      DELETE FROM video_comment_likes
      WHERE comment_id = ${commentId} AND user_id = ${userId}
      RETURNING id
    `);

    if ((deleted.rows?.length ?? 0) > 0) {
      await db.execute(sql`
        UPDATE video_comments
        SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
        WHERE id = ${commentId}
      `);
    }

    const updated = await db.execute(sql`
      SELECT likes_count
      FROM video_comments
      WHERE id = ${commentId}
    `);

    res.json({ success: true, likesCount: updated.rows[0]?.likes_count ?? 0 });
  } catch (err: any) {
    console.error("[video-comment-unlike]", err?.message);
    res.status(400).json({ message: "Errore nel unlike", detail: err?.message });
  }
});

app.delete("/api/videos/:videoId/comments/:commentId", async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    await storage.deleteVideoComment(commentId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: "Errore nell'eliminazione" });
  }
});
// === NOTIFICATIONS ===
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const userNotifications = await storage.getNotifications(userId);
      res.json(userNotifications);
    } catch (err) {
      res.status(400).json({ message: "Errore nel recupero notifiche" });
    }
  });

  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    try {
      const notificationId = Number(req.params.notificationId);
      await storage.markNotificationRead(notificationId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore" });
    }
  });

  app.post("/api/notifications/:userId/read-all", async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore" });
    }
  });

  app.delete("/api/notifications/:notificationId", async (req, res) => {
  try {
    const notificationId = Number(req.params.notificationId);
    const userId = Number(req.query.userId);

    if (!notificationId || !userId) {
      return res.status(400).json({ message: "notificationId o userId mancanti" });
    }

    await db.execute(sql`
      DELETE FROM notifications
      WHERE id = ${notificationId} AND user_id = ${userId}
    `);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ message: "Errore nell'eliminazione della notifica" });
  }
});
  // === SEED DATABASE ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
const artists = await storage.getArtists();
  if (false) {
    // Creiamo artisti demo
    const artist1 = await storage.createUser({
      username: "luna_indie",
      displayName: "Luna Indie",
      bio: "Cantautrice indie-pop da Milano. Scrivo canzoni sulla vita quotidiana.",
      role: "artist",
      genre: "Indie Pop",
    });

    const artist2 = await storage.createUser({
      username: "marco_beats",
      displayName: "Marco Beats",
      bio: "Producer e DJ. Creo beat hip-hop e elettronica sperimentale.",
      role: "artist",
      genre: "Hip Hop / Electronic",
    });

    const artist3 = await storage.createUser({
      username: "alessia_voice",
      displayName: "Alessia Voice",
      bio: "Soul singer con influenze R&B. La musica è la mia vita.",
      role: "artist",
      genre: "Soul / R&B",
    });

    // Creiamo obiettivi per artisti
    await storage.createGoal({
      artistId: artist1.id,
      title: "Registrare il mio primo EP",
      description: "Ho bisogno di fondi per affittare uno studio e registrare 5 tracce originali.",
      targetAmount: "2500",
    });

    await storage.createGoal({
      artistId: artist2.id,
      title: "Nuovo setup per live performance",
      description: "Voglio comprare attrezzatura per portare i miei beat dal vivo.",
      targetAmount: "1500",
    });

    await storage.createGoal({
      artistId: artist3.id,
      title: "Video musicale professionale",
      description: "Finanziare la produzione del mio primo videoclip professionale.",
      targetAmount: "3000",
    });

    // Seed photos
    await storage.createPhoto({
      artistId: artist1.id,
      title: "Live al Circolo Magnolia",
      imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
    });
    await storage.createPhoto({
      artistId: artist1.id,
      title: "In studio",
      imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400",
    });
    await storage.createPhoto({
      artistId: artist2.id,
      title: "Setup DJ",
      imageUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400",
    });

    // Seed videos
    await storage.createVideo({
      artistId: artist1.id,
      title: "Acoustic Session - Notte Stellata",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnailUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
    });
    await storage.createVideo({
      artistId: artist2.id,
      title: "Behind the Beats - Episode 1",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      thumbnailUrl: "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=400",
    });

    // Seed songs
    await storage.createSong({
      artistId: artist1.id,
      title: "Notte Stellata",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400",
      duration: 215,
    });
    await storage.createSong({
      artistId: artist1.id,
      title: "Riflessi",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
      duration: 183,
    });
    await storage.createSong({
      artistId: artist2.id,
      title: "Urban Dreams",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      coverUrl: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=400",
      duration: 240,
    });
    await storage.createSong({
      artistId: artist3.id,
      title: "Soul Whispers",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      coverUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400",
      duration: 198,
    });
  }
}
