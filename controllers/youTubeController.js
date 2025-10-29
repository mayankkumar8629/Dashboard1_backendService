import axios from "axios";
import prisma from "../prismaClient.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();


export const youtubeLoginRedirect = (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${process.env.YOUTUBE_REDIRECT_URI}&response_type=code&scope=${encodeURIComponent(
    "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly"
  )}&access_type=offline&prompt=consent&state=${state}`;

  res.redirect(url);
};

export const youtubeLoginCallback = async (req, res) => {
  const code = req.query.code;
  if (!code)
    return res.status(400).json({ message: "No code provided by Google" });

  try {
    // EXCHANGE CODE FOR TOKENS
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, id_token } = tokenResponse.data;

    // DECODE USER INFO
    const base64Payload = id_token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(base64Payload, "base64").toString());
    const { email, sub: googleId, name } = decoded;

    // CHECK USER
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, username: name, passwordHash: null, accountType: "influencer" },
      });
    }

    // CHECK / STORE CONNECTED ACCOUNT
    const existing = await prisma.connectedAccount.findUnique({
      where: { provider_providerId: { provider: "youtube", providerId: googleId } },
    });

    if (!existing) {
      await prisma.connectedAccount.create({
        data: {
          userId: user.id,
          provider: "youtube",
          providerId: googleId,
          accessToken: access_token,
          refreshToken: refresh_token || null,
        },
      });
    }

    return res.json({ success: true, message: "YouTube connected successfully!" });

  } catch (err) {
    console.error("YouTube OAuth error", err);
    return res.status(500).json({ message: "YouTube login failed" });
  }
};
