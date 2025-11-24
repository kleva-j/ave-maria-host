export const generateTimestamp = (): string =>
  new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .split(".")[0] as string;
