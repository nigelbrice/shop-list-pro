import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { addClient, removeClient, broadcast, getClientCount } from "./sse";

const uploadDir = path.join(process.cwd(), "client", "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: uploadStorage });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.write(`event: presence\ndata: ${JSON.stringify({ count: getClientCount() + 1 })}\n\n`);

    addClient(res);

    req.on("close", () => {
      removeClient(res);
    });
  });

  app.get(api.items.list.path, async (req, res) => {
    try {
      const itemsList = await storage.getItems();
      res.json(itemsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.post(api.items.reorder.path, async (req, res) => {
    try {
      const { orderedIds } = api.items.reorder.input.parse(req.body);
      await storage.reorderListItems(orderedIds);
      broadcast({ type: "item:reordered", data: { orderedIds } });
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to reorder items" });
    }
  });

  app.post(api.items.create.path, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      const item = await storage.createItem(input);
      broadcast({ type: "item:created", data: item as Record<string, unknown> });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch(api.items.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const input = api.items.update.input.parse(req.body);
      const item = await storage.updateItem(id, input);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      broadcast({ type: "item:updated", data: item as Record<string, unknown> });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete(api.items.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      await storage.deleteItem(id);
      broadcast({ type: "item:deleted", data: { id } });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  try {
    const existingItems = await storage.getItems();
    if (existingItems.length === 0) {
      await storage.createItem({ 
        name: "Milk", 
        category: "Dairy",
        notes: "Whole milk preferred", 
        inShoppingList: true 
      });
      await storage.createItem({ 
        name: "Eggs", 
        category: "Dairy",
        inShoppingList: true 
      });
      await storage.createItem({ 
        name: "Coffee Beans", 
        category: "Beverages",
        notes: "Dark roast", 
        inShoppingList: false 
      });
      console.log("Database seeded with sample items.");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
