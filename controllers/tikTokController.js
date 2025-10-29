import axios from "axios";
import crypto from "crypto";
import dayjs from "dayjs";
import prisma from "../prismaClient.js";
import dotenv from "dotenv";


dotenv.config();    


export const connectTikTok = async (req, res) => {
  const redirectUri = encodeURIComponent(process.env.TIKTOK_REDIRECT_URI);

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${process.env.TIKTOK_CLIENT_KEY}&response_type=code&scope=user.info.basic,video.list&redirect_uri=${redirectUri}`;

  return res.redirect(authUrl);
};


export const tiktokCallback = async (req, res) => {
  const { code } = req.query; 
  if (!code) return res.status(400).json({ message: "Missing TikTok authorization code" });

  try {
    // Exchange code for access + refresh token
    const tokenResponse = await axios.post("https://open.tiktokapis.com/v2/oauth/token/", {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
    });

    const { access_token, refresh_token, open_id } = tokenResponse.data.data;

    // Save or update in DB
    await prisma.connectedAccount.upsert({
      where: { providerId: open_id },
      update: { accessToken: access_token, refreshToken: refresh_token },
      create: {
        userId: req.user.id, // ✅ assuming user is already logged in
        provider: "tiktok",
        providerId: open_id,
        accessToken: access_token,
        refreshToken: refresh_token,
      },
    });

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=tiktok`);
  } catch (err) {
    console.error("TikTok OAuth Error:", err.response?.data || err);
    return res.status(500).json({ message: "Failed to connect TikTok" });
  }
};