import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";


const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

