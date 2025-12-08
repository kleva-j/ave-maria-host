# Agent Guidelines

## Build/Test Commands
- `pnpm run build` - Build all packages and apps
- `pnpm run check-types` - Type-check all packages  
- `pnpm -F @host/api test` - Run API package tests
- `pnpm -F @host/api test:watch` - Watch API tests
- `vitest run path/to/test.test.ts` - Run single test file
- `turbo lint` - Lint all packages (if configured)

## Code Style Guidelines

### TypeScript
- Use strict TypeScript config from `tsconfig.base.json`
- Prefer `Schema.Class` for domain entities with Effect schemas
- Use branded types via `Schema.String.pipe(Schema.brand(...))`
- Import workspace packages with `@host/package-name`

### Imports & Formatting
- Group imports: external libs, then workspace packages, then local modules
- Use `@/lib/utils` for `cn()` utility in components
- Follow existing patterns for Radix UI components with class-variance-authority

### Naming Conventions
- PascalCase for classes, components, and schemas
- camelCase for functions and variables
- Use descriptive names with domain context (e.g., `KycStatusEnum`)

### Error Handling
- Use Effect schemas for runtime validation
- Return Result types for operations that can fail
- Handle errors at service boundaries, not entity level

### Architecture
- Domain entities in `packages/domain/src/entities/`
- Application services in `packages/application/src/use-cases/`
- Infrastructure implementations in `packages/infrastructure/`
- Shared schemas/types in `packages/shared/src/schemas/`