import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
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
            <a href="${verifyUrl}" style="background: linear-gradient(135deg, #7c3aed, #db2777); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
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
    res.json(posts);
  });

  app.post(api.posts.create.path, async (req, res) => {
    try {
      const input = api.posts.create.input.parse(req.body);
      const post = await storage.createPost(input);
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
      await storage.likePost(postId);
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
      await storage.unlikePost(postId);
      const post = await storage.getPost(postId);
      res.json({ success: true, likesCount: post?.likesCount ?? 0 });
    } catch (err) {
      res.status(400).json({ message: "Errore nel rimuovere like" });
    }
  });

  // === COMMENTS ===
  app.get("/api/posts/:postId/comments", async (req, res) => {
    const comments = await storage.getCommentsByPost(Number(req.params.postId));
    res.json(comments);
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
    }
  });

  app.get("/api/posts/:postId/comments/count", async (req, res) => {
    const count = await storage.getCommentsCount(Number(req.params.postId));
    res.json({ count });
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

  // === FOLLOWERS ===
  app.get("/api/artists/:artistId/followers/count", async (req, res) => {
    const count = await storage.getFollowersCount(Number(req.params.artistId));
    res.json({ count });
  });

  app.get("/api/users/:userId/following", async (req, res) => {
    const following = await storage.getFollowingByFan(Number(req.params.userId));
    res.json(following);
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
      const input = photoInputSchema.parse(req.body);
      const photo = await storage.createPhoto({ artistId: Number(req.params.userId), title: input.title || null, imageUrl: input.imageUrl });
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
      await storage.deletePost(postId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nell'eliminazione del post" });
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
  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    const messages = await storage.getConversation(
      Number(req.params.userId1),
      Number(req.params.userId2)
    );
    res.json(messages);
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
      const event = await storage.createEvent({ ...req.body, artistId });
      res.status(201).json(event);
    } catch (err) {
      res.status(400).json({ message: "Errore nella creazione evento" });
    }
  });

  app.delete("/api/events/:eventId", async (req, res) => {
    try {
      const eventId = Number(req.params.eventId);
      await storage.deleteEvent(eventId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nell'eliminazione evento" });
    }
  });
  // === EVENT ATTENDEES ===
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
