import express from "express";
import { youtubeLoginRedirect, youtubeLoginCallback } from "../controllers/youtubeController.js";

const router = express.Router();

router.get("/auth/youtube", youtubeLoginRedirect);
router.get("/auth/youtube/callback", youtubeLoginCallback);

export default router;
