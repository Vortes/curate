import dotenv from "dotenv";
import type { ForgeConfig } from "@electron-forge/shared-types";

// Load .env first, then let .env.production override for production builds
dotenv.config({ path: ".env" });
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production", override: true });
}
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {
    name: "Curate",
    appBundleId: "is.curate.desktop",
    asar: true,
    extraResource: [
      "./native/build/Release/ax_url_reader.node",
      "./swift-helpers/window-info",
    ],
    protocols: [
      {
        name: "Curate",
        schemes: ["curate"],
      },
    ],
    osxSign: {},
    osxNotarize: {
      appleId: process.env.APPLE_ID!,
      appleIdPassword: process.env.APPLE_PASSWORD!,
      teamId: "LUBHD22X5N",
    },
  },
  makers: [new MakerZIP({}, ["darwin"]), new MakerDMG({
      format: "ULFO",
      contents: (opts) => [
        { x: 180, y: 170, type: "file", path: opts.appPath },
        { x: 480, y: 170, type: "link", path: "/Applications" },
      ],
      additionalDMGOptions: {
        window: {
          size: { width: 660, height: 400 },
        },
      },
    })],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
        {
          entry: "src/capture/overlay-preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
};

export default config;
