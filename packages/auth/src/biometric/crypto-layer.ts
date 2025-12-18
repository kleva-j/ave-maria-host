import { CryptoService } from "./layer";
import { Effect, Layer } from "effect";

import * as crypto from "node:crypto";

/**
 * Live implementation of CryptoService using Node.js crypto
 */
export const CryptoServiceLive = Layer.succeed(
  CryptoService,
  CryptoService.of({
    generateChallenge: () =>
      Effect.sync(() => {
        // Generate a random 32-byte challenge
        return crypto.randomBytes(32).toString("base64");
      }),

    verifySignature: (publicKey, signature, challenge) =>
      Effect.gen(function* (_) {
        try {
          // In a real implementation, this would:
          // 1. Parse the public key (PEM, JWK, etc.)
          // 2. Verify the signature using the appropriate algorithm
          // 3. Return true if signature is valid

          // For demo purposes, we'll do basic validation
          if (!publicKey || !signature || !challenge) {
            return false;
          }

          // Mock verification - in production, use actual cryptographic verification
          // This would typically use RSA, ECDSA, or Ed25519 signature verification
          const isValidFormat =
            signature.length >= 32 && publicKey.length >= 32;

          // Simulate signature verification with some randomness for demo
          const hash = crypto
            .createHash("sha256")
            .update(challenge + publicKey)
            .digest("hex");

          // Mock: signature should contain part of the hash for "verification"
          return isValidFormat && signature.includes(hash.substring(0, 8));
        } catch (error) {
          yield* _(
            Effect.fail(new Error(`Signature verification failed: ${error}`))
          );
        }
      }),

    generateDeviceFingerprint: (deviceInfo) =>
      Effect.sync(() => {
        // Create a unique fingerprint based on device characteristics
        const fingerprint = crypto
          .createHash("sha256")
          .update(JSON.stringify(deviceInfo))
          .digest("hex");

        return fingerprint;
      }),
  })
);
