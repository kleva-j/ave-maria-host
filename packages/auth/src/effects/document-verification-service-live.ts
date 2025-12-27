import { Effect, Layer } from "effect";
import { DocumentVerificationService } from "../kyc/layer";

/**
 * Mock document verification service for development
 * In production, this would integrate with services like:
 * - Smile Identity
 * - Jumio
 * - Onfido
 * - Veriff
 */
export const DocumentVerificationServiceLive = Layer.succeed(
  DocumentVerificationService,
  DocumentVerificationService.of({
    verifyGovernmentId: (documentUrl, idType, idNumber) =>
      Effect.gen(function* (_) {
        // Mock verification logic
        // In production, this would:
        // 1. Extract text from the document using OCR
        // 2. Validate the document format and security features
        // 3. Cross-reference with government databases
        // 4. Return verification results

        // Simulate processing delay
        yield* _(Effect.sleep("1 second"));

        // Mock verification result based on ID number pattern
        const isValid = /^[A-Z0-9]{8,15}$/.test(idNumber);
        const confidence = isValid ? 0.95 : 0.3;

        return {
          verified: isValid && confidence > 0.8,
          confidence,
          extractedData: {
            idNumber: idNumber,
            idType: idType,
            documentUrl: documentUrl,
            extractedText: `Mock extracted text for ${idType}: ${idNumber}`,
            securityFeatures: {
              hologram: isValid,
              watermark: isValid,
              microtext: isValid,
            },
            issueDate: "2020-01-01",
            expiryDate: "2030-01-01",
          },
        };
      }),

    verifySelfie: (selfieUrl, idPhotoUrl) =>
      Effect.gen(function* (_) {
        // Mock face matching logic
        // In production, this would:
        // 1. Extract facial features from both images
        // 2. Compare facial landmarks and biometric data
        // 3. Calculate similarity score
        // 4. Return match results

        // Simulate processing delay
        yield* _(Effect.sleep("2 seconds"));

        // Mock verification based on URL patterns (for demo purposes)
        const selfieValid = selfieUrl.includes("selfie");
        const idPhotoValid = idPhotoUrl.includes("id");
        const matchScore = selfieValid && idPhotoValid ? 0.92 : 0.4;

        return {
          verified: matchScore > 0.8,
          confidence: matchScore,
          matchScore,
        };
      }),
  })
);
