import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.join(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Missing build folder: ${distPath}`);
  }

  // Serve ALL static assets
  app.use(express.static(distPath));

  // SPA fallback (must be last)
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).end();
    }

    res.sendFile(path.join(distPath, "index.html"));
  });
}