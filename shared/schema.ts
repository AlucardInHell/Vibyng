import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === USERS TABLE ===
// role types: "fan" | "artist" | "business" | "rehearsal_room" | "music_store" | "record_label"
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  password: text("password"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("fan"),
  genre: text("genre"), // Per artisti
  vibyngPoints: integer("vibyng_points").notNull().default(0),
  // Campi extra per attività commerciali
  address: text("address"), // Indirizzo
  phone: text("phone"), // Telefono
  website: text("website"), // Sito web
  city: text("city"), // Città
  createdAt: timestamp("created_at").defaultNow(),
});

// === POSTS TABLE ===
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  isExclusive: boolean("is_exclusive").notNull().default(false),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// === ARTIST GOALS TABLE ===
export const artistGoals = pgTable("artist_goals", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SUPPORTS TABLE ===
export const supports = pgTable("supports", {
  id: serial("id").primaryKey(),
  fanId: integer("fan_id").notNull().references(() => users.id),
  artistId: integer("artist_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  isSubscription: boolean("is_subscription").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === ARTIST PHOTOS TABLE ===
export const artistPhotos = pgTable("artist_photos", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").notNull().references(() => users.id),
  title: text("title"),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === ARTIST VIDEOS TABLE ===
export const artistVideos = pgTable("artist_videos", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === ARTIST SONGS TABLE ===
export const artistSongs = pgTable("artist_songs", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  audioUrl: text("audio_url").notNull(),
  coverUrl: text("cover_url"),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// === FOLLOWERS TABLE ===
export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  fanId: integer("fan_id").notNull().references(() => users.id),
  artistId: integer("artist_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// === MESSAGES TABLE ===
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === COMMENTS TABLE ===
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === STORIES TABLE ===
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// === RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  goals: many(artistGoals),
  supportsGiven: many(supports, { relationName: "fan" }),
  supportsReceived: many(supports, { relationName: "artist" }),
  photos: many(artistPhotos),
  videos: many(artistVideos),
  songs: many(artistSongs),
  followers: many(followers, { relationName: "artist" }),
  following: many(followers, { relationName: "fan" }),
  stories: many(stories),
}));

export const storiesRelations = relations(stories, ({ one }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
}));

export const followersRelations = relations(followers, ({ one }) => ({
  fan: one(users, {
    fields: [followers.fanId],
    references: [users.id],
    relationName: "fan",
  }),
  artist: one(users, {
    fields: [followers.artistId],
    references: [users.id],
    relationName: "artist",
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const artistPhotosRelations = relations(artistPhotos, ({ one }) => ({
  artist: one(users, {
    fields: [artistPhotos.artistId],
    references: [users.id],
  }),
}));

export const artistVideosRelations = relations(artistVideos, ({ one }) => ({
  artist: one(users, {
    fields: [artistVideos.artistId],
    references: [users.id],
  }),
}));

export const artistSongsRelations = relations(artistSongs, ({ one }) => ({
  artist: one(users, {
    fields: [artistSongs.artistId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

export const artistGoalsRelations = relations(artistGoals, ({ one }) => ({
  artist: one(users, {
    fields: [artistGoals.artistId],
    references: [users.id],
  }),
}));

export const supportsRelations = relations(supports, ({ one }) => ({
  fan: one(users, {
    fields: [supports.fanId],
    references: [users.id],
    relationName: "fan",
  }),
  artist: one(users, {
    fields: [supports.artistId],
    references: [users.id],
    relationName: "artist",
  }),
}));

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, vibyngPoints: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, likesCount: true });
export const insertGoalSchema = createInsertSchema(artistGoals).omit({ id: true, createdAt: true, currentAmount: true, isCompleted: true });
export const insertSupportSchema = createInsertSchema(supports).omit({ id: true, createdAt: true });
export const insertPhotoSchema = createInsertSchema(artistPhotos).omit({ id: true, createdAt: true });
export const insertVideoSchema = createInsertSchema(artistVideos).omit({ id: true, createdAt: true });
export const insertSongSchema = createInsertSchema(artistSongs).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, isRead: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertStorySchema = createInsertSchema(stories).omit({ id: true, createdAt: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type ArtistGoal = typeof artistGoals.$inferSelect;
export type InsertArtistGoal = z.infer<typeof insertGoalSchema>;

export type Support = typeof supports.$inferSelect;
export type InsertSupport = z.infer<typeof insertSupportSchema>;

export type ArtistPhoto = typeof artistPhotos.$inferSelect;
export type InsertArtistPhoto = z.infer<typeof insertPhotoSchema>;

export type ArtistVideo = typeof artistVideos.$inferSelect;
export type InsertArtistVideo = z.infer<typeof insertVideoSchema>;

export type ArtistSong = typeof artistSongs.$inferSelect;
export type InsertArtistSong = z.infer<typeof insertSongSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
