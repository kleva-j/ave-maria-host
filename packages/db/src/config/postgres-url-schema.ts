import { Schema, ParseResult, pipe } from "effect";

// Define database config schema
export const DatabaseConfigSchema = Schema.Struct({
  host: Schema.String.annotations({ default: "localhost" }),
  port: Schema.String.annotations({ default: "5432" }),
  database: Schema.String.annotations({ default: "postgres" }),
  username: Schema.String,
  password: Schema.String,
});

// Extract the type from the schema
export type DatabaseConfig = typeof DatabaseConfigSchema.Type;

const PostgresUrlString = Schema.Trimmed.pipe(
  Schema.nonEmptyString({ message: () => "Value must not be empty" })
)
  .pipe(
    Schema.pattern(/^postgres(ql)?:\/\//i, {
      message: () => "URL must start with 'postgres://' or 'postgresql://'",
    })
  )
  .annotations({
    title: "PostgreSQL URL",
    description:
      "A valid PostgreSQL connection URL (postgres:// or postgresql://)",
  });

// Create a schema that transforms a string (the URL) into the DatabaseConfig
export const PostgresUrlSchema = pipe(
  PostgresUrlString,
  Schema.transformOrFail(
    DatabaseConfigSchema, // Target is the DatabaseConfig object
    {
      decode: (input, _options, ast) => {
        try {
          const url = new URL(input);

          if (!["postgres:", "postgresql:"].includes(url.protocol)) {
            return ParseResult.fail(
              new ParseResult.Type(
                ast,
                input,
                "Expected protocol 'postgres:' or 'postgresql:'"
              )
            );
          }

          return ParseResult.succeed({
            host: url.hostname ?? "localhost",
            port: url.port ?? "5432",
            database: url.pathname.slice(1).split("/")[0] ?? "",
            username: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
          });
        } catch (error) {
          // Catch errors from the URL constructor (e.g., "Invalid URL")
          return ParseResult.fail(
            new ParseResult.Type(ast, input, "Invalid URL format")
          );
        }
      },
      encode: ({ username, password, host, port, database }) => {
        const auth = username
          ? `${username}${password ? `:${encodeURIComponent(password)}` : ""}@`
          : "";
        const url = `postgresql://${auth}${host}${port ? `:${port}` : ""}${database ? `/${database}` : ""}`;
        return ParseResult.succeed(url);
      },
    }
  )
);

export const decodePostgresUrl = Schema.decodeUnknownSync(PostgresUrlSchema);
