import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  // Ensure build exists
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Serve static files (icons, manifest, sw.js, assets, uploads)
  app.use(express.static(distPath));

  app.get("/sw.js", (req, res) => {
    res.sendFile(path.join(distPath, "sw.js"));
  });

  // SPA fallback (React routing)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    res.sendFile(path.join(distPath, "index.html"));
  });
}