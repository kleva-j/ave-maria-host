// Infrastructure Layer - External Concerns
// This layer contains implementations of external services and infrastructure
// It depends on application and domain layers and provides concrete implementations

export * from "./database/index.js";
export * from "./payment/index.js";
export * from "./notifications/index.js";
export * from "./external-apis/index.js";
