import { Polar } from "@polar-sh/sdk";

const accessToken = process.env.POLAR_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error(
    "POLAR_ACCESS_TOKEN environment variable is required but not set"
  );
}

export const polarClient = new Polar({ accessToken, server: "sandbox" });
