import express from "express";
import { instagramCallback,instagramConnectRedirect } from "../controllers/instagramController";

const router = express.Router();

router.get("/instagramConnect",  instagramConnectRedirect);
router.get("/callback",  instagramCallback);