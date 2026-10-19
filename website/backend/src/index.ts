import { createApp } from "./app";
import { config } from "./config/env";
import { connectDatabase } from "./infrastructure/database";
import { seedDevelopmentUsers } from "./infrastructure/developmentSeed";
import { startInvoiceReminderJob } from "./jobs/invoiceReminders";
import { notificationBridge } from "./services/notification";

const startServer = async (): Promise<void> => {
  await connectDatabase();
  await seedDevelopmentUsers();
  notificationBridge.connect();
  startInvoiceReminderJob();

  const app = createApp();
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Server is running on port ${config.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start backend", error);
  process.exitCode = 1;
});