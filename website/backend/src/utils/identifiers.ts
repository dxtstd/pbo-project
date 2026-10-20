import Customer from "../models/customer";
import Owner from "../models/owner";

const nextIdentifier = async (prefix: string, values: string[]): Promise<string> => {
  const highest = values.reduce((max, value) => {
    const match = value.match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(2, "0")}`;
};

export const nextOwnerId = async (): Promise<string> => {
  const owners = await Owner.find({ ownerId: /^OWN-\d+$/i }).select("ownerId").lean();
  return nextIdentifier("OWN", owners.map((owner) => owner.ownerId));
};

export const nextCustomerId = async (): Promise<string> => {
  const customers = await Customer.find({ customerId: /^CUST-\d+$/i }).select("customerId").lean();
  return nextIdentifier("CUST", customers.map((customer) => customer.customerId));
};
