# Better-T-Stack Project Rules

This is a host project created with Better-T-Stack CLI.

## Project Structure

This is a monorepo with the following structure:

- **`apps/web/`** - Frontend application (React with TanStack Router)

- **`apps/server/`** - Backend server (Hono)

- **`packages/api/`** - Shared API logic and types
- **`packages/auth/`** - Authentication logic and utilities
- **`packages/db/`** - Database schema and utilities

- **`apps/native/`** - React Native mobile app (with NativeWind)

## Available Scripts

- `pnpm run dev` - Start all apps in development mode
- `pnpm run dev:web` - Start only the web app
- `pnpm run dev:server` - Start only the server
- `pnpm run dev:native` - Start only the native app

## Database Commands

All database operations should be run from the server workspace:

- `pnpm run db:push` - Push schema changes to database
- `pnpm run db:studio` - Open database studio
- `pnpm run db:generate` - Generate Drizzle files
- `pnpm run db:migrate` - Run database migrations

Database schema files are located in `apps/server/src/db/schema/`

## API Structure

- oRPC endpoints are in `apps/server/src/api/`
- Client-side API utils are in `apps/web/src/utils/api.ts`

## Authentication

Authentication is enabled in this project:
- Server auth logic is in `apps/server/src/lib/auth.ts`
- Web app auth client is in `apps/web/src/lib/auth-client.ts`
- Native app auth client is in `apps/native/src/lib/auth-client.ts`

## Adding More Features

You can add additional addons or deployment options to your project using:

```bash
pnpx create-better-t-stack
add
```

Available addons you can add:
- **Documentation**: Starlight, Fumadocs
- **Linting**: Biome, Oxlint, Ultracite
- **Other**: Ruler, Turborepo, PWA, Tauri, Husky

You can also add web deployment configurations like Cloudflare Workers support.

## Project Configuration

This project includes a `bts.jsonc` configuration file that stores your Better-T-Stack settings:

- Contains your selected stack configuration (database, ORM, backend, frontend, etc.)
- Used by the CLI to understand your project structure
- Safe to delete if not needed
- Updated automatically when using the `add` command

## Key Points

- This is a Turborepo monorepo using pnpm workspaces
- Each app has its own `package.json` and dependencies
- Run commands from the root to execute across all workspaces
- Run workspace-specific commands with `pnpm run command-name`
- Turborepo handles build caching and parallel execution
- Use `pnpx
create-better-t-stack add` to add more features later
