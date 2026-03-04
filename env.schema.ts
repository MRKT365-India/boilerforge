/**
 * Minimal environment schema baseline used by boilerforge doctor checks.
 * Consumers can replace this with zod/envalid as needed.
 */

export interface EnvSchema {
  NODE_ENV?: "development" | "test" | "production";
  NPM_TOKEN?: string;
}

export function readEnv(): EnvSchema {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv && !["development", "test", "production"].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
  }
  return {
    NODE_ENV: nodeEnv as EnvSchema["NODE_ENV"],
    NPM_TOKEN: process.env.NPM_TOKEN,
  };
}
