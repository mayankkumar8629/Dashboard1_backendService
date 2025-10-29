import express from "express";
import { youtubeLoginRedirect, youtubeLoginCallback } from "../controllers/youtubeController.js";

const router = express.Router();

router.get("/connect", youtubeLoginRedirect);
router.get("/callback", youtubeLoginCallback);

export default router;
