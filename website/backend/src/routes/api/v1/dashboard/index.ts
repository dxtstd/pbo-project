import { Router } from "express";
import { requireAuth } from "../../../../middlewares/auth";
import customerDashboard from "./customer";
import ownerDashboard from "./owner";

const dashboard = Router();

dashboard.use(requireAuth);
dashboard.use("/customer", customerDashboard);
dashboard.use("/owner", ownerDashboard);

export default dashboard;
