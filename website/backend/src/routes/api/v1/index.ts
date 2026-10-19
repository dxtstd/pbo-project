import { Router } from "express";
import dashboard from "./dashboard";
import payment from "./payment";

const APIv1 = Router();
APIv1.use("/dashboard", dashboard);
APIv1.use("/payment", payment);

export default APIv1;