import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function sendMentionNotifications(content: string, authorId: number) {
  try {
    const mentions = content.match(/@(\w+)/g);
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
    const photoItems = photos.map((p: any) => ({
     id: `photo_${p.id}`,
      type: "photo",
      authorId: p.artist_id,
      content: (p.description && p.description !== "Foto") ? p.description : (p.title && p.title !== "Foto" ? p.title : ""),
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
    const combined = [...posts, ...photoItems].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(combined);
  });
  
  app.post(api.posts.create.path, async (req, res) => {
    try {
      const input = api.posts.create.input.parse(req.body);
      const post = await storage.createPost(input);
      res.status(201).json(post);
      res.status(201).json(post);
await sendMentionNotifications(post.content, post.authorId);
      
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
      const { userId } = req.body;
      await storage.likePost(postId, userId);
      const post = await storage.getPost(postId);
      if (post && userId && post.authorId !== userId) {
        const liker = await storage.getUser(userId);
        await storage.createNotification({
          userId: post.authorId,
          type: "like",
          message: `${liker?.displayName || "Qualcuno"} ha messo like al tuo post`,
          relatedUserId: userId,
          relatedPostId: postId,
        });
      }
      res.json({ success: true, likesCount: post?.likesCount ?? 0 });
    } catch (err) {
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
    const userId = Number(req.query.userId);
    const postComments = await storage.getCommentsByPost(Number(req.params.postId));
    if (!userId) return res.json(postComments);
    const commentsWithLikes = await Promise.all(postComments.map(async (c) => {
      const result = await db.execute(sql`SELECT id FROM comment_likes WHERE comment_id = ${c.id} AND user_id = ${userId}`);
      return { ...c, likedByMe: result.rows.length > 0 };
    }));
    res.json(commentsWithLikes);
  });

  app.post("/api/posts/:postId/comments", async (req, res) => {
    try {
      const { authorId, content } = req.body;
      const comment = await storage.createComment({
        postId: Number(req.params.postId),
        authorId,
        content,
      });
      res.status(201).json(comment);
    } catch (err) {
      res.status(400).json({ message: "Errore nel creare il commento" });
      res.status(201).json(comment);
      await sendMentionNotifications(content, authorId);
    }
  });

  app.get("/api/posts/:postId/comments/count", async (req, res) => {
    const count = await storage.getCommentsCount(Number(req.params.postId));
    res.json({ count });
  });

  app.post("/api/comments/:commentId/like", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const { userId } = req.body;
      await storage.likeComment(commentId, userId);
      const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
      res.json({ success: true, likesCount: comment?.likesCount ?? 0 });
    } catch (err: any) {
      console.error("[comment-like]", err?.message);
      res.status(400).json({ message: "Errore nel like", detail: err?.message });
    }
  });

  app.post("/api/comments/:commentId/unlike", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      const { userId } = req.body;
      await storage.unlikeComment(commentId, userId);
      const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
      res.json({ success: true, likesCount: comment?.likesCount ?? 0 });
    } catch (err) {
      res.status(400).json({ message: "Errore nel like" });
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

  // === SUPPORTS ===
  app.post(api.supports.create.path, async (req, res) => {
    try {
      const input = api.supports.create.input.parse(req.body);
      const support = await storage.createSupport(input);
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
      await db.execute(sql`INSERT INTO photo_likes (photo_id, user_id) VALUES (${photoId}, ${userId}) ON CONFLICT DO NOTHING`);
      await db.execute(sql`UPDATE artist_photos SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ${photoId}`);
      const result = await db.execute(sql`SELECT likes_count, artist_id FROM artist_photos WHERE id = ${photoId}`);
      const photo = result.rows[0];
      if (photo && userId && Number(photo.artist_id) !== Number(userId)) {
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
      await db.execute(sql`DELETE FROM photo_likes WHERE photo_id = ${photoId} AND user_id = ${userId}`);
      await db.execute(sql`UPDATE artist_photos SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = ${photoId}`);
      const result = await db.execute(sql`SELECT likes_count FROM artist_photos WHERE id = ${photoId}`);
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
    const videos = await storage.getVideosByArtist(Number(req.params.artistId));
    res.json(videos);
  });

  app.post(api.videos.create.path, async (req, res) => {
    try {
      const input = api.videos.create.input.parse(req.body);
      const video = await storage.createVideo(input);
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

app.post("/api/artists/:artistId/songs", async (req, res) => {
    try {
      const artistId = Number(req.params.artistId);
      const { title, audioUrl, coverUrl, duration } = req.body;
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
      await storage.followArtist(userId, artistId);
      const follower = await storage.getUser(userId);
      await storage.createNotification({
        userId: artistId,
        type: "follow",
        message: `${follower?.displayName || "Qualcuno"} ha iniziato a seguirti`,
        relatedUserId: userId,
      });
      res.json({ success: true });
    } catch (err) {
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
      const photo = await storage.createPhoto({ artistId: Number(req.params.userId), title: title || null, imageUrl, description: description || null });
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
    const videos = await storage.getVideosByUser(Number(req.params.userId));
    res.json(videos);
  });

  app.post("/api/users/:userId/videos", async (req, res) => {
    try {
      const input = videoInputSchema.parse(req.body);
      const video = await storage.createVideo({ artistId: Number(req.params.userId), title: input.title, videoUrl: input.videoUrl, thumbnailUrl: input.thumbnailUrl || null });
      res.status(201).json(video);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Errore nel salvare il video" });
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
      if (isNaN(userId1) || isNaN(userId2)) return res.json([]);
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
      const { senderId, receiverId, content } = req.body;
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
  app.get("/api/stories", async (_req, res) => {
    const activeStories = await storage.getActiveStories();
    res.json(activeStories);
  });

  app.get("/api/users/:userId/stories", async (req, res) => {
    const userStories = await storage.getStoriesByUser(Number(req.params.userId));
    res.json(userStories);
  });

  app.post("/api/stories", async (req, res) => {
    try {
      const { userId, imageUrl, content } = req.body;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore
      const story = await storage.createStory({ userId, imageUrl, content, expiresAt });
      res.status(201).json(story);
    } catch (err) {
      res.status(400).json({ message: "Errore nella creazione della storia" });
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
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore" });
    }
  });

  app.delete("/api/events/:eventId/attend", async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);
      const { userId } = req.body;
      await storage.unattendEvent(eventId, userId);
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
  // === PHOTO COMMENTS ===
  app.get("/api/photos/:photoId/comments", async (req, res) => {
    try {
      const photoId = Number(req.params.photoId);
      const comments = await storage.getPhotoComments(photoId);
      res.json(comments);
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
      res.status(201).json(comment);
    } catch (err: any) {
      console.error(`[photo-comment] error:`, err?.message);
      res.status(400).json({ message: "Errore nel creare il commento", detail: err?.message });
    }
  });

  app.post("/api/photos/:photoId/comments/:commentId/like", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      await storage.likePhotoComment(commentId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nel like" });
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
      const result = await storage.getVideoComments(videoId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ message: "Errore nel recupero commenti" });
    }
  });

  app.post("/api/videos/:videoId/comments", async (req, res) => {
    try {
      const videoId = Number(req.params.videoId);
      const { authorId, content } = req.body;
      const comment = await storage.createVideoComment({ videoId, authorId, content });
      res.status(201).json(comment);
    } catch (err: any) {
      res.status(400).json({ message: "Errore nel creare il commento", detail: err?.message });
    }
  });

  app.post("/api/videos/:videoId/comments/:commentId/like", async (req, res) => {
    try {
      const commentId = Number(req.params.commentId);
      await storage.likeVideoComment(commentId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nel like" });
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

  app.delete("/api/videos/:videoId", async (req, res) => {
    try {
      const videoId = Number(req.params.videoId);
      await storage.deleteVideo(videoId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nell'eliminazione video" });
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

    // Creiamo post demo
    await storage.createPost({
      authorId: artist1.id,
      content: "Ciao a tutti! Sono Luna e questo è il mio primo post su Vibyng. Sono entusiasta di condividere la mia musica con voi! 🎵",
      isExclusive: false,
    });

    await storage.createPost({
      authorId: artist2.id,
      content: "Nuovo beat in lavorazione... Stay tuned! Chi vuole un'anteprima esclusiva?",
      isExclusive: false,
    });

    await storage.createPost({
      authorId: artist3.id,
      content: "Stasera provo nuove melodie. La musica soul mi scorre nelle vene.",
      isExclusive: false,
    });

    await storage.createPost({
      authorId: artist1.id,
      content: "🎧 ESCLUSIVO per i miei supporter: ecco la demo del mio nuovo singolo! Fatemi sapere cosa ne pensate.",
      isExclusive: true,
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
