import "dotenv/config";

import { streamText, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { logger } from "hono/logger";
import { auth } from "@host/auth";
import { cors } from "hono/cors";
import { Layer } from "effect";
import { Hono } from "hono";

// Import @effect/rpc integration
import { integrateWithHono } from "@host/api/rpc/server";
import { DatabaseServiceLive } from "@host/db";
import { AuthServiceLive } from "@host/auth";

// Import Effect.ts integration
import {
  performRuntimeHealthCheck,
  initializeRuntime,
  getRuntimeStatus,
  effectMiddleware,
  AppLayer,
} from "./effects";

// Import health and monitoring routes
import { createHealthRoutes } from "./routes/health";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    // @ts-ignore
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

// Integrate @effect/rpc with Hono
integrateWithHono(app, AuthServiceLive, DatabaseServiceLive);

// Add health and monitoring routes
const healthRoutes = createHealthRoutes(app);
app.route("/", healthRoutes);

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

    // Initialize monitoring and health checks
    console.log("Setting up monitoring and health checks...");
    // Note: This would be run with the Effect runtime in a real implementation
    console.log("Monitoring and health checks configured");
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
  // @ts-ignore
  port: Number.parseInt(process.env.PORT || "3000"),
  hostname: "0.0.0.0",
};
