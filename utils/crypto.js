import crypto from 'crypto';

export function generateRefreshTokenValue(){
    return crypto.randomBytes(64).toString('hex');
}
export function hashToken(token){
    // 256 is fast & deterministic; store the hash in DB
  return crypto.createHash("sha256").update(token).digest("hex");
}