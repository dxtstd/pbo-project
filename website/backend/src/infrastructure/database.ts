import mongoose from "mongoose";
import { config } from "../config/env";
import logger from "../utils/logger";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(config.mongoUri);
  logger.info({ database: config.mongoUri.replace(/\/\/.*@/, "//***@") }, "MongoDB connected successfully");
};
