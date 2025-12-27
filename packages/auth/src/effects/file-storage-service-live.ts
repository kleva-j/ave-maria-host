import { FileStorageService } from "../kyc/layer";
import { Effect, Layer } from "effect";

import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Simple file system-based storage service for development
 * In production, this would be replaced with AWS S3, Google Cloud Storage, etc.
 */
export const FileStorageServiceLive = Layer.succeed(
  FileStorageService,
  FileStorageService.of({
    uploadFile: (key, data, mimeType) =>
      Effect.gen(function* (_) {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), "uploads");
        const filePath = path.join(uploadsDir, key);
        const fileDir = path.dirname(filePath);

        yield* _(
          Effect.tryPromise({
            try: () => fs.mkdir(fileDir, { recursive: true }),
            catch: (error) => new Error(`Failed to create directory: ${error}`),
          })
        );

        // Write file to disk
        yield* _(
          Effect.tryPromise({
            try: () => fs.writeFile(filePath, data),
            catch: (error) => new Error(`Failed to write file: ${error}`),
          })
        );

        // Return a URL (in production this would be the actual URL)
        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        return `${baseUrl}/uploads/${key}`;
      }),

    deleteFile: (key) =>
      Effect.gen(function* (_) {
        const filePath = path.join(process.cwd(), "uploads", key);
        
        yield* _(
          Effect.tryPromise({
            try: () => fs.unlink(filePath),
            catch: (error) => new Error(`Failed to delete file: ${error}`),
          })
        );
      }),

    getSignedUrl: (key, expiresIn = 3600) =>
      Effect.sync(() => {
        // In a real implementation, this would generate a signed URL
        // For now, just return the direct URL
        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        const url = `${baseUrl}/uploads/${key}`;
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        return `${url}?expires=${expiresAt.toISOString()}`;
      }),
  })
);
