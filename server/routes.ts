import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

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
    if (!query.trim()) {
      // Ritorna utenti filtrati per ruolo se specificato
      if (role && role !== 'all') {
        const results = await storage.searchUsers("", role);
        return res.json(results);
      }
      const allUsers = await storage.getAllUsers();
      return res.json(allUsers);
    }
    const results = await storage.searchUsers(query, role);
    res.json(results);
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: "Utente non trovato" });
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
  registerObjectStorageRoutes(app);

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
      await storage.likePost(postId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Errore nel mettere like" });
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
      await storage.followArtist(Number(req.params.userId), Number(req.params.artistId));
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

  // === SEED DATABASE ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const artists = await storage.getArtists();
  if (artists.length === 0) {
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

    // Creiamo fan demo
    await storage.createUser({
      username: "music_lover_22",
      displayName: "Giulia",
      bio: "Appassionata di musica indipendente",
      role: "fan",
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
