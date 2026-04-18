import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Same resolution Vite uses for the Cloudflare plugin in dev / Vitest (`serve` + non-production).
 *
 * @param {{ command: string; mode: string; rootDir: string }} opts
 * @returns {string | undefined} Relative filename for `wrangler -c`, or undefined for default discovery.
 */
export function resolveWranglerConfigPath({ command, mode, rootDir }) {
  if (command !== "serve" || mode === "production") {
    return undefined;
  }
  const dev = path.join(rootDir, "wrangler.dev.jsonc");
  const main = path.join(rootDir, "wrangler.jsonc");
  if (existsSync(dev)) {
    return "wrangler.dev.jsonc";
  }
  if (existsSync(main)) {
    return "wrangler.jsonc";
  }
  return undefined;
}
