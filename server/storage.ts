import { db } from "./db";
import {
  users,
  posts,
  artistGoals,
  supports,
  artistPhotos,
  artistVideos,
  artistSongs,
  followers,
  messages,
  comments,
  stories,
  notifications,
  events,
  eventAttendees,
  pointsTransactions,
  pointsRedemptions,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Post,
  InsertPost,
  ArtistGoal,
  InsertArtistGoal,
  Support,
  InsertSupport,
  ArtistPhoto,
  InsertArtistPhoto,
  ArtistVideo,
  InsertArtistVideo,
  ArtistSong,
  InsertArtistSong,
  Message,
  InsertMessage,
  Comment,
  InsertComment,
  Story,
  InsertStory,
  PointsTransaction,
  InsertPointsTransaction,
  PointsRedemption,
  InsertPointsRedemption,
} from "@shared/schema";
import { eq, desc, count, or, and, asc, ilike, gt, gte, lte, sql } from "drizzle-orm";
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
  decrementUserPoints(id: number, points: number): Promise<void>;
  getPointsTransactionsByUser(userId: number): Promise<PointsTransaction[]>;
  getTodayPointsTransactions(userId: number): Promise<PointsTransaction[]>;
  createPointsTransaction(data: InsertPointsTransaction): Promise<PointsTransaction>;
  createPointsRedemption(data: InsertPointsRedemption): Promise<PointsRedemption>;

 // Posts
  getPosts(): Promise<(Post & { author: User })[]>;
  getPost(postId: number): Promise<Post | undefined>;
  getPostsByUser(userId: number): Promise<(Post & { author: User })[]>;
  createPost(post: InsertPost): Promise<Post>;
  likePost(postId: number): Promise<void>;

  // Goals
  getGoalsByArtist(artistId: number): Promise<ArtistGoal[]>;
  createGoal(goal: InsertArtistGoal): Promise<ArtistGoal>;
  deleteGoal(goalId: number, artistId: number): Promise<boolean>;

  // Support
  createSupport(support: InsertSupport): Promise<Support>;

  // Artist Media
  getPhotosByArtist(artistId: number): Promise<ArtistPhoto[]>;
  createPhoto(photo: InsertArtistPhoto): Promise<ArtistPhoto>;
  getVideosByArtist(artistId: number): Promise<ArtistVideo[]>;
  createVideo(video: InsertArtistVideo): Promise<ArtistVideo>;
  getAllVideosForFeed(): Promise<any[]>;
  getSongsByArtist(artistId: number): Promise<ArtistSong[]>;
  createSong(song: InsertArtistSong): Promise<ArtistSong>;
  songAlreadyExistsForArtist(artistId: number, audioUrl: string): Promise<boolean>;

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
deleteStory(storyId: number, userId: number): Promise<boolean>;
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
  const cleanQuery = query.trim();
  const cleanRole = role?.trim();

  const selectUserFields = sql`
    SELECT
      id,
      username,
      display_name AS "displayName",
      email,
      bio,
      avatar_url AS "avatarUrl",
      role,
      genre,
      vibyng_points AS "vibyngPoints",
      address,
      phone,
      website,
      city,
      email_verified AS "emailVerified",
      verification_token AS "verificationToken",
      stripe_connected_account_id AS "stripeConnectedAccountId",
      stripe_onboarding_complete AS "stripeOnboardingComplete",
      created_at AS "createdAt",
      is_deleted AS "isDeleted",
      deleted_at AS "deletedAt"
    FROM users
  `;

  if (!cleanQuery) {
    if (cleanRole) {
      const result = await db.execute(sql`
        ${selectUserFields}
        WHERE role = ${cleanRole}
          AND COALESCE(is_deleted, false) = false
        ORDER BY display_name ASC
      `);

      return result.rows as unknown as User[];
    }

    const result = await db.execute(sql`
      ${selectUserFields}
      WHERE COALESCE(is_deleted, false) = false
      ORDER BY display_name ASC
    `);

    return result.rows as unknown as User[];
  }

  const pattern = `%${cleanQuery}%`;

  if (cleanRole) {
    const result = await db.execute(sql`
      ${selectUserFields}
      WHERE role = ${cleanRole}
        AND COALESCE(is_deleted, false) = false
        AND (
          display_name ILIKE ${pattern}
          OR username ILIKE ${pattern}
          OR genre ILIKE ${pattern}
          OR city ILIKE ${pattern}
        )
      ORDER BY display_name ASC
    `);

    return result.rows as unknown as User[];
  }

  const result = await db.execute(sql`
    ${selectUserFields}
    WHERE COALESCE(is_deleted, false) = false
      AND (
        display_name ILIKE ${pattern}
        OR username ILIKE ${pattern}
        OR genre ILIKE ${pattern}
        OR city ILIKE ${pattern}
      )
    ORDER BY display_name ASC
  `);

  return result.rows as unknown as User[];
}
  async updateUserPoints(id: number, points: number): Promise<void> {
    const user = await this.getUser(id);
    if (user) {
      await db.update(users)
        .set({ vibyngPoints: user.vibyngPoints + points })
        .where(eq(users.id, id));
    }
  }

  async decrementUserPoints(id: number, points: number): Promise<void> {
    await db.update(users)
      .set({
        vibyngPoints: sql`GREATEST(${users.vibyngPoints} - ${points}, 0)`,
      })
      .where(eq(users.id, id));
  }

  async getPointsTransactionsByUser(userId: number): Promise<PointsTransaction[]> {
    return await db.select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, userId))
      .orderBy(desc(pointsTransactions.createdAt));
  }

  async getTodayPointsTransactions(userId: number): Promise<PointsTransaction[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return await db.select()
      .from(pointsTransactions)
      .where(
        and(
          eq(pointsTransactions.userId, userId),
          gte(pointsTransactions.createdAt, start),
          lte(pointsTransactions.createdAt, end),
        )
      )
      .orderBy(desc(pointsTransactions.createdAt));
  }

  async createPointsTransaction(data: InsertPointsTransaction): Promise<PointsTransaction> {
    const [transaction] = await db.insert(pointsTransactions).values(data).returning();
    return transaction;
  }

  async createPointsRedemption(data: InsertPointsRedemption): Promise<PointsRedemption> {
    const [redemption] = await db.insert(pointsRedemptions).values(data).returning();
    return redemption;
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
    return post;
  }
    
async likePost(postId: number, userId: number): Promise<void> {
    try {
      const result = await db.execute(sql`INSERT INTO post_likes (post_id, user_id) VALUES (${postId}, ${userId}) ON CONFLICT DO NOTHING RETURNING id`);
      if (result.rows.length > 0) {
        await db.update(posts)
          .set({ likesCount: sql`${posts.likesCount} + 1` })
          .where(eq(posts.id, postId));
      }
    } catch {}
  }

  async unlikePost(postId: number, userId: number): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}`);
      await db.update(posts)
        .set({ likesCount: sql`GREATEST(${posts.likesCount} - 1, 0)` })
        .where(eq(posts.id, postId));
    } catch {}
  }

  async hasLikedPost(postId: number, userId: number): Promise<boolean> {
    try {
      const result = await db.execute(sql`SELECT id FROM post_likes WHERE post_id = ${postId} AND user_id = ${userId}`);
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  async getGoalsByArtist(artistId: number): Promise<ArtistGoal[]> {
    return await db.select().from(artistGoals).where(eq(artistGoals.artistId, artistId));
  }

 async createGoal(insertGoal: InsertArtistGoal): Promise<ArtistGoal> {
    const [goal] = await db.insert(artistGoals).values(insertGoal).returning();
    return goal;
  }

 async deleteGoal(goalId: number, artistId: number): Promise<boolean> {
  const deleted = await db
    .delete(artistGoals)
    .where(and(eq(artistGoals.id, goalId), eq(artistGoals.artistId, artistId)))
    .returning({ id: artistGoals.id });

  return deleted.length > 0;
 }
  
  async createSupport(insertSupport: InsertSupport): Promise<Support> {
    const [support] = await db.insert(supports).values(insertSupport).returning();

    const amount = Number(insertSupport.amount);

    if (Number.isFinite(amount) && amount > 0) {
      let goalToUpdate: ArtistGoal | undefined;

      if (insertSupport.goalId) {
        const [selectedGoal] = await db
          .select()
          .from(artistGoals)
          .where(
            and(
              eq(artistGoals.id, insertSupport.goalId),
              eq(artistGoals.artistId, insertSupport.artistId)
            )
          );

        goalToUpdate = selectedGoal;
      } else {
        const goals = await this.getGoalsByArtist(insertSupport.artistId);
        goalToUpdate = goals.find((goal) => !goal.isCompleted);
      }

      if (goalToUpdate) {
        const newAmount = Number(goalToUpdate.currentAmount) + amount;

        await db
          .update(artistGoals)
          .set({
            currentAmount: newAmount.toString(),
            isCompleted: newAmount >= Number(goalToUpdate.targetAmount),
          })
          .where(eq(artistGoals.id, goalToUpdate.id));
      }
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
  const result = await db.execute(sql`
    SELECT
      av.id,
      av.artist_id AS "artistId",
      av.title,
      av.video_url AS "videoUrl",
      av.thumbnail_url AS "thumbnailUrl",
      GREATEST(
  COALESCE(av.likes_count, 0),
  COALESCE(vl.likes_count, 0)
)::int AS "likesCount",
      av.created_at AS "createdAt"
      FROM artist_videos av
      LEFT JOIN (
      SELECT
        video_id,
        COUNT(DISTINCT user_id)::int AS likes_count
      FROM video_likes
      GROUP BY video_id
    ) vl ON vl.video_id = av.id
    WHERE av.artist_id = ${artistId}
    ORDER BY av.created_at DESC
  `);

  return result.rows as unknown as ArtistVideo[];
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

  async songAlreadyExistsForArtist(artistId: number, audioUrl: string): Promise<boolean> {
  const existing = await db
    .select({ id: artistSongs.id })
    .from(artistSongs)
    .where(and(eq(artistSongs.artistId, artistId), eq(artistSongs.audioUrl, audioUrl)))
    .limit(1);

  return existing.length > 0;
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

async getAllVideosForFeed() {
  try {
    const result = await db.execute(
      sql`SELECT av.*, u.display_name, u.username, u.avatar_url, u.role
          FROM artist_videos av
          JOIN users u ON av.artist_id = u.id
          ORDER BY av.created_at DESC`
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
    const result = await db.execute(sql`
      SELECT *
      FROM (
        SELECT DISTINCT ON (other_user.id)
          other_user.*,
          m.created_at AS last_message_at
        FROM messages m
        JOIN users other_user
          ON other_user.id = CASE
            WHEN m.sender_id = ${userId} THEN m.receiver_id
            ELSE m.sender_id
          END
        WHERE m.sender_id = ${userId} OR m.receiver_id = ${userId}
        ORDER BY other_user.id, m.created_at DESC
      ) conversations
      ORDER BY conversations.last_message_at DESC
    `);

    return Array.isArray(result.rows) ? result.rows : [];
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
  
  async likePhotoComment(commentId: number): Promise<void> {
    await db.execute(
      sql`UPDATE photo_comments SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ${commentId}`
    );
  }

  async deletePhotoComment(commentId: number): Promise<void> {
    await db.execute(
      sql`DELETE FROM photo_comments WHERE id = ${commentId}`
    );
  }

async getVideoComments(videoId: number) {
    try {
      const result = await db.execute(
        sql`SELECT vc.*, u.display_name, u.avatar_url, u.username FROM video_comments vc JOIN users u ON vc.author_id = u.id WHERE vc.video_id = ${videoId} ORDER BY vc.created_at ASC`
      );
      return Array.isArray(result.rows) ? result.rows : [];
    } catch {
      return [];
    }
  }

  async createVideoComment(data: { videoId: number; authorId: number; content: string }) {
    const result = await db.execute(
      sql`INSERT INTO video_comments (video_id, author_id, content) VALUES (${data.videoId}, ${data.authorId}, ${data.content}) RETURNING *`
    );
    return result.rows[0];
  }

  async likeVideoComment(commentId: number): Promise<void> {
    await db.execute(
      sql`UPDATE video_comments SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ${commentId}`
    );
  }

  async deleteVideoComment(commentId: number): Promise<void> {
    await db.execute(
      sql`DELETE FROM video_comments WHERE id = ${commentId}`
    );
  }

async deleteVideo(videoId: number): Promise<void> {
    await db.delete(artistVideos).where(eq(artistVideos.id, videoId));
  }
  
 async getVideosByUser(userId: number): Promise<ArtistVideo[]> {
  const result = await db.execute(sql`
    SELECT
      av.id,
      av.artist_id AS "artistId",
      av.title,
      av.video_url AS "videoUrl",
      av.thumbnail_url AS "thumbnailUrl",
      GREATEST(
  COALESCE(av.likes_count, 0),
  COALESCE(vl.likes_count, 0)
)::int AS "likesCount",
      av.created_at AS "createdAt"
    FROM artist_videos av
    LEFT JOIN (
      SELECT
        video_id,
        COUNT(DISTINCT user_id)::int AS likes_count
      FROM video_likes
      GROUP BY video_id
    ) vl ON vl.video_id = av.id
    WHERE av.artist_id = ${userId}
    ORDER BY av.created_at DESC
  `);

  return result.rows as unknown as ArtistVideo[];
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

  async likeComment(commentId: number, userId: number): Promise<void> {
    const result = await db.execute(sql`INSERT INTO comment_likes (comment_id, user_id) VALUES (${commentId}, ${userId}) ON CONFLICT DO NOTHING RETURNING id`);
    if (result.rows.length > 0) {
      await db.execute(sql`UPDATE comments SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = ${commentId}`);
    }
  }

  async unlikeComment(commentId: number, userId: number): Promise<void> {
    const result = await db.execute(sql`DELETE FROM comment_likes WHERE comment_id = ${commentId} AND user_id = ${userId} RETURNING id`);
    if (result.rows.length > 0) {
      await db.execute(sql`UPDATE comments SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = ${commentId}`);
    }
  }

  async deleteComment(commentId: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, commentId));
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

async deleteStory(storyId: number, userId: number): Promise<boolean> {
  const deleted = await db
    .delete(stories)
    .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
    .returning({ id: stories.id });

  return deleted.length > 0;
}
}

export const storage = new DatabaseStorage();
