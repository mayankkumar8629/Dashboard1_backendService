import axios from "axios";
import crypto from "crypto";
import dayjs from "dayjs";
import prisma from "../prismaClient.js";
import dotenv from "dotenv";

dotenv.config();

const FB_API = `https://graph.facebook.com/${process.env.FB_GRAPH_API_VERSION || "v16.0"}`;

function setStateCookie(res, state) {
  const maxAgeMs = 1000 * 60 * 5; // 5 minutes
  res.cookie("ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeMs,
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}


export const instagramConnectRedirect = (req, res) => {
  
  const state = crypto.randomBytes(16).toString("hex");
  setStateCookie(res, state);

  const clientId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI);
  
  const scope = encodeURIComponent("instagram_basic,pages_show_list,instagram_manage_insights");

  const url = `https://www.facebook.com/${process.env.FB_GRAPH_API_VERSION || "v16.0"}/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${state}&auth_type=rerequest`;

  return res.redirect(url);
};


export const instagramCallback = async (req, res) => {
  try {
    // Validate state
    const returnedState = req.query.state;
    const stateCookie = req.cookies?.ig_oauth_state;
    if (!returnedState || !stateCookie || returnedState !== stateCookie) {
      return res.status(400).json({ message: "Invalid OAuth state" });
    }
    // clearing state cookie
    res.clearCookie("ig_oauth_state", { path: "/", domain: process.env.COOKIE_DOMAIN || undefined });

    const code = req.query.code;
    if (!code) return res.status(400).json({ message: "No code provided by Instagram/Facebook" });

    const clientId = process.env.INSTAGRAM_APP_ID;
    const clientSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

    // Exchange code for short-lived user access token
    const tokenExchangeUrl = `${FB_API}/oauth/access_token`;
    const tokenResp = await axios.get(tokenExchangeUrl, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      },
    });

    const shortLivedToken = tokenResp.data.access_token;
    if (!shortLivedToken) {
      console.error("No short-lived token", tokenResp.data);
      return res.status(500).json({ message: "Failed to obtain access token" });
    }

    // Exchange short-lived token for long-lived token
    // Long lived token endpoint: grant_type=fb_exchange_token&fb_exchange_token=<short-lived-token>
    const longTokenResp = await axios.get(`${FB_API}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longTokenResp.data.access_token;
    const tokenExpiresIn = longTokenResp.data.expires_in; // seconds (if provided)
    if (!longLivedToken) {
      console.error("No long-lived token", longTokenResp.data);
      return res.status(500).json({ message: "Failed to obtain long-lived access token" });
    }

    // Compute expiry
    const expiresAt = tokenExpiresIn ? dayjs().add(tokenExpiresIn, "second").toDate() : null;

    // Get pages the user manages (to find Instagram Business Account linked to a Page)
    // Endpoint: /me/accounts?access_token=<longLivedToken>
    const pagesResp = await axios.get(`${FB_API}/me/accounts`, {
      params: { access_token: longLivedToken },
    });

    const pages = pagesResp.data?.data || [];
    // For each page, we can query page?fields=instagram_business_account
    let instagramBusinessAccountId = null;
    let pageIdUsed = null;
    let igUsername = null;

    for (const page of pages) {
      const pageId = page.id;
      try {
        const pageInfoResp = await axios.get(`${FB_API}/${pageId}`, {
          params: {
            fields: "instagram_business_account",
            access_token: longLivedToken,
          },
        });
        const igAccount = pageInfoResp.data?.instagram_business_account;
        if (igAccount && igAccount.id) {
          instagramBusinessAccountId = igAccount.id;
          pageIdUsed = pageId;
          break; // pick first connected IG business account
        }
      } catch (err) {
        // ignore page-level errors, continue to next
      }
    }

    if (!instagramBusinessAccountId) {
      // No IG business account found. Inform user they must link IG account to a Facebook Page and convert to Business/Creator.
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?social=instagram&status=no_ig_business_account`);
    }

    // Optionally fetch IG account username
    try {
      const igInfoResp = await axios.get(`${FB_API}/${instagramBusinessAccountId}`, {
        params: { fields: "username,ig_id", access_token: longLivedToken },
      });
      igUsername = igInfoResp.data?.username || null;
    } catch (err) {
      // ignore if cannot fetch username
    }

    // Upsert into ConnectedAccount
    const userId = req.user?.id;
    if (!userId) {
      // Shouldn't happen when route is protected, but guard anyway
      return res.status(401).json({ message: "Authentication required" });
    }

    // Use providerId = instagramBusinessAccountId (string)
    await prisma.connectedAccount.upsert({
      where: {
        provider_providerId: {
          provider: "instagram",
          providerId: instagramBusinessAccountId.toString(),
        },
      },
      update: {
        userId,
        accessToken: longLivedToken,
        refreshToken: null, // Facebook IG returns long-lived token; no refresh token—store null or token if your app gets one
        expiresAt: expiresAt || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId,
        provider: "instagram",
        providerId: instagramBusinessAccountId.toString(),
        accessToken: longLivedToken,
        refreshToken: null,
        expiresAt: expiresAt || undefined,
      },
    });

    // Redirect back to frontend
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?social=instagram&status=connected`);
  } catch (error) {
    console.error("Instagram connect error:", error.response?.data || error.message || error);
    // redirect with failure
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?social=instagram&status=error`);
  }
};