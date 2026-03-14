import { z } from 'zod';
import { insertUserSchema, insertPostSchema, insertGoalSchema, insertSupportSchema, insertPhotoSchema, insertVideoSchema, insertSongSchema } from './schema';

// === ERROR SCHEMAS ===
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// === API CONTRACT ===
export const api = {
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/users/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: insertUserSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    artists: {
      method: 'GET' as const,
      path: '/api/artists',
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/posts',
      input: insertPostSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
  },
  goals: {
    listByArtist: {
      method: 'GET' as const,
      path: '/api/artists/:artistId/goals',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/goals',
      input: insertGoalSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
  },
  supports: {
    create: {
      method: 'POST' as const,
      path: '/api/supports',
      input: insertSupportSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
  },
  photos: {
    listByArtist: {
      method: 'GET' as const,
      path: '/api/artists/:artistId/photos',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/photos',
      input: insertPhotoSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
  },
  videos: {
    listByArtist: {
      method: 'GET' as const,
      path: '/api/artists/:artistId/videos',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/videos',
      input: insertVideoSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
  },
  songs: {
    listByArtist: {
      method: 'GET' as const,
      path: '/api/artists/:artistId/songs',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/songs',
      input: insertSongSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
  },
};

// === URL BUILDER ===
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// === TYPE EXPORTS ===
export type CreateUserInput = z.infer<typeof api.users.create.input>;
export type CreatePostInput = z.infer<typeof api.posts.create.input>;
export type CreateGoalInput = z.infer<typeof api.goals.create.input>;
export type CreateSupportInput = z.infer<typeof api.supports.create.input>;
