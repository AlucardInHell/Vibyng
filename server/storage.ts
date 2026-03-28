import { db } from "./db";
import { users, posts, artistGoals, supports, artistPhotos, artistVideos, artistSongs, followers, messages, comments, stories, notifications, events, eventAttendees } from "@shared/schema";
import type { User, InsertUser, Post, InsertPost, ArtistGoal, InsertArtistGoal, Support, InsertSupport, ArtistPhoto, InsertArtistPhoto, ArtistVideo, InsertArtistVideo, ArtistSong, InsertArtistSong, Message, InsertMessage, Comment, InsertComment, Story, InsertStory } from "@shared/schema";
import { eq, desc, count, or, and, asc, ilike, gt, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<Pick<User, 'displayName' | 'username' | 'email' | 'bio' | 'avatarUrl'>>): Promise<User | undefined>;
  getArtists(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  searchUsers(query: string, role?: string): Promise<User[]>;
  updateUserPoints(id: number, points: number): Promise<void>;

 // Posts
  getPosts(): Promise<(Post & { author: User })[]>;
  getPost(postId: number): Promise<Post | undefined>;
  getPostsByUser(userId: number): Promise<(Post & { author: User })[]>;
  createPost(post: InsertPost): Promise<Post>;
  likePost(postId: number): Promise<void>;

  // Goals
  getGoalsByArtist(artistId: number): Promise<ArtistGoal[]>;
  createGoal(goal: InsertArtistGoal): Promise<ArtistGoal>;

  // Support
  createSupport(support: InsertSupport): Promise<Support>;

  // Artist Media
  getPhotosByArtist(artistId: number): Promise<ArtistPhoto[]>;
  createPhoto(photo: InsertArtistPhoto): Promise<ArtistPhoto>;
  getVideosByArtist(artistId: number): Promise<ArtistVideo[]>;
  createVideo(video: InsertArtistVideo): Promise<ArtistVideo>;
  getSongsByArtist(artistId: number): Promise<ArtistSong[]>;
  createSong(song: InsertArtistSong): Promise<ArtistSong>;

  // Followers
  getFollowersCount(artistId: number): Promise<number>;
  getFollowingByFan(fanId: number): Promise<User[]>;
  followArtist(fanId: number, artistId: number): Promise<void>;
  unfollowArtist(fanId: number, artistId: number): Promise<void>;
  isFollowing(fanId: number, artistId: number): Promise<boolean>;
  getFollowersByUser(userId: number): Promise<User[]>;
  
  // User Media (photos/videos for any user)
  getPhotosByUser(userId: number): Promise<ArtistPhoto[]>;
  getVideosByUser(userId: number): Promise<ArtistVideo[]>;

  // Messages
  getConversation(userId1: number, userId2: number): Promise<(Message & { sender: User })[]>;
  sendMessage(message: InsertMessage): Promise<Message>;

  // Comments
  getCommentsByPost(postId: number): Promise<(Comment & { author: User })[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsCount(postId: number): Promise<number>;

  // Stories
  getActiveStories(): Promise<(Story & { user: User })[]>;
  getStoriesByUser(userId: number): Promise<Story[]>;
  createStory(story: InsertStory): Promise<Story>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async setPasswordResetToken(userId: number, token: string): Promise<void> {
    const expires = new Date(Date.now() + 3600000);
    await db.execute(
      sql`UPDATE users SET password_reset_token = ${token}, password_reset_expires = ${expires} WHERE id = ${userId}`
    );
  }

async getUserByResetToken(token: string): Promise<User | undefined> {
    const now = new Date();
    const result = await db.execute(
      sql`SELECT * FROM users WHERE password_reset_token = ${token} AND password_reset_expires > ${now} LIMIT 1`
    );
    return (result.rows[0] as User) || undefined;
  }

  async resetPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.execute(
      sql`UPDATE users SET password = ${hashedPassword}, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ${userId}`
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getArtists(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "artist"));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

async searchUsers(query: string, role?: string): Promise<User[]> {
    if (!query.trim()) {
      if (role) {
        return await db.select().from(users).where(eq(users.role, role));
      }
      return await db.select().from(users);
    }
    const pattern = `%${query}%`;
    const searchCondition = or(
      ilike(users.displayName, pattern),
      ilike(users.username, pattern),
      ilike(users.genre, pattern),
      ilike(users.city, pattern)
    );
    if (role) {
      return await db.select().from(users).where(
        and(searchCondition, eq(users.role, role))
      );
    }
    return await db.select().from(users).where(searchCondition);
  }
  async updateUserPoints(id: number, points: number): Promise<void> {
    const user = await this.getUser(id);
    if (user) {
      await db.update(users)
        .set({ vibyngPoints: user.vibyngPoints + points })
        .where(eq(users.id, id));
    }
  }

  async updateUser(id: number, data: Partial<Pick<User, 'displayName' | 'username' | 'email' | 'bio' | 'avatarUrl'>>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getPosts(): Promise<(Post & { author: User })[]> {
    const results = await db.select({
      post: posts,
      author: users
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt));

    return results.map(r => ({ ...r.post, author: r.author }));
  }

 async getPost(postId: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    return post;
  }
  
  async getPostsByUser(userId: number): Promise<(Post & { author: User })[]> {
    const results = await db.select({
      post: posts,
      author: users
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.authorId, userId))
    .orderBy(desc(posts.createdAt));

    return results.map(r => ({ ...r.post, author: r.author }));
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    // Reward artist for posting (+10 points)
    const author = await this.getUser(insertPost.authorId);
    if (author?.role === "artist") {
      await this.updateUserPoints(insertPost.authorId, 10);
    }
    return post;
  }
async likePost(postId: number): Promise<void> {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (post) {
      await db.update(posts)
        .set({ likesCount: post.likesCount + 1 })
        .where(eq(posts.id, postId));
    }
  }

  async unlikePost(postId: number): Promise<void> {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (post && post.likesCount > 0) {
      await db.update(posts)
        .set({ likesCount: post.likesCount - 1 })
        .where(eq(posts.id, postId));
    }
  }

  async getGoalsByArtist(artistId: number): Promise<ArtistGoal[]> {
    return await db.select().from(artistGoals).where(eq(artistGoals.artistId, artistId));
  }

  async createGoal(insertGoal: InsertArtistGoal): Promise<ArtistGoal> {
    const [goal] = await db.insert(artistGoals).values(insertGoal).returning();
    return goal;
  }

  async createSupport(insertSupport: InsertSupport): Promise<Support> {
    const [support] = await db.insert(supports).values(insertSupport).returning();
    // Reward fan for support (+50 points)
    await this.updateUserPoints(insertSupport.fanId, 50);
    // Reward artist for receiving support (+25 points)
    await this.updateUserPoints(insertSupport.artistId, 25);
    
    // Update goal if applicable
    const goals = await this.getGoalsByArtist(insertSupport.artistId);
    const activeGoal = goals.find(g => !g.isCompleted);
    if (activeGoal) {
      const newAmount = Number(activeGoal.currentAmount) + Number(insertSupport.amount);
      await db.update(artistGoals)
        .set({ 
          currentAmount: newAmount.toString(),
          isCompleted: newAmount >= Number(activeGoal.targetAmount)
        })
        .where(eq(artistGoals.id, activeGoal.id));
    }
    
    return support;
  }

  async getPhotosByArtist(artistId: number): Promise<ArtistPhoto[]> {
    return await db.select().from(artistPhotos)
      .where(eq(artistPhotos.artistId, artistId))
      .orderBy(desc(artistPhotos.createdAt));
  }

  async createPhoto(insertPhoto: InsertArtistPhoto): Promise<ArtistPhoto> {
    const [photo] = await db.insert(artistPhotos).values(insertPhoto).returning();
    return photo;
  }

  async getVideosByArtist(artistId: number): Promise<ArtistVideo[]> {
    return await db.select().from(artistVideos)
      .where(eq(artistVideos.artistId, artistId))
      .orderBy(desc(artistVideos.createdAt));
  }

  async createVideo(insertVideo: InsertArtistVideo): Promise<ArtistVideo> {
    const [video] = await db.insert(artistVideos).values(insertVideo).returning();
    return video;
  }

  async getSongsByArtist(artistId: number): Promise<ArtistSong[]> {
    return await db.select().from(artistSongs)
      .where(eq(artistSongs.artistId, artistId))
      .orderBy(desc(artistSongs.createdAt));
  }

  async createSong(insertSong: InsertArtistSong): Promise<ArtistSong> {
    const [song] = await db.insert(artistSongs).values(insertSong).returning();
    return song;
  }

async deleteSong(songId: number): Promise<void> {
    await db.delete(artistSongs).where(eq(artistSongs.id, songId));
  }

  async removeFromPlaylist(userId: number, songId: number): Promise<void> {
    await db.delete(artistSongs).where(and(eq(artistSongs.id, songId), eq(artistSongs.artistId, userId)));
  }
  
  async getFollowersCount(artistId: number): Promise<number> {
    const result = await db.select({ count: count() })
      .from(followers)
      .where(eq(followers.artistId, artistId));
    return result[0]?.count ?? 0;
  }

  async getFollowersByUser(userId: number): Promise<User[]> {
    const result = await db.select({ user: users })
      .from(followers)
      .innerJoin(users, eq(followers.fanId, users.id))
      .where(eq(followers.artistId, userId));
    return result.map(r => r.user);
  }
  
  async getFollowingByFan(fanId: number): Promise<User[]> {
    const results = await db.select({ artist: users })
      .from(followers)
      .innerJoin(users, eq(followers.artistId, users.id))
      .where(eq(followers.fanId, fanId));
    return results.map(r => r.artist);
  }

  async followArtist(fanId: number, artistId: number): Promise<void> {
    const existing = await db.select().from(followers)
      .where(and(eq(followers.fanId, fanId), eq(followers.artistId, artistId)));
    if (existing.length === 0) {
      await db.insert(followers).values({ fanId, artistId });
    }
  }

  async unfollowArtist(fanId: number, artistId: number): Promise<void> {
    await db.delete(followers)
      .where(and(eq(followers.fanId, fanId), eq(followers.artistId, artistId)));
  }

  async isFollowing(fanId: number, artistId: number): Promise<boolean> {
    const result = await db.select().from(followers)
      .where(and(eq(followers.fanId, fanId), eq(followers.artistId, artistId)));
    return result.length > 0;
  }

async getAllPhotosForFeed() {
    try {
      const result = await db.execute(
        sql`SELECT ap.*, u.display_name, u.username, u.avatar_url, u.role FROM artist_photos ap JOIN users u ON ap.artist_id = u.id ORDER BY ap.created_at DESC`
      );
      return Array.isArray(result.rows) ? result.rows : [];
    } catch {
      return [];
    }
  }
  
  async getPhotosByUser(userId: number): Promise<ArtistPhoto[]> {
    return await db.select().from(artistPhotos)
      .where(eq(artistPhotos.artistId, userId))
      .orderBy(desc(artistPhotos.createdAt));
 }
  
async deletePost(postId: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, postId));
  }
async attendEvent(eventId: number, userId: number): Promise<void> {
    await db.insert(eventAttendees).values({ eventId, userId }).onConflictDoNothing();
  }

  async unattendEvent(eventId: number, userId: number): Promise<void> {
    await db.delete(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, userId)));
  }

  async getAttendingEvents(userId: number) {
    return await db.select({ event: events })
      .from(eventAttendees)
      .innerJoin(events, eq(eventAttendees.eventId, events.id))
      .where(eq(eventAttendees.userId, userId))
      .orderBy(asc(events.eventDate));
  }
  async getEventsByArtist(artistId: number) {
    return await db.select().from(events)
      .where(eq(events.artistId, artistId))
      .orderBy(asc(events.eventDate));
  }

  async createEvent(data: any) {
    const [event] = await db.insert(events).values(data).returning();
    return event;
  }

 async deleteEvent(eventId: number): Promise<void> {
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, eventId));
    await db.delete(events).where(eq(events.id, eventId));
  }
async getUnreadFromSender(senderId: number, receiverId: number): Promise<number> {
    try {
      const result = await db.select().from(messages)
        .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)));
      return result.filter(m => !m.isRead).length;
    } catch {
      return 0;
    }
  }
  async getUnreadMessagesCount(userId: number): Promise<number> {
    try {
      const result = await db.select().from(messages)
        .where(eq(messages.receiverId, userId));
      const unread = result.filter(m => !m.isRead).length;
      console.log(`[unread] userId=${userId} total=${result.length} unread=${unread}`);
      return unread;
    } catch (err) {
      console.error(`[unread] error:`, err);
      return 0;
    }
  }
  async markMessagesRead(userId: number, senderId: number): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.receiverId, userId), eq(messages.senderId, senderId)));
  }
 async getConversations(userId: number) {
    if (!userId || isNaN(userId)) return [];
    try {
      const sent = await db.selectDistinct({ user: users })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.receiverId))
        .where(eq(messages.senderId, userId));
      const received = await db.selectDistinct({ user: users })
        .from(messages)
        .innerJoin(users, eq(users.id, messages.senderId))
        .where(eq(messages.receiverId, userId));
      const all = [...sent, ...received].map(r => r.user);
      const unique = Array.from(new Map(all.map(u => [u.id, u])).values());
      return unique;
    } catch {
      return [];
    }
  }
  async getNotifications(userId: number) {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: { userId: number; type: string; message: string; relatedUserId?: number; relatedPostId?: number }) {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(notificationId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async deletePhoto(photoId: number): Promise<void> {
    const [photo] = await db.select().from(artistPhotos).where(eq(artistPhotos.id, photoId));
    if (photo?.imageUrl) {
      await db.delete(posts).where(and(eq(posts.authorId, photo.artistId), eq(posts.mediaUrl, photo.imageUrl)));
    }
    await db.delete(artistPhotos).where(eq(artistPhotos.id, photoId));
  }

 async deletePhotoByUrl(imageUrl: string): Promise<void> {
    const prefix = imageUrl.substring(0, 100);
    const allPhotos = await db.select().from(artistPhotos);
    const match = allPhotos.find(p => p.imageUrl?.startsWith(prefix));
    if (match) {
      await db.delete(artistPhotos).where(eq(artistPhotos.id, match.id));
    }
  }

async getPhotoComments(photoId: number) {
    try {
      const results = await db.execute(
        sql`SELECT pc.*, u.display_name, u.avatar_url, u.username FROM photo_comments pc JOIN users u ON pc.author_id = u.id WHERE pc.photo_id = ${photoId} ORDER BY pc.created_at ASC`
      );
      return Array.isArray(results.rows) ? results.rows : [];
    } catch {
      return [];
    }
  }
  async createPhotoComment(data: { photoId: number; authorId: number; content: string }) {
    const result = await db.execute(
      sql`INSERT INTO photo_comments (photo_id, author_id, content) VALUES (${data.photoId}, ${data.authorId}, ${data.content}) RETURNING *`
    );
    return result.rows[0];
  }
  
  async getVideosByUser(userId: number): Promise<ArtistVideo[]> {
    return await db.select().from(artistVideos)
      .where(eq(artistVideos.artistId, userId))
      .orderBy(desc(artistVideos.createdAt));
  }

  async getConversation(userId1: number, userId2: number): Promise<(Message & { sender: User })[]> {
    const results = await db.select({
      message: messages,
      sender: users
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    )
    .orderBy(asc(messages.createdAt));

    return results.map(r => ({ ...r.message, sender: r.sender }));
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getCommentsByPost(postId: number): Promise<(Comment & { author: User })[]> {
    const results = await db.select({
      comment: comments,
      author: users
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt));

    return results.map(r => ({ ...r.comment, author: r.author }));
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  async getCommentsCount(postId: number): Promise<number> {
    const result = await db.select({ count: count() })
      .from(comments)
      .where(eq(comments.postId, postId));
    return result[0]?.count ?? 0;
  }

  async getActiveStories(): Promise<(Story & { user: User })[]> {
    const now = new Date();
    const results = await db.select({
      story: stories,
      user: users
    })
    .from(stories)
    .innerJoin(users, eq(stories.userId, users.id))
    .where(gt(stories.expiresAt, now))
    .orderBy(desc(stories.createdAt));

    return results.map(r => ({ ...r.story, user: r.user }));
  }

  async getStoriesByUser(userId: number): Promise<Story[]> {
    return await db.select().from(stories)
      .where(eq(stories.userId, userId))
      .orderBy(desc(stories.createdAt));
  }

  async createStory(insertStory: InsertStory): Promise<Story> {
    const [story] = await db.insert(stories).values(insertStory).returning();
    return story;
  }
}

export const storage = new DatabaseStorage();
