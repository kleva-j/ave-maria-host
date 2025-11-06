# Better-T-Stack Project Rules
## Overview

Better-T-Stack is a modern, full-stack TypeScript development framework that provides a complete monorepo setup with web, server, and mobile applications. This project includes authentication, database management, API handling, and shared packages for seamless development across platforms.

This is a host project created with Better-T-Stack CLI.

## Project Structure

This is a monorepo with the following structure:

### Applications
- **`apps/web/`** - Frontend application (React with TanStack Router)
- **`apps/server/`** - Backend server (Hono)
- **`apps/native/`** - React Native mobile app (with NativeWind)
- **`apps/fumadocs/`** - Project documentation (Fumadocs)

### Core Packages
- **`packages/api/`** - Shared API logic and types
- **`packages/domain/`** - Core domain models and business logic
- **`packages/application/`** - Application services and use cases
- **`packages/infrastructure/`** - Infrastructure implementations
- **`packages/db/`** - Database schema and utilities
- **`packages/auth/`** - Authentication logic and utilities

## Available Scripts

### Development
- `pnpm run dev` - Start all apps in development mode
- `pnpm run dev:web` - Start only the web app
- `pnpm run dev:server` - Start only the server
- `pnpm run dev:native` - Start only the native app
- `pnpm run check-types` - Type-check all packages

### Build & Deploy
- `pnpm run build` - Build all packages and apps
- `pnpm run ruler:apply` - Apply Ruler configurations (local only)

### Documentation
- `cd apps/fumadocs && pnpm dev` - Start documentation server

## Database Management

All database operations should be run from the root workspace:

### Development
- `pnpm run db:push` - Push schema changes to database
- `pnpm run db:studio` - Open database studio (Drizzle Studio)
- `pnpm run db:generate` - Generate Drizzle type files
- `pnpm run db:migrate` - Create and run database migrations
- `pnpm run db:watch` - Watch for schema changes and regenerate types

### Database Control
- `pnpm run db:start` - Start the database service
- `pnpm run db:stop` - Stop the database service
- `pnpm run db:down` - Stop and remove database containers
- `pnpm run db:reset` - Reset the database (drop and recreate)
- `pnpm run db:reset:node` - Node-specific database reset

Database schema files are located in `packages/db/schema/`

## API Structure

### Server-Side
- oRPC endpoints are in `apps/server/src/api/`
- Request/response types are in `packages/api/`
- Domain logic is separated into `packages/domain/`
- Application services are in `packages/application/`
- Infrastructure implementations are in `packages/infrastructure/`

### Client-Side
- API client utils are in `apps/web/src/utils/api.ts`
- Shared types are imported from `@host/api`
- React Query hooks are auto-generated from the API types

## Authentication

Authentication is enabled in this project:
- Server auth logic is in `apps/server/src/lib/auth.ts`
- Web app auth client is in `apps/web/src/lib/auth-client.ts`
- Native app auth client is in `apps/native/src/lib/auth-client.ts`

## Adding More Features

You can add additional addons or deployment options to your project using:

```bash
pnpx create-better-t-stack add
```

### Available Addons
- **Documentation**: 
  - Fumadocs (currently in use)
  - Starlight (alternative documentation solution)

- **Code Quality**:
  - Biome (formatter and linter)
  - Oxlint (Rust-based linter)
  - Ultracite (advanced linting)

- **Development Tools**:
  - Ruler (project governance)
  - Turborepo (already configured)
  - Husky (git hooks)

- **Deployment**:
  - Cloudflare Workers
  - Vercel
  - AWS Amplify
  - Docker support

- **Features**:
  - PWA support
  - Tauri (desktop apps)
  - Storybook (component documentation)
  - Testing (Vitest, Playwright, Cypress)

To add any of these features, run the add command and follow the interactive prompts.

## Project Configuration

This project includes several configuration files:

### `bts.jsonc`
- Contains your selected stack configuration (database, ORM, backend, frontend, etc.)
- Used by the CLI to understand your project structure
- Updated automatically when using the `add` command

### Environment Variables
- `.env` - Root environment variables (shared across all services)
- `apps/web/.env` - Web-specific environment variables
- `apps/server/.env` - Server-specific environment variables
- `apps/native/.env` - Native app environment variables

### TypeScript Configuration
- `tsconfig.json` - Base TypeScript configuration
- `apps/*/tsconfig.json` - App-specific TypeScript configs
- `packages/*/tsconfig.json` - Package-specific TypeScript configs

## Key Points

- This is a Turborepo monorepo using pnpm workspaces (v10.2.0+)
- Each app and package has its own `package.json` and dependencies
- Run commands from the root to execute across all workspaces
- Run workspace-specific commands with `pnpm -F @host/package-name command-name`
- Turborepo handles build caching and parallel execution
- Uses `dotenv` for environment variable management
- Follows Domain-Driven Design (DDD) principles with clear separation of concerns
- Uses `zod` for runtime type validation
- Documentation is maintained in `apps/fumadocs/`
- Use `pnpm run ruler:apply` to apply local Ruler configurations
- Use `pnpx create-better-t-stack add` to add more features later
