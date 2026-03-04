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
  destination: (req, file, cb) => { cb(null, uploadDir); },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: uploadStorage });

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  });

  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`event: presence\ndata: ${JSON.stringify({ count: getClientCount() + 1 })}\n\n`);
    addClient(res);
    req.on("close", () => removeClient(res));
  });

  // ── Items ──────────────────────────────────────────────────────────────────
  app.get(api.items.list.path, async (req, res) => {
    try { res.json(await storage.getItems()); }
    catch { res.status(500).json({ message: "Failed to fetch items" }); }
  });

  app.post(api.items.reorder.path, async (req, res) => {
    try {
      const { orderedIds } = api.items.reorder.input.parse(req.body);
      await storage.reorderListItems(orderedIds);
      broadcast({ type: "item:reordered", data: { orderedIds } });
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
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
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch(api.items.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const input = api.items.update.input.parse(req.body);
      const item = await storage.updateItem(id, input);
      if (!item) return res.status(404).json({ message: "Item not found" });
      broadcast({ type: "item:updated", data: item as Record<string, unknown> });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete(api.items.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const item = await storage.getItem(id);
      if (!item) return res.status(404).json({ message: "Item not found" });
      await storage.deleteItem(id);
      broadcast({ type: "item:deleted", data: { id } });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // ── Stores ─────────────────────────────────────────────────────────────────
  app.get(api.stores.list.path, async (req, res) => {
    try { res.json(await storage.getStores()); }
    catch { res.status(500).json({ message: "Failed to fetch stores" }); }
  });

  app.post(api.stores.create.path, async (req, res) => {
    try {
      const { name } = api.stores.create.input.parse(req.body);
      const store = await storage.createStore(name);
      broadcast({ type: "store:created", data: store as Record<string, unknown> });
      res.status(201).json(store);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to create store" });
    }
  });

  app.delete(api.stores.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteStore(id);
      broadcast({ type: "store:deleted", data: { id } });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Failed to delete store" });
    }
  });

  // ── Store List ─────────────────────────────────────────────────────────────
  app.get(api.stores.getList.path, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      if (isNaN(storeId)) return res.status(400).json({ message: "Invalid store ID" });
      res.json(await storage.getStoreList(storeId));
    } catch {
      res.status(500).json({ message: "Failed to fetch store list" });
    }
  });

  app.post(api.stores.reorderList.path, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      if (isNaN(storeId)) return res.status(400).json({ message: "Invalid store ID" });
      const { orderedIds } = api.stores.reorderList.input.parse(req.body);
      await storage.reorderStoreList(storeId, orderedIds);
      broadcast({ type: "store:list:reordered", data: { storeId, orderedIds } });
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to reorder list" });
    }
  });

  app.post(api.stores.addToList.path, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      if (isNaN(storeId)) return res.status(400).json({ message: "Invalid store ID" });
      const { itemId, quantity } = api.stores.addToList.input.parse(req.body);
      const listItem = await storage.addToStoreList(storeId, itemId, quantity ?? 1);
      const [withItem] = await storage.getStoreList(storeId).then(list => list.filter(l => l.id === listItem.id));
      broadcast({ type: "store:list:added", data: withItem as unknown as Record<string, unknown> });
      res.status(201).json(withItem);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to add to list" });
    }
  });

  app.patch(api.stores.updateListItem.path, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      const listItemId = parseInt(req.params.listItemId, 10);
      if (isNaN(storeId) || isNaN(listItemId)) return res.status(400).json({ message: "Invalid ID" });
      const { quantity } = api.stores.updateListItem.input.parse(req.body);
      await storage.updateStoreListItem(listItemId, { quantity });
      const [withItem] = await storage.getStoreList(storeId).then(list => list.filter(l => l.id === listItemId));
      if (!withItem) return res.status(404).json({ message: "List item not found" });
      broadcast({ type: "store:list:updated", data: withItem as unknown as Record<string, unknown> });
      res.json(withItem);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to update list item" });
    }
  });

  app.delete(api.stores.removeFromList.path, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      const listItemId = parseInt(req.params.listItemId, 10);
      if (isNaN(storeId) || isNaN(listItemId)) return res.status(400).json({ message: "Invalid ID" });
      await storage.removeFromStoreList(listItemId);
      broadcast({ type: "store:list:removed", data: { storeId, listItemId } });
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Failed to remove from list" });
    }
  });

  seedDatabase().catch(console.error);
  return httpServer;
}

async function seedDatabase() {
  try {
    const existingItems = await storage.getItems();
    if (existingItems.length === 0) {
      await storage.createItem({ name: "Milk", category: "Dairy & Eggs", notes: "Whole milk preferred" });
      await storage.createItem({ name: "Eggs", category: "Dairy & Eggs" });
      await storage.createItem({ name: "Coffee Beans", category: "Beverages", notes: "Dark roast" });
      console.log("Database seeded with sample items.");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
