import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { handleChat } from "./server/agent";

export default defineConfig(({ mode }) => {
  // ワークスペースルートの .env から ANTHROPIC_API_KEY を拾う
  const env = loadEnv(mode, path.resolve(__dirname, "../.."), "");
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "agent-api",
        configureServer(server) {
          server.middlewares.use("/api/chat", (req, res) => {
            void handleChat(req, res);
          });
        },
      },
    ],
    server: { port: 5212 },
  };
});
