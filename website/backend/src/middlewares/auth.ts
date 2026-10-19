import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";

/** Roles recognized by the API authorization layer. */
export type AuthRole = "admin" | "owner" | "customer";

/** Claims identifying the authenticated API principal. */
export interface AuthUser {
  id: string;
  role: AuthRole;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verifies a Bearer JWT using RS256 when RSA keys are configured, otherwise HS256.
 *
 * @param req Express request containing an Authorization Bearer token.
 * @param res Express response used for authentication errors.
 * @param next Middleware callback invoked after successful verification.
 * @returns void
 * @throws Responds with 401 when the token is missing, invalid, or expired.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;
  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    req.user = jwt.verify(
      token,
      config.jwtPublicKey || config.jwtSecret,
      config.jwtPublicKey ? { algorithms: ["RS256"] } : { algorithms: ["HS256"] },
    ) as AuthUser;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Creates a middleware that permits only the supplied authenticated roles.
 *
 * @param roles Allowed application roles.
 * @returns Express role-guard middleware.
 */
export const requireRole = (...roles: AuthRole[]) => (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ message: "Insufficient permissions" });
    return;
  }
  next();
};

export const isAdmin = requireRole("admin");
export const isOwner = requireRole("owner");

/**
 * Signs an eight-hour JWT for an authenticated application user.
 *
 * @param user User identity and role encoded in the token.
 * @returns Signed JWT string.
 */
export const createToken = (user: AuthUser): string => jwt.sign(
  user,
  config.jwtPrivateKey || config.jwtSecret,
  config.jwtPrivateKey
    ? { algorithm: "RS256", expiresIn: "8h" }
    : { algorithm: "HS256", expiresIn: "8h" },
);
