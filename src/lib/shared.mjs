export function loadEnv(requiredKeys) {
  const values = {};
  const missing = [];
  for (const key of requiredKeys) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
      continue;
    }
    values[key] = value;
  }
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  return values;
}

export function bufferToString(value) {
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value || "");
}

export class TimeboxedSet {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.values = new Map();
  }

  has(key) {
    this.gc();
    const expiresAt = this.values.get(key);
    return typeof expiresAt === "number" && expiresAt > Date.now();
  }

  add(key) {
    this.gc();
    this.values.set(key, Date.now() + this.ttlMs);
  }

  gc() {
    const now = Date.now();
    for (const [key, expiresAt] of this.values.entries()) {
      if (expiresAt <= now) {
        this.values.delete(key);
      }
    }
  }
}
