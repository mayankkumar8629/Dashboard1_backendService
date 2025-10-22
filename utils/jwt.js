// utils/jwt.js
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";

export function signAccessToken(payload) {
  // payload: { userId, email, role, ... }
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}
