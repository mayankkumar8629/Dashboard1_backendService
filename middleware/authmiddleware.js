
import { verifyAccessToken } from "../utils/jwt.js"

export function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "Missing auth header" });

    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ message: "Invalid auth header" });

    const token = parts[1];
    const payload = verifyAccessToken(token);
    
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
