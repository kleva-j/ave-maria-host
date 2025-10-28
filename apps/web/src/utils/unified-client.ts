/**
 * @fileoverview Unified Client Adapter for Migration
 * 
 * This module provides a unified interface that can switch between oRPC and @effect/rpc
 * based on feature flags, enabling gradual migration with backward compatibility.
 */

import { shouldUseEffectRpc, logMigrationUsage } from "./feature-flags";
import { client as orpcClient } from "./orpc";
import { effectRpcClient } from "./effect-rpc-client";

/**
 * Unified client interface that abstracts the underlying RPC implementation
 */
export class UnifiedRpcClient {
  /**
   * Todo operations with automatic client selection
   */
  async getAllTodos() {
    if (shouldUseEffectRpc('TODOS')) {
      return effectRpcClient.getAllTodos();
    } else {
      logMigrationUsage('getAllTodos', 'orpc');
      return orpcClient.todo.getAll();
    }
  }

  async createTodo(text: string) {
    if (shouldUseEffectRpc('TODOS')) {
      return effectRpcClient.createTodo(text);
    } else {
      logMigrationUsage('createTodo', 'orpc');
      return orpcClient.todo.create({ text });
    }
  }

  async updateTodo(id: number, completed: boolean) {
    if (shouldUseEffectRpc('TODOS')) {
      return effectRpcClient.updateTodo(id, completed);
    } else {
      logMigrationUsage('updateTodo', 'orpc');
      return orpcClient.todo.toggle({ id });
    }
  }

  async deleteTodo(id: number) {
    if (shouldUseEffectRpc('TODOS')) {
      return effectRpcClient.deleteTodo(id);
    } else {
      logMigrationUsage('deleteTodo', 'orpc');
      return orpcClient.todo.delete({ id });
    }
  }

  /**
   * Authentication operations with automatic client selection
   */
  async login(email: string, password: string) {
    if (shouldUseEffectRpc('AUTH')) {
      return effectRpcClient.login(email, password);
    } else {
      logMigrationUsage('login', 'orpc');
      // oRPC doesn't have auth endpoints yet, so we'll use a placeholder
      throw new Error('Auth endpoints not implemented in oRPC');
    }
  }

  async getProfile() {
    if (shouldUseEffectRpc('AUTH')) {
      return effectRpcClient.getProfile();
    } else {
      logMigrationUsage('getProfile', 'orpc');
      // oRPC doesn't have auth endpoints yet, so we'll use a placeholder
      throw new Error('Auth endpoints not implemented in oRPC');
    }
  }

  /**
   * Health check with automatic client selection
   */
  async healthCheck() {
    if (shouldUseEffectRpc('HEALTH_CHECK')) {
      return effectRpcClient.healthCheck();
    } else {
      logMigrationUsage('healthCheck', 'orpc');
      return orpcClient.healthCheck();
    }
  }

  /**
   * Private data with automatic client selection
   */
  async getPrivateData() {
    if (shouldUseEffectRpc('AUTH')) {
      return effectRpcClient.getPrivateData();
    } else {
      logMigrationUsage('getPrivateData', 'orpc');
      return orpcClient.privateData();
    }
  }
}

/**
 * Default unified client instance
 */
export const unifiedClient = new UnifiedRpcClient();

/**
 * React Query utilities that work with the unified client
 */
export const createUnifiedQueryOptions = () => {
  return {
    todo: {
      getAll: {
        queryKey: ['todos'],
        queryFn: () => unifiedClient.getAllTodos(),
      },
      create: {
        mutationFn: (text: string) => unifiedClient.createTodo(text),
      },
      toggle: {
        mutationFn: ({ id }: { id: number }) => {
          // For toggle, we need to get the current state first
          // This is a simplified implementation
          return unifiedClient.updateTodo(id, true); // Would need actual toggle logic
        },
      },
      delete: {
        mutationFn: ({ id }: { id: number }) => unifiedClient.deleteTodo(id),
      },
    },
    healthCheck: {
      queryKey: ['healthCheck'],
      queryFn: () => unifiedClient.healthCheck(),
    },
    privateData: {
      queryKey: ['privateData'],
      queryFn: () => unifiedClient.getPrivateData(),
    },
  };
};
