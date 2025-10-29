import express from "express";
import {signup,login,refreshTokenHandler,logout,googleLoginCallback,googleLoginRedirect} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup",signup);
router.post("/login",login);

//refresh token route
router.post("/refresh",refreshTokenHandler);
router.post("/logout",logout);

//google auth
router.get("/google",googleLoginRedirect);
router.get("/google/callback",googleLoginCallback);

export default router;