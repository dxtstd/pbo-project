import dotenv from "dotenv";

const environment = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${environment}` });
dotenv.config();

export const config = {
  environment,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/kost_db",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret",
  adminEmail: process.env.ADMIN_EMAIL || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
};
