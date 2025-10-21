import { Polar } from "@polar-sh/sdk";

const accessToken = process.env.POLAR_ACCESS_TOKEN;
export const polarClient = new Polar({ accessToken, server: "sandbox" });
