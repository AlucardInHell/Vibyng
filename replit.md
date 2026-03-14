# Vibyng Platform

## Overview

Vibyng is a community-first digital platform connecting emerging artists directly with fans, transforming engagement into real economic support. Unlike traditional streaming platforms where artist compensation is minimal and relationships are algorithm-mediated, Vibyng creates a vertical community environment where artists can cultivate and monetize their fanbase directly.

The platform features artist profiles, fundable goals, exclusive content, events, and a VibyngPoints reward economy system that incentivizes fan participation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Vibyng theme (purple primary color scheme)
- **Build Tool**: Vite with HMR support

The frontend follows a mobile-first design with a bottom navigation bar and responsive layouts. Pages include Feed, Search, Artists listing, Artist profiles, and Points/Rewards.

### User Roles
The platform supports multiple profile types:
- **fan**: Regular music fans
- **artist**: Musicians and performers
- **business**: Music-related businesses
- **rehearsal_room**: Rehearsal spaces and studios
- **music_store**: Music equipment shops
- **record_label**: Record labels and music publishers

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

The server uses a storage abstraction layer (`IStorage` interface) that enables swapping implementations. Currently uses `DatabaseStorage` class for PostgreSQL operations.

### Shared Code
- **Schema**: Drizzle table definitions in `shared/schema.ts` (users, posts, artistGoals, supports, stories)
- **Routes**: Type-safe API contract definitions with Zod schemas for input validation
- **Types**: Exported from schema for use across client and server

### Build System
- Development: Vite dev server with Express backend proxy
- Production: Vite builds static assets, esbuild bundles server code

## External Dependencies

### Database
- **PostgreSQL**: Primary data store configured via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `./migrations` directory
- **connect-pg-simple**: PostgreSQL session storage support

### UI Libraries
- **Radix UI**: Full suite of accessible, unstyled primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-styled components using Radix + Tailwind
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component support

### Data & Validation
- **Zod**: Schema validation for API inputs and responses
- **drizzle-zod**: Auto-generates Zod schemas from Drizzle table definitions
- **React Hook Form**: Form handling with `@hookform/resolvers`

### Utilities
- **date-fns**: Date manipulation
- **class-variance-authority**: Component variant management
- **clsx/tailwind-merge**: Conditional class composition