import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { db } from "../config/firebase";

export interface AuthUser { id: string; telegramId: string; role: "CLIENT" | "DRIVER"; }

declare global { namespace Express { interface Request { user?: AuthUser; } } }

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "Нет токена" });
    const decoded = jwt.verify(h.split(" ")[1], config.jwtSecret) as any;
    const snap = await db.collection("users").doc(decoded.userId).get();
    if (!snap.exists) return res.status(401).json({ error: "Пользователь не найден" });
    const u = snap.data()!;
    if (u.status === "BLOCKED") return res.status(403).json({ error: "Аккаунт заблокирован" });
    req.user = { id: decoded.userId, telegramId: decoded.telegramId, role: u.role };
    next();
  } catch {
    return res.status(401).json({ error: "Неверный токен" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Нет прав" });
    next();
  };
}
