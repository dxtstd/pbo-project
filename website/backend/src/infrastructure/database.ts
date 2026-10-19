import mongoose from "mongoose";
import { config } from "../config/env";

export const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(config.mongoUri);
  console.log("MongoDB connected successfully");
};
