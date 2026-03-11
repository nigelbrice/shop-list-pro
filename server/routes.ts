import type { Express } from "express";
import type { Server } from "http";
import { storage, migrateOrphanedData } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { addClient, removeClient, broadcast, getClientCount } from "./sse";
import { requireAuth, registerAuthRoutes } from "./auth";

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
  registerAuthRoutes(app);

  app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  });

  app.get("/api/events", requireAuth, (req, res) => {
    const accountId = req.session.accountId!;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`event: presence\ndata: ${JSON.stringify({ count: getClientCount(accountId) + 1 })}\n\n`);
    addClient(res, accountId);
    req.on("close", () => removeClient(res, accountId));
  });

  // ── Items ──────────────────────────────────────────────────────────────────
  app.get(api.items.list.path, requireAuth, async (req, res) => {
    try { res.json(await storage.getItems(req.session.accountId!)); }
    catch { res.status(500).json({ message: "Failed to fetch items" }); }
  });

  app.post(api.items.reorder.path, requireAuth, async (req, res) => {
    try {
      const { orderedIds } = api.items.reorder.input.parse(req.body);
      await storage.reorderListItems(orderedIds);
      broadcast({ type: "item:reordered", data: { orderedIds } }, req.session.accountId!);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to reorder items" });
    }
  });

  app.post(api.items.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      const item = await storage.createItem(input, req.session.accountId!);
      broadcast({ type: "item:created", data: item as Record<string, unknown> }, req.session.accountId!);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch(api.items.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const input = api.items.update.input.parse(req.body);
      const item = await storage.updateItem(id, input);
      if (!item) return res.status(404).json({ message: "Item not found" });
      broadcast({ type: "item:updated", data: item as Record<string, unknown> }, req.session.accountId!);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete(api.items.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const item = await storage.getItem(id);
      if (!item) return res.status(404).json({ message: "Item not found" });
      await storage.deleteItem(id);
      broadcast({ type: "item:deleted", data: { id } }, req.session.accountId!);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // ── Stores ─────────────────────────────────────────────────────────────────
  app.get(api.stores.list.path, requireAuth, async (req, res) => {
    try { res.json(await storage.getStores(req.session.accountId!)); }
    catch { res.status(500).json({ message: "Failed to fetch stores" }); }
  });

  app.post(api.stores.create.path, requireAuth, async (req, res) => {
    try {
      const { name } = api.stores.create.input.parse(req.body);
      const store = await storage.createStore(name, req.session.accountId!);
      broadcast({ type: "store:created", data: store as Record<string, unknown> }, req.session.accountId!);
      res.status(201).json(store);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to create store" });
    }
  });

  app.delete(api.stores.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteStore(id);
      broadcast({ type: "store:deleted", data: { id } }, req.session.accountId!);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Failed to delete store" });
    }
  });

  // ── Store List ─────────────────────────────────────────────────────────────
  app.get(api.stores.getList.path, requireAuth, async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);

    if (isNaN(storeId)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }

    const list = await storage.getStoreList(storeId);

    res.json(list);
  } catch (err) {
    console.error("STORE LIST ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch store list",
      error: String(err),
    });
  }
});

  app.post(api.stores.reorderList.path, requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      if (isNaN(storeId)) return res.status(400).json({ message: "Invalid store ID" });
      const { orderedIds } = api.stores.reorderList.input.parse(req.body);
      await storage.reorderStoreList(storeId, orderedIds);
      broadcast({ type: "store:list:reordered", data: { storeId, orderedIds } }, req.session.accountId!);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to reorder list" });
    }
  });

  app.post(api.stores.addToList.path, requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      if (isNaN(storeId)) return res.status(400).json({ message: "Invalid store ID" });
      const { itemId, quantity } = api.stores.addToList.input.parse(req.body);
      const listItem = await storage.addToStoreList(storeId, itemId, quantity ?? 1);
      const [withItem] = await storage.getStoreList(storeId).then(list => list.filter(l => l.id === listItem.id));
      broadcast({ type: "store:list:added", data: withItem as unknown as Record<string, unknown> }, req.session.accountId!);
      res.status(201).json(withItem);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to add to list" });
    }
  });

  app.patch(api.stores.updateListItem.path, requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      const listItemId = parseInt(req.params.listItemId, 10);
      if (isNaN(storeId) || isNaN(listItemId)) return res.status(400).json({ message: "Invalid ID" });
      const { quantity } = api.stores.updateListItem.input.parse(req.body);
      await storage.updateStoreListItem(listItemId, { quantity });
      const [withItem] = await storage.getStoreList(storeId).then(list => list.filter(l => l.id === listItemId));
      if (!withItem) return res.status(404).json({ message: "List item not found" });
      broadcast({ type: "store:list:updated", data: withItem as unknown as Record<string, unknown> }, req.session.accountId!);
      res.json(withItem);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Failed to update list item" });
    }
  });

  app.delete(api.stores.removeFromList.path, requireAuth, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId, 10);
      const listItemId = parseInt(req.params.listItemId, 10);
      if (isNaN(storeId) || isNaN(listItemId)) return res.status(400).json({ message: "Invalid ID" });
      await storage.removeFromStoreList(listItemId);
      broadcast({ type: "store:list:removed", data: { storeId, listItemId } }, req.session.accountId!);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Failed to remove from list" });
    }
  });

  await migrateOrphanedData();
  return httpServer;
}
