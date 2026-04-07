import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { getSharedWranglerStatePath } from "../../scripts/shared-worktree-paths.mjs";

const sharedStatePath = getSharedWranglerStatePath(
	new URL(".", import.meta.url),
);

const config = defineConfig({
	plugins: [
		devtools(),
		cloudflare({
			viteEnvironment: { name: "ssr" },
			persistState: { path: sharedStatePath },
		}),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
