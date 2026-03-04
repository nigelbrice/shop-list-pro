import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.items.list.path, async (req, res) => {
    try {
      const itemsList = await storage.getItems();
      res.json(itemsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.post(api.items.create.path, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      const item = await storage.createItem(input);
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
        notes: "Whole milk preferred", 
        inShoppingList: true 
      });
      await storage.createItem({ 
        name: "Eggs", 
        inShoppingList: true 
      });
      await storage.createItem({ 
        name: "Coffee Beans", 
        notes: "Dark roast", 
        inShoppingList: false 
      });
      console.log("Database seeded with sample items.");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}