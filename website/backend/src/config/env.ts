import dotenv from "dotenv";

const environment = process.env.NODE_ENV || "development";
dotenv.config({ path: `.env.${environment}` });
dotenv.config();

export const config = {
  environment,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/kost_db",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret",
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  jwtPublicKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, "\n"),
  adminUsername: process.env.ADMIN_USERNAME || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  notificationHttpUrl: process.env.NOTIFICATION_HTTP_URL
    || (environment === "production" ? "http://notification:4000" : "http://localhost:4000"),
};
