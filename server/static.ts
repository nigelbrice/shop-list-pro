import { type Express } from "express";
import fs from "fs";
import path from "path";
import express from "express";

export function serveStatic(app: Express) {
  const distPath = path.join(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find build directory: ${distPath}. Run the client build first.`
    );
  }

  // Serve static files
  app.use(express.static(distPath));

  // SPA fallback (Express 5 safe)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    res.sendFile(path.join(distPath, "index.html"));
  });
}