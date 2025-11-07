import { Schema } from "@effect/schema";

/**
 * User schema for Effect programs
 */
const name = Schema.String.pipe(Schema.minLength(1));
const password = Schema.String.pipe(Schema.minLength(8));
const email = Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));
const ipAddress = Schema.NullOr(Schema.String);
const userAgent = Schema.NullOr(Schema.String);

export const UserSchema = Schema.Struct({
  id: Schema.String,
  name,
  email,
  emailVerified: Schema.Boolean,
  image: Schema.NullOr(Schema.String),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export type User = typeof UserSchema.Type;

/**
 * Session schema for Effect programs
 */
export const SessionSchema = Schema.Struct({
  id: Schema.String,
  token: Schema.String,
  userId: Schema.String,
  expiresAt: Schema.Date,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  ipAddress,
  userAgent,
});

export type Session = typeof SessionSchema.Type;

/**
 * Authentication context containing user and session information
 */
export const AuthContextSchema = Schema.Struct({
  user: UserSchema,
  session: SessionSchema,
});

export type AuthContext = typeof AuthContextSchema.Type;

/**
 * Login credentials schema
 */

export const LoginCredentialsSchema = Schema.Struct({
  email,
  password,
});

export type LoginCredentials = typeof LoginCredentialsSchema.Type;

/**
 * Registration data schema
 */
export const RegisterDataSchema = Schema.Struct({
  name,
  email,
  password,
});

export type RegisterData = typeof RegisterDataSchema.Type;

/**
 * Session creation options
 */
export const SessionOptionsSchema = Schema.Struct({
  ipAddress: Schema.optional(ipAddress),
  userAgent: Schema.optional(userAgent),
  expiresIn: Schema.optional(Schema.Number), // Duration in seconds
});

export type SessionOptions = typeof SessionOptionsSchema.Type;
