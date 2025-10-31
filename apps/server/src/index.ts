import "dotenv/config";

import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { streamText, convertToModelMessages } from "ai";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { appRouter } from "@host/api/routers/index";
import { createContext } from "@host/api/context";
import { RPCHandler } from "@orpc/server/fetch";
import { google } from "@ai-sdk/google";
import { onError } from "@orpc/server";
import { logger } from "hono/logger";
import { auth } from "@host/auth";
import { cors } from "hono/cors";
import { Layer } from "effect";
import { Hono } from "hono";

// Import Effect.ts integration
import {
  performRuntimeHealthCheck,
  initializeRuntime,
  getRuntimeStatus,
  effectMiddleware,
  AppLayer,
} from "./effects";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Initialize Effect.ts runtime and middleware
app.use(
  "*",
  effectMiddleware(Layer.orDie(AppLayer), {
    timeout: 30000,
    includeStackTrace: process.env.NODE_ENV === "development",
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [onError((error) => console.error(error))],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [onError((error) => console.error(error))],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  return await next();
});

app.post("/ai", async (c) => {
  const body = await c.req.json();
  const uiMessages = body.messages || [];
  const result = streamText({
    model: google("gemini-2.5-flash"),
    messages: convertToModelMessages(uiMessages),
  });

  return result.toUIMessageStreamResponse();
});

app.get("/", (c) => {
  return c.text("OK");
});

// Add Effect-based health check endpoint
app.get("/health", async (c) => {
  try {
    const status = getRuntimeStatus();
    if (status.initialized) {
      const health = await performRuntimeHealthCheck();
      return c.json({
        status: health.healthy ? "ok" : "error",
        runtime: status,
        ...health,
      });
    }
    return c.json(
      {
        status: "error",
        runtime: status,
        message: "Runtime not initialized",
      },
      503
    );
  } catch (error) {
    return c.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Add runtime status endpoint
app.get("/status", (c) => {
  return c.json(getRuntimeStatus());
});

// Initialize Effect runtime before starting server
const initializeApp = async () => {
  try {
    console.log("Initializing Effect runtime...");
    await initializeRuntime({
      environment: process.env.NODE_ENV as
        | "development"
        | "production"
        | "test",
      performHealthCheck: true,
      enableGracefulShutdown: true,
    });
    console.log("Effect runtime initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Effect runtime:", error);
    process.exit(1);
  }
};

// Initialize the app if this is the main module
if (import.meta.main) {
  initializeApp().catch((error) => {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  });
}

// Export server configuration for Bun
export default {
  fetch: app.fetch,
  port: Number.parseInt(process.env.PORT || "3000"),
  hostname: "0.0.0.0",
};
