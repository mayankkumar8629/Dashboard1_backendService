import express from "express";
import { connectTikTok,tiktokCallback, } from "../controllers/tikTokController.js";

const router=express.Router();

router.get("/connect",  connectTikTok); 
router.get("/callback", tiktokCallback);


export default router;