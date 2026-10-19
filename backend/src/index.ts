import express from "express";
import mongoose from "mongoose";
import env from "dotenv";

import APIv1 from "./routes/api/v1/index";

env.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://172.21.1.5:27017/kost_db";
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

const app = express();

app.use("/api/v1", APIv1);

app.use((req, res, next) => {
  res.status(404).send(({ code: 404, message: "Not Found" }));
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});