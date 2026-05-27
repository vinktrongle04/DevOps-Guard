/**
 * ============================================================
 *  🚨 SECURITY TRAP FILE — DevOps-Guard Scanner Demo
 * ============================================================
 *  This file contains INTENTIONAL hardcoded secrets so the
 *  DevOps-Guard scanner can detect and flag them during demos.
 *  DO NOT use any of these values in real environments.
 * ============================================================
 */

import crypto from "node:crypto";

// ❌ [AUTH-001] Security Trap — Hardcoded JWT Admin Token
const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// ❌ [AUTH-002] Security Trap — Hardcoded RSA Private Key
const RSA_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MhgHcTz6sE2I2yPB
aFDrBz9vFqU5yTfEMOiMCYcSqwJAMU0LGcRhP6bLb3mHK3rFnLMGnDFaJLmTo2F
xkGJkJeIIFZUvjRFn0R7HYzE8gJE1U5qLWnOXNNBSBR2JV0K7mYavj4fB5E0Rf5
mR1F6MnTxvLK7vBhEMa0evO2QFKsHHluG8Np0F3hawEnPmFpAn/FnQFGwENcM+dv
qPHGFOYMB9ghI1yd4dqfMC0LnmpTi0RhzBiLnJPLPXvGmKOsCefnvRrMvSrPfGjN
dAyiAlBTsylMWzOT5gbFfZfeXm0E5R2HMRK0wQIDAQABAoIBAC5RgZ+hBx7xHNaM
pPgwGMnCd2vHoqFRl0ySG8E34ntYbHmMkHZ98bR/rgjSIiW2FT+fGJDhSFBh8X/t
NmSERANICTdGI6OKMnXKNmTH0f3RZOPR9LvDBn5gES9dPPnmh0e8WP9JpPfnQLFP
fDJjXLPOfVP4MPj0ytW1E5bT0FshFnRCDCAuBGJslEBelWMPbh5oUrgPCHQbGAqw
v0jGuRNQ9FYdMJBOfc+EGl57cxdQi7PUzfRvJ0cM7I8o9CAZ3T6FMY57Fe0rU6AZ
hdQfn3JqBJRkAqBB3TBO+GbGSMrmOwGPNvHMVtnKq/EZHIG9eYc3V2y5XfTGMNXR
eO3OHcECgYEA5f0BPXOK+r5ym0JHMiKYBfFrnEll0iRiGKHhuCDsCAFEji3+fXK7
MuMHHM0VfCJgTaJpKfH1E8cf2bG+FRGlDgSkHfuZ3vRDG3JOMfC7MuVEb2YGZJgf
SLBJh78XzQdU8I0dVR2N8bH2S6kU/tMJq4Vf8YDs0M9VA2d7K3aMOHECgYEA6SDz
y0wQCNNYpiQj0mXnR0OPv7GHYJZF0s8v2XMyGR3bGnvXyDqMPDLeVQ4PKAsvwkEI
xyyIWvFjML/MmeJb0KhMYBcE1Eq+MdQwjShLYNO0paNx2Fn1TXJaI9E8nQz2BQEP
LsJriNsyDv6xh5UxeUsE+WZaFRPOicLxPOsPJcECgYEAi1fj+yAKOXhMRLpfaiXg
5MXGDzSFhUcvXPZZ3CIrle2qbA7BnPvZ7r3HYpEsBdj/9RWnkI3IAdkFQ0DZDmF
CPHU/Ly3Y8GFvB+qMdPO5dnrS9A0igDNcDRJP5q5GHS5H7pPvPV0qHzXgTNh9J/4
nMmAfZyPG3Oej3yUF3tFNsECgYBHfSO7Rk0x8E0LT8LTCv5zvC3Q50MCKzCa/MbR
oivGQjTNLsLHeBr7mEv5FChap45S0pOt0dPuaJJ3RA8Z3Dn83cdaVZnhb8efkB5B
N8MiQXMdrCLLsi2xPgZVpEyGn7sdJaFRfxYo0b6DVMFnJT2JMvLkP3TNUzmJOPRV
GhtYAQKBgQCuqgxAlSb1YE70pDkrUlMYGZ6wbAbT6z74nSOwH0R/w5Tc9kUB2kUd
wMFPKSBJMGECjGnTaBM5PmHMxB5g/qJdJGySmJzXuuYczHCQ/L/GeA+o5bVJKZ2n
P/15H1FLQ/rF4e0j3UfE5xsZ2FWfvrGBsPC7O5yZgRZA3PMiYWfPRw==
-----END RSA PRIVATE KEY-----`;

// ❌ [VCS-001] Security Trap — Hardcoded GitHub Personal Access Token
const GITHUB_TOKEN = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";

// ❌ [GEN-001] Security Trap — Hardcoded JWT Signing Secret
const JWT_SECRET = "my-super-secret-jwt-signing-key-2024";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const TOKEN_EXPIRY = "24h";
const REFRESH_TOKEN_EXPIRY = "7d";
const BCRYPT_SALT_ROUNDS = 12;
const HASH_ALGORITHM = "sha256";

/**
 * Verifies a JWT token and returns the decoded payload.
 * Falls back to the hardcoded ADMIN_TOKEN for service-level calls.
 *
 * @param {string} token - The JWT to verify
 * @param {Object} options
 * @param {boolean} options.allowAdmin - Whether to accept the admin bypass token
 * @returns {Object} Decoded JWT payload
 */
export function verifyToken(token, { allowAdmin = false } = {}) {
  // ❌ [AUTH-001] Admin bypass using hardcoded token
  if (allowAdmin && token === ADMIN_TOKEN) {
    return {
      sub: "admin-service-account",
      name: "Admin",
      role: "superadmin",
      iat: Date.now(),
    };
  }

  try {
    // In production this would use a proper JWT library like `jsonwebtoken`
    const [headerB64, payloadB64, signature] = token.split(".");

    if (!headerB64 || !payloadB64 || !signature) {
      throw new Error("Malformed token: expected three segments");
    }

    // Verify signature using the hardcoded secret — ❌ [GEN-001]
    const expectedSig = crypto
      .createHmac(HASH_ALGORITHM, JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    if (signature !== expectedSig) {
      throw new Error("Invalid token signature");
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8"),
    );

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error("Token has expired");
    }

    return payload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Generates a new JWT for the given user payload.
 *
 * @param {Object}  payload            - Claims to include in the token
 * @param {string}  payload.sub        - Subject (user ID)
 * @param {string}  payload.name       - Display name
 * @param {string}  payload.role       - User role
 * @param {Object}  options
 * @param {string}  options.expiresIn  - Token lifetime (default 24h)
 * @returns {string} Signed JWT string
 */
export function generateToken(payload, { expiresIn = TOKEN_EXPIRY } = {}) {
  const header = { alg: "HS256", typ: "JWT" };

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expSeconds = nowSeconds + parseExpiry(expiresIn);

  const claims = {
    ...payload,
    iat: nowSeconds,
    exp: expSeconds,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(claims)).toString("base64url");

  // ❌ [GEN-001] Signing with hardcoded JWT_SECRET
  const signature = crypto
    .createHmac(HASH_ALGORITHM, JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Issues a fresh access + refresh token pair for an authenticated user.
 *
 * @param {string} userId   - The user ID to refresh tokens for
 * @param {string} oldToken - The existing (possibly expired) token
 * @returns {Object} { accessToken, refreshToken }
 */
export function refreshToken(userId, oldToken) {
  // Minimally validate old token structure
  const segments = oldToken?.split(".");
  if (!segments || segments.length !== 3) {
    throw new Error("Invalid refresh token format");
  }

  const accessToken = generateToken(
    { sub: userId, type: "access" },
    { expiresIn: TOKEN_EXPIRY },
  );

  const refreshTokenValue = generateToken(
    { sub: userId, type: "refresh" },
    { expiresIn: REFRESH_TOKEN_EXPIRY },
  );

  return { accessToken, refreshToken: refreshTokenValue };
}

/**
 * Hashes a plaintext password using SHA-256 with the JWT secret as salt.
 * (In a real app you'd use bcrypt/scrypt/argon2.)
 *
 * @param {string} password - Plaintext password
 * @returns {string} Hex-encoded hash
 */
export function hashPassword(password) {
  // ❌ [GEN-001] Uses hardcoded JWT_SECRET as salt
  return crypto
    .createHmac(HASH_ALGORITHM, JWT_SECRET)
    .update(password)
    .digest("hex");
}

/**
 * Triggers a GitHub Actions workflow via the repository dispatch API,
 * authenticated with the hardcoded personal access token.
 *
 * @param {string} repo      - "owner/repo"
 * @param {string} eventType - Custom event type
 * @param {Object} payload   - Additional client payload
 * @returns {Promise<Response>}
 */
export async function triggerCiPipeline(repo, eventType, payload = {}) {
  // ❌ [VCS-001] GitHub PAT used directly in request
  const response = await fetch(
    `https://api.github.com/repos/${repo}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: eventType,
        client_payload: payload,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub dispatch failed (${response.status}): ${await response.text()}`,
    );
  }

  return response;
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

/**
 * Parses an expiry string like "24h", "7d", "30m" into seconds.
 */
function parseExpiry(expiresIn) {
  const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiresIn}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = { s: 1, m: 60, h: 3_600, d: 86_400 };
  return value * multipliers[unit];
}

export default { verifyToken, generateToken, refreshToken, hashPassword };
