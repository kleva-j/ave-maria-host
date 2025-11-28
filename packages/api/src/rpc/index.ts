/**
 * @fileoverview @effect/rpc Integration
 *
 * This module provides native @effect/rpc integration for the Better-T-Stack application.
 * It replaces the previous oRPC + Effect adapter approach with native Effect RPC patterns.
 *
 * ## Key Features:
 * - **Native Effect Integration**: Direct Effect program execution without adapters
 * - **Type Safety**: End-to-end type safety with Effect Schema
 * - **Error Handling**: Native Effect error propagation
 * - **Service Injection**: Seamless dependency injection for Effect services
 * - **Performance**: No adapter layer overhead
 *
 * ## Architecture:
 * - **RPC Groups**: Logical grouping of related RPC endpoints
 * - **Effect Schema**: Type-safe schema definitions for payloads and responses
 * - **Handler Layers**: Effect layers providing RPC implementations
 * - **HTTP Protocol**: Native HTTP transport integration
 *
 * @see {@link ./todo-rpc.ts} for todo endpoint implementations
 * @see {@link ./auth-rpc.ts} for authentication endpoint implementations
 * @see {@link ./server.ts} for server integration
 */

// Re-export @effect/rpc modules for convenience
export { Schema } from "effect";
export {
  RpcSerialization,
  RpcServer,
  RpcClient,
  RpcGroup,
  Rpc,
} from "@effect/rpc";

// Export our RPC groups
export * from "./email-verification-rpc";
export * from "./analytics-rpc";
export * from "./savings-rpc";
export * from "./wallet-rpc";
export * from "./todo-rpc";
export * from "./auth-rpc";
export * from "./server";
export * from "./client";
