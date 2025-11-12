/**
 * @fileoverview Shared Redis Client Configuration
 *
 * This module provides a shared Redis client interface and context tag
 * that can be used across multiple infrastructure services.
 */

import type { Redis } from "ioredis";

import { Context } from "effect";

/**
 * Redis client dependency interface.
 */
export interface RedisClient {
  readonly client: Redis;
}

/**
 * Redis client service tag.
 */
export const RedisClient = Context.GenericTag<RedisClient>("RedisClient");
