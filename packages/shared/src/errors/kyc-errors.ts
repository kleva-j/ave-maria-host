import { Data } from "effect";

/**
 * KYC Error Type Constants
 */
export const KycErrorType = {
  OPERATION_ERROR: "OPERATION_ERROR",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  DOCUMENT_NOT_SUPPORTED: "DOCUMENT_NOT_SUPPORTED",
  INVALID_DOCUMENT_TYPE: "INVALID_DOCUMENT_TYPE",
  DATE_OF_BIRTH_MISMATCH: "DATE_OF_BIRTH_MISMATCH",
  INVALID_DATE_OF_BIRTH: "INVALID_DATE_OF_BIRTH",
  INVALID_DATE_FORMAT: "INVALID_DATE_FORMAT",
  DOCUMENT_TOO_SMALL: "DOCUMENT_TOO_SMALL",
  FACE_NOT_DETECTED: "FACE_NOT_DETECTED",
  DOCUMENT_EXPIRED: "DOCUMENT_EXPIRED",
  INVALID_ID_NUMBER: "INVALID_ID_NUMBER",
  ADDRESS_MISMATCH: "ADDRESS_MISMATCH",
  DOCUMENT_BLURRY: "DOCUMENT_BLURRY",
  INVALID_ADDRESS: "INVALID_ADDRESS",
  NAME_MISMATCH: "NAME_MISMATCH",
  INVALID_NAME: "INVALID_NAME",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type KycErrorType = typeof KycErrorType[keyof typeof KycErrorType];

/**
 * Base KYC Validation Error
 * Used for validation failures with specific error types
 */
export class KycValidationError extends Data.TaggedError(
  "KycValidationError"
)<{
  readonly type: KycErrorType;
  readonly message: string;
  readonly field?: string;
  readonly context?: {
    readonly fieldName?: string | undefined;
    readonly documentType?: string | undefined;
    readonly documentId?: string | undefined;
    readonly id?: string | undefined;
    readonly idType?: string | undefined;
    readonly address?: string | undefined;
  };
}> {}

/**
 * General KYC Operation Error
 * Used for system-level or operational failures
 */
export class KycOperationError extends Data.TaggedError("KycOperationError")<{
  readonly message: string;
  readonly code?: string;
  readonly cause?: unknown;
}> {}

/**
 * Union type for all KYC-related errors
 */
export type KycError = KycValidationError | KycOperationError;

/**
 * Helper functions to create specific KYC validation errors
 */
export const createKycValidationError = {
  missingRequiredField: (fieldName: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.MISSING_REQUIRED_FIELD,
      message: `Missing required field: ${fieldName}`,
      field: fieldName,
      context: { fieldName },
    }),

  documentNotSupported: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.DOCUMENT_NOT_SUPPORTED,
      message,
    }),

  invalidDocumentType: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.INVALID_DOCUMENT_TYPE,
      message,
    }),

  dateOfBirthMismatch: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.DATE_OF_BIRTH_MISMATCH,
      message,
    }),

  invalidDateOfBirth: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.INVALID_DATE_OF_BIRTH,
      message,
    }),

  invalidDateFormat: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.INVALID_DATE_FORMAT,
      message,
    }),

  documentTooSmall: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.DOCUMENT_TOO_SMALL,
      message,
    }),

  faceNotDetected: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.FACE_NOT_DETECTED,
      message,
    }),

  documentExpired: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.DOCUMENT_EXPIRED,
      message,
    }),

  invalidIdNumber: (
    message: string,
    id?: string,
    idType?: string
  ): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.INVALID_ID_NUMBER,
      message,
      context: { id, idType },
    }),

  addressMismatch: (
    message: string,
    documentType?: string,
    documentId?: string
  ): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.ADDRESS_MISMATCH,
      message,
      context: { documentType, documentId },
    }),

  documentBlurry: (
    message: string,
    documentType: string,
    documentId: string
  ): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.DOCUMENT_BLURRY,
      message,
      context: { documentType, documentId },
    }),

  invalidAddress: (message: string, address?: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.INVALID_ADDRESS,
      message,
      context: { address },
    }),

  nameMismatch: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.NAME_MISMATCH,
      message,
    }),

  invalidName: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.INVALID_NAME,
      message,
    }),

  unknown: (message: string): KycValidationError =>
    new KycValidationError({
      type: KycErrorType.UNKNOWN_ERROR,
      message,
    }),
};
