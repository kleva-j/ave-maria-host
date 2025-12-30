# AV-Daily

A modern financial application built with a focus on security, scalability, and user experience. This project leverages a cutting-edge TypeScript stack with end-to-end type safety and robust authentication/authorization.

## 🚀 Features

### Core

- **TypeScript** - Full-stack type safety
- **Monorepo** - Managed with Turborepo for optimal builds
- **Effect** - Functional programming for better error handling and concurrency

### Frontend

- **React** + **Vite** - Fast and efficient UI development
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components
- **TanStack Router** - Type-safe routing
- **PWA Support** - Installable web application

### Backend

- **Hono** - Fast and lightweight web framework
- **oRPC** - End-to-end type-safe APIs
- **Drizzle ORM** - Type-safe database interactions
- **PostgreSQL** - Robust relational database

### Authentication & Security

- **Biometric Authentication** - Fingerprint and Face ID support
- **Role-Based Access Control (RBAC)** - Fine-grained permissions
- **KYC Integration** - Multi-tier verification system
- **Session Management** - Secure token-based authentication
- **Audit Logging** - Comprehensive security event tracking

### Mobile

- **React Native** - Cross-platform mobile development
- **Expo** - Streamlined mobile development workflow

### Tooling

- **Bun** - Fast JavaScript runtime
- **ESLint** + **Prettier** - Code quality and formatting
- **Husky** - Git hooks
- **Changesets** - Version management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- PostgreSQL 14+
- pnpm 8.x

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   # Update the environment variables in .env
   ```

3. Install Bun (recommended):

   ```bash
   # macOS/Linux
   curl -fsSL https://bun.sh/install | bash

   # Windows (PowerShell)
   powershell -c "irm bun.sh/install.ps1 | iex"

   # Verify installation
   bun --version
   ```

## 🗄️ Database Setup

1. Create a PostgreSQL database
2. Update your database connection in `.env`
3. Run migrations:
   ```bash
   pnpm db:push
   ```
4. (Optional) Seed the database:
   ```bash
   pnpm db:seed
   ```

### Database Reset (⚠️ Destructive Operation)

To reset your database (drops all tables and types), use the reset command with confirmation:

```bash
# Using Bun (recommended)
DB_RESET_CONFIRM=1 pnpm db:reset

# Using Node.js (fallback)
DB_RESET_CONFIRM=1 pnpm db:reset:node
```

**Safety Features:**

- Requires `DB_RESET_CONFIRM=1` environment variable
- Blocks execution in production unless `DB_RESET_ALLOW_PRODUCTION=1` is set
- Shows clear warnings before execution

**Environment Variables:**

- `DB_RESET_CONFIRM=1` - Required to confirm destructive reset operation
- `DB_RESET_ALLOW_PRODUCTION=1` - Override production safety check (use with extreme caution)
- `NODE_ENV=production` - Automatically detected to prevent accidental production resets

## 🚦 Development

### Start Development Servers

```bash
# Start all services (web, server, mobile)
pnpm dev

# Or start services individually
pnpm dev:web      # Web frontend (http://localhost:3001)
pnpm dev:server   # API server (http://localhost:3000)
pnpm dev:native   # Mobile app (Expo)
pnpm dev:fumadocs # Documentation site (http://localhost:3002)
```

### Environment Variables

Key environment variables (see `.env.example` for all):

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/avedaily

# Authentication
AUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret

# API
API_BASE_URL=http://localhost:3000
```

## 🏗️ Project Structure

```
host/
├── apps/
│   ├── web/           # Web frontend (React + Vite)
│   ├── native/        # Mobile app (React Native + Expo)
│   ├── server/        # Backend API (Hono + oRPC)
│   └── fumadocs/      # Documentation site
│
├── docs/
│     ├── api/         # API documentation
│     └── adr/         # Architecture Decision Records
│
├── packages/
│   ├── api/            # Shared API types and clients
│   ├── application/    # Core business logic
│   ├── infrastructure/ # Infrastructure abstractions 
│   ├── domain/         # Domain models and business logic
│   ├── auth/           # Authentication & authorization
│   │   ├── src/        # Auth service implementation
│   │   │   ├── authorization/  # RBAC & permissions
│   │   │   ├── effects/        # Side effects
│   │   │   └── providers/      # Auth providers
│   ├── db/            # Database schema & migrations
│   └── shared/        # Shared utilities and types
│
└── scripts/           # Development and build scripts
```

## 🛠️ Available Scripts

### Development

```bash
# Start all services in development mode
pnpm dev

# Start specific services
pnpm dev:web        # Web frontend
pnpm dev:server     # API server
pnpm dev:native     # Mobile app
pnpm dev:fumadocs   # Documentation site

# Startup Docker database
pnpm db:start

# Shutdown Docker database
pnpm db:down

# Run tests
pnpm test
pnpm test:watch     # Watch mode
pnpm test:coverage  # Generate coverage report

# Type checking
pnpm type-check    # Check types across all packages
```

### Database

```bash
# Database migrations
pnpm db:push       # Apply schema changes
pnpm db:generate   # Generate Drizzle types
pnpm db:studio     # Open database UI

# Database management
pnpm db:reset      # Reset database (requires DB_RESET_CONFIRM=1)
pnpm db:seed       # Seed database with test data
```

### Build & Deploy

```bash
# Build all applications
pnpm build

# Build specific applications
pnpm build:web
pnpm build:server
pnpm build:native
pnpm build:fumadocs

# Generate PWA assets
pnpm generate-pwa-assets

# Tauri desktop app
pnpm desktop:dev    # Development
pnpm desktop:build  # Production build
```

### Linting & Formatting

```bash
pnpm lint          # Run linter
pnpm format        # Format code
pnpm type-check    # Type checking
```

## 🔒 Security Features

- **Biometric Authentication**: Secure login with fingerprint/face recognition
- **Role-Based Access Control**: Fine-grained permissions system
- **KYC Integration**: Multi-tier verification system
- **Audit Logging**: Comprehensive security event tracking
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: Built-in request verification
- **Secure Headers**: Helmet.js for security headers
- **Input Validation**: Runtime type checking with Effect Schema

## 📚 Documentation

- [API Documentation](/apps/fumadocs) - Comprehensive API reference
- [Architecture Decision Records](/docs/adr) - Key technical decisions
- [Deployment Guide](/docs/deployment.md) - How to deploy to production
- [Security Guidelines](/docs/security.md) - Security best practices

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) for the project template
- [Effect](https://effect.website/) for the functional programming primitives
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database queries
- [Hono](https://hono.dev/) for the lightweight web framework
