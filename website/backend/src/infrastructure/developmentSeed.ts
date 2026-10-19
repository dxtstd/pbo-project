import bcrypt from "bcrypt";
import Customer from "../models/customer";
import Owner from "../models/owner";

export const seedDevelopmentUsers = async (): Promise<void> => {
  if (process.env.NODE_ENV === "production") return;
  const ownerPassword = process.env.DEV_OWNER_PASSWORD;
  const customerPassword = process.env.DEV_CUSTOMER_PASSWORD;
  if (!ownerPassword || !customerPassword) return;

  await Owner.updateOne(
    { ownerId: "dev-owner" },
    {
      $setOnInsert: {
        ownerId: "dev-owner",
        username: process.env.DEV_OWNER_USERNAME || "owner",
        firstname: "Development",
        lastname: "Owner",
        email: process.env.DEV_OWNER_EMAIL || "owner@localhost",
        phoneNumber: "081234567890",
        password: await bcrypt.hash(ownerPassword, 12),
      },
    },
    { upsert: true },
  );
  await Customer.updateOne(
    { customerId: "dev-customer" },
    {
      $setOnInsert: {
        customerId: "dev-customer",
        username: process.env.DEV_CUSTOMER_USERNAME || "customer",
        firstname: "Development",
        lastname: "Customer",
        phoneNumber: "081234567891",
        password: await bcrypt.hash(customerPassword, 12),
      },
    },
    { upsert: true },
  );
};
