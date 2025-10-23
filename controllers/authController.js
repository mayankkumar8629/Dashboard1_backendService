import bcrypt from "bcrypt"
import { generateRefreshTokenValue ,hashToken} from "../utils/crypto.js"
import { signAccessToken } from "../utils/jwt.js"
import prisma from "../prismaClient.js"
import dayjs from "dayjs"
import dotenv from "dotenv";
dotenv.config();


const REFRESH_COOKIE_NAME="refreshToken";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax", // tighten to 'strict' if you want
  secure: process.env.NODE_ENV === "production",
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: "/",
  // maxAge is set when sending cookie (ms)
};

const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "30", 10);

function sendRefreshCookie(res, tokenValue, expiresAt) {
  const maxAgeMs = expiresAt.diff(dayjs(), "millisecond");
  res.cookie(REFRESH_COOKIE_NAME, tokenValue, {
    ...COOKIE_OPTIONS,
    maxAge: maxAgeMs,
  });
}  


//google auth
//redirecting the user to google oauth consent page
export const googleLoginRedirect = (req,res)=>{
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const scope = encodeURIComponent("openid email profile");

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  res.redirect(url);
}

//handle google callback
export const googleLoginCallback = async(req,res)=>{
  const code = req.query.code;
  if(!code){
    return res.status(400).json({message:"No code provided by Google"});
  }

  try{
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id:process.env.GOOGLE_CLIENT_ID,
        client_secret:process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:process.env.GOOGLE_REDIRECT_URI,
        grant_type:"authorization_code",
      }),
      {headers:{"Content-Type":"application/x-www-form-urlencoded"}}
    );
    const {id_token,access_token,refresh_token:googleRefreshToken} = tokenResponse.data;
    //decoding the id to get the user data

    const base64Payload = id_token.split(".")[1];
    const decodedPayload = JSON.parse(Buffer.from(base64Payload,"base64").toString());
    const {email,sub:googleId,name}=decodedPayload;

    //working in the user database
    //checking for the existence of the user
    let user = await prisma.user.findUnique({where:{email}});
    if(!user){
      user = await prisma.user.create({
        data:{
          email,
          username:name,
          passwordHash:null,
          accountType:"influencer",
        },
      });
    }

    //checking if connectedAccount exists or not
    const existingConnection = await prisma.connectedAccount.findUnique({
      where:{provider_providerId:{provider:"google",providerId:googleId}}
    });
    if(!existingConnection){
      await prisma.connectedAccount.create({
        data:{
          userId:user.id,
          provider:"google",
          providerId:googleId,
          accessToken: access_token,
          refreshToken: googleRefreshToken || null,

        },
      });
    }
    const accessToken = signAccessToken({ userId: user.id, email: user.email, accountType: user.accountType });
    const refreshValue = generateRefreshTokenValue();
    const refreshHash = hashToken(refreshValue);
    const expiresAt = dayjs().add(REFRESH_TOKEN_EXPIRES_DAYS, "day").toDate();

    await prisma.refreshToken.create({
      data:{
        tokenHash:refreshHash,
        userId:user.id,
        expiresAt,
      }
    });
    //setting the refresh token cookie
    sendRefreshCookie(res,refreshValue,expiresAt);
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?accessToken=${accessToken}`);

  }catch(error){
    console.error("Google login error",error);
    return res.status(500).json({message:"Google login failed"});
  }
}




//signup
export const signup = async(req,res)=>{
    try{
        
    const {email,password,username,accountType}=req.body;
    if(!email || !password){
        return res.status(400).json({message:"Email and password required"});
    }
    console.log(req.body);
    const existingUser = await prisma.user.findUnique({where:{email}});
    if(existingUser){
        return res.status(400).json({message:"Email already in use"});
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password,saltRounds);

    //creating a new user
    const user = await prisma.user.create({
        data: { email,passwordHash,username,accountType},
        select: {id:true,email:true,username:true,accountType:true},
    })
    console.log(user);

    //creating tokens
    const accessToken = signAccessToken({ userId: user.id, email: user.email, accountType: user.accountType });

    const refreshValue = generateRefreshTokenValue();
    const refreshHash = hashToken(refreshValue);
    const expiresAt = dayjs().add(REFRESH_TOKEN_EXPIRES_DAYS, "day").toDate();

    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshHash,
        userId: user.id,
        expiresAt,
      },
    });

    // set cookie
    sendRefreshCookie(res, refreshValue, dayjs(expiresAt));
    res.json({accessToken,user})

    }catch(error){
        console.error("Signup error",error);
        res.status(500).json({message:"Internal server error"});
    }



}
//login
export const login = async(req,res)=>{
    try{
        const {email,password}=req.body;
        if(!email || !password){
            return res.status(400).json({message:"Email and password required"});
        }
        const user = await prisma.user.findUnique({where:{email}});
        if(!user){
            return res.status(400).json({message:"Invalid credentials"});
        }
        if(!user.passwordHash){
            return res.status(400).json({message:"Use social login"});
        }
        const valid = await bcrypt.compare(password,user.passwordHash);
        if(!valid){
            return res.status(400).json({message:"Invalid credentials"});
        }
        const accessToken = signAccessToken({ userId: user.id, email: user.email, accountType: user.accountType });

        const refreshValue = generateRefreshTokenValue();
        const refreshHash = hashToken(refreshValue);
        const expiresAt = dayjs().add(REFRESH_TOKEN_EXPIRES_DAYS, "day").toDate();

        await prisma.refreshToken.create({
            data:{
                tokenHash:refreshHash,
                userId:user.id,
                expiresAt,
            },
        })

        sendRefreshCookie(res,refreshValue,dayjs(expiresAt));

        res.json({
            accessToken,
            user:{id:user.id,email:user.email,username:user.username,accountType:user.accountType},

        });

        

        



    }catch(error){
        console.error("login error",error);
        res.status(500).json({message:"Internal server error"});
    }
}

export const refreshTokenHandler=async(req,res)=>{
  try {
    const tokenValue = req.cookies?.refreshToken;
    if (!tokenValue) return res.status(401).json({ message: "No refresh token" });

    const tokenHash = hashToken(tokenValue);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revoked) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (dayjs().isAfter(dayjs(tokenRecord.expiresAt))) {
      return res.status(401).json({ message: "Refresh token expired" });
    }

    const user = tokenRecord.user;
    if (!user) return res.status(401).json({ message: "Invalid token user" });

    // ROTATION: create new refresh token and revoke old one
    const newRefreshValue = generateRefreshTokenValue();
    const newRefreshHash = hashToken(newRefreshValue);
    const newExpiresAt = dayjs().add(REFRESH_TOKEN_EXPIRES_DAYS, "day").toDate();

    // create new token record and update old one
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          tokenHash: newRefreshHash,
          userId: user.id,
          expiresAt: newExpiresAt,
        },
      }),
      prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revoked: true,
          replacedByHash: newRefreshHash,
        },
      }),
    ]);

    // new access token
    const accessToken = signAccessToken({ userId: user.id, email: user.email, accountType: user.accountType });

    // set cookie with rotated refresh token
    sendRefreshCookie(res, newRefreshValue, dayjs(newExpiresAt));

    res.json({ accessToken });
  } catch (err) {
    console.error("refresh error", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

//logout
export const logout = async(req,res)=>{
  try {
    const tokenValue = req.cookies?.refreshToken;
    if (tokenValue) {
      const tokenHash = hashToken(tokenValue);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    }

    // clear cookie
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/", domain: process.env.COOKIE_DOMAIN || undefined });
    res.json({ success: true });
  } catch (err) {
    console.error("logout error", err);
    res.status(500).json({ message: "Internal server error" });
  }
}