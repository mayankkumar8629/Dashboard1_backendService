import express from "express";
import { instagramCallback,instagramConnectRedirect } from "../controllers/instagramController.js";

const router = express.Router();

router.get("/instagramConnect",  instagramConnectRedirect);
router.get("/callback",  instagramCallback);

export default router;