import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const TOKEN_EXPIRY = "7d";

export const authRouter = Router();

// Sign up
authRouter.post("/signup", async (req: Request, res: Response) => {
  const { email, password, orgName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const bcrypt = await import("bcryptjs");
  const hashed = await bcrypt.hash(password, 12);

  const slug = (orgName || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const org = await prisma.organization.create({
    data: { name: orgName || email.split("@")[0], slug },
  });
  const user = await prisma.user.create({
    data: { email, passwordHash: hashed, organizationId: org.id },
  });

  const token = jwt.sign({ userId: user.id, organizationId: org.id }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  res.status(201).json({ token, userId: user.id });
});

// Login
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id, organizationId: user.organizationId }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  res.json({ token, userId: user.id });
});

// JWT auth middleware — attach to routes that need protection
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return _res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as {
      userId: string;
      organizationId: string;
    };
    (req as any).userId = payload.userId;
    (req as any).organizationId = payload.organizationId;
    next();
  } catch {
    return _res.status(401).json({ error: "Invalid token" });
  }
}
