import express from "express";
import {signup,login,refreshTokenHandler,logout} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup",signup);
router.post("/login",login);

//refresh token route
router.post("/refresh",refreshTokenHandler);
router.post("/logout",logout);

export default router;