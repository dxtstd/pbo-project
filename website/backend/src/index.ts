import { createApp } from "./app";
import { config } from "./config/env";
import { connectDatabase } from "./infrastructure/database";
import { seedDevelopmentContent } from "./infrastructure/developmentSeed";
import { startInvoiceReminderJob } from "./jobs/invoiceReminders";
import { notificationBridge } from "./services/notification";
import logger from "./utils/logger";

const startServer = async (): Promise<void> => {
  await connectDatabase();
  await seedDevelopmentContent();
  notificationBridge.connect();
  startInvoiceReminderJob();

  const app = createApp();
  app.listen(config.port, "0.0.0.0", () => {
    logger.info({ port: config.port }, "Backend server started");
  });
};

startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start backend");
  process.exitCode = 1;
});