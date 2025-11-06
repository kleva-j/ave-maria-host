# AV-Daily Clean Architecture Packages

This directory contains the clean architecture packages for the AV-Daily financial platform.

## Package Structure

### Core Architecture Layers

- **`domain/`** - Domain Layer (Business entities and rules)
  - Contains core business entities, value objects, and domain services
  - No dependencies on external frameworks or infrastructure
  - Pure business logic and rules

- **`application/`** - Application Layer (Use cases and orchestration)
  - Contains application use cases and orchestrates domain objects
  - Depends on domain layer but independent of infrastructure concerns
  - Defines ports (interfaces) for external services

- **`infrastructure/`** - Infrastructure Layer (External concerns)
  - Contains implementations of external services and infrastructure
  - Implements repository interfaces and external service ports
  - Handles database, payment gateways, notifications, etc.

- **`shared/`** - Shared utilities across layers
  - Common schemas, error definitions, and types
  - Used by all other layers for consistency

### Interface Adapters

- **`api/`** - API Layer (Controllers, routers, middleware)
  - HTTP/REST API controllers and oRPC route definitions
  - Coordinates between web layer and application layer
  - Updated to include clean architecture dependencies

### Cross-cutting Concerns

- **`auth/`** - Authentication utilities and configuration
- **`db/`** - Database schema, migrations, and utilities

## Dependencies Flow

```
Infrastructure → Application → Domain
     ↑              ↑
   API ←----------→ Shared
```

- Domain layer has no external dependencies
- Application layer depends only on Domain
- Infrastructure layer depends on Application and Domain
- API layer coordinates between all layers
- Shared utilities are used across all layers

## Development

Each package can be built independently:

```bash
# Build individual packages
pnpm run --filter @host/domain build
pnpm run --filter @host/application build
pnpm run --filter @host/infrastructure build
pnpm run --filter @host/shared build

# Build all packages
pnpm run build
```

## Next Steps

The foundational structure is now in place. Subsequent tasks will implement:

1. Domain entities and value objects (Task 2)
2. Application use cases (Task 4)
3. Infrastructure implementations (Task 5)
4. API controllers and routing (Task 6)
