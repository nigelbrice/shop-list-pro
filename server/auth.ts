import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    accountId: number;
    activeUserId: number | null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.accountId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerAuthRoutes(app: import("express").Express) {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { accountName, password, userName } = req.body;
      if (!accountName?.trim() || !password || !userName?.trim()) {
        return res.status(400).json({ message: "Account name, password and your name are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const existing = await storage.findAccountByName(accountName.trim());
      if (existing) {
        return res.status(409).json({ message: "An account with that name already exists" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const account = await storage.createAccount(accountName.trim(), passwordHash);
      const user = await storage.createAccountUser(account.id, userName.trim());
      req.session.accountId = account.id;
      req.session.activeUserId = user.id;
      res.status(201).json({ account: { id: account.id, name: account.name }, users: [user], activeUserId: user.id });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { accountName, password } = req.body;
      if (!accountName?.trim() || !password) {
        return res.status(400).json({ message: "Account name and password are required" });
      }
      const account = await storage.findAccountByName(accountName.trim());
      if (!account) {
        return res.status(401).json({ message: "Invalid account name or password" });
      }
      const valid = await bcrypt.compare(password, account.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid account name or password" });
      }
      const users = await storage.getAccountUsers(account.id);
      const activeUserId = users[0]?.id ?? null;
      req.session.accountId = account.id;
      req.session.activeUserId = activeUserId;
      res.json({ account: { id: account.id, name: account.name }, users, activeUserId });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.accountId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const account = await storage.findAccountById(req.session.accountId);
      if (!account) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Account not found" });
      }
      const users = await storage.getAccountUsers(account.id);
      res.json({
        account: { id: account.id, name: account.name },
        users,
        activeUserId: req.session.activeUserId ?? null,
      });
    } catch (err) {
      console.error("Me error:", err);
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.get("/api/auth/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAccountUsers(req.session.accountId!);
      res.json(users);
    } catch {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/auth/users", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
      const accountId = req.session.accountId!;
      const count = await storage.getAccountUserCount(accountId);
      if (count >= 6) return res.status(400).json({ message: "Maximum 6 members per account" });
      const user = await storage.createAccountUser(accountId, name.trim());
      res.status(201).json(user);
    } catch {
      res.status(500).json({ message: "Failed to add member" });
    }
  });

  app.delete("/api/auth/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const accountId = req.session.accountId!;
      const count = await storage.getAccountUserCount(accountId);
      if (count <= 1) return res.status(400).json({ message: "Cannot remove the last member" });
      await storage.deleteAccountUser(id);
      if (req.session.activeUserId === id) {
        const users = await storage.getAccountUsers(accountId);
        req.session.activeUserId = users[0]?.id ?? null;
      }
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  app.post("/api/auth/switch-user", requireAuth, async (req, res) => {
    try {
      const { userId } = req.body;
      if (typeof userId !== "number") return res.status(400).json({ message: "userId is required" });
      const users = await storage.getAccountUsers(req.session.accountId!);
      const user = users.find(u => u.id === userId);
      if (!user) return res.status(404).json({ message: "Member not found" });
      req.session.activeUserId = userId;
      res.json(user);
    } catch {
      res.status(500).json({ message: "Failed to switch member" });
    }
  });
}
