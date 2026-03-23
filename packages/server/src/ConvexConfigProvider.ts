import { ConfigProvider } from "effect";

declare const process: { env: Record<string, string | undefined> };

/** Convex action environment: read flat `process.env` keys (joined with `_` in Effect config paths). */
export const make = () => {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) {
      env[k] = v;
    }
  }
  return ConfigProvider.fromEnv({ env });
};
