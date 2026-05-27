/**
 * ============================================================
 *  🚨 SECURITY TRAP FILE — DevOps-Guard Scanner Demo
 * ============================================================
 *  This file contains INTENTIONAL hardcoded secrets so the
 *  DevOps-Guard scanner can detect and flag them during demos.
 *  DO NOT use any of these values in real environments.
 * ============================================================
 */

// ❌ [DB-001] Security Trap — Hardcoded MongoDB Connection String (credentials in URI)
const MONGO_URI =
  "mongodb+srv://admin:P@ssw0rd123@cluster0.abc123.mongodb.net/devops_guard_prod";

// ❌ [DB-001] Security Trap — Hardcoded PostgreSQL Connection String (credentials in URI)
const POSTGRES_URI =
  "postgres://dbadmin:SuperSecretDB456@db.internal.company.com:5432/analytics";

// ❌ [GEN-001] Security Trap — Hardcoded Database Password
const DB_PASSWORD = "MyS3cretDBP@ss!";

// ❌ [GEN-003] Security Trap — Hardcoded Redis Cache Server IP
const REDIS_HOST = "http://10.0.0.42:6379";

// ---------------------------------------------------------------------------
//  Default Configuration
// ---------------------------------------------------------------------------

const DEFAULT_POOL_SIZE = 10;
const CONNECTION_TIMEOUT_MS = 5_000;
const IDLE_TIMEOUT_MS = 30_000;

/**
 * Returns the full database configuration object based on the
 * current environment. Falls back to hardcoded values when
 * environment variables are missing (which is the trap).
 *
 * @param {string} env - One of "production", "staging", "development"
 * @returns {Object}   Database configuration
 */
export function getDbConfig(env = process.env.NODE_ENV || "production") {
  const base = {
    poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || DEFAULT_POOL_SIZE,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    idleTimeout: IDLE_TIMEOUT_MS,
    ssl: env === "production",
  };

  switch (env) {
    case "production":
      return {
        ...base,
        primary: {
          engine: "mongodb",
          uri: process.env.MONGO_URI || MONGO_URI,        // ❌ [DB-001] fallback to hardcoded URI
          password: process.env.DB_PASSWORD || DB_PASSWORD, // ❌ [GEN-001] fallback to hardcoded password
        },
        analytics: {
          engine: "postgres",
          uri: process.env.POSTGRES_URI || POSTGRES_URI,  // ❌ [DB-001] fallback to hardcoded URI
        },
        cache: {
          engine: "redis",
          host: process.env.REDIS_HOST || REDIS_HOST,     // ❌ [GEN-003] fallback to hardcoded IP
          port: 6379,
        },
      };

    case "staging":
      return {
        ...base,
        primary: {
          engine: "mongodb",
          uri: MONGO_URI.replace("devops_guard_prod", "devops_guard_staging"),
          password: DB_PASSWORD,                           // ❌ [GEN-001] always hardcoded in staging
        },
        analytics: {
          engine: "postgres",
          uri: POSTGRES_URI.replace("analytics", "analytics_staging"),
        },
        cache: {
          engine: "redis",
          host: REDIS_HOST,                                // ❌ [GEN-003] always hardcoded in staging
          port: 6379,
        },
      };

    default: // development
      return {
        ...base,
        primary: {
          engine: "mongodb",
          uri: "mongodb://localhost:27017/devops_guard_dev",
          password: "dev_password",
        },
        analytics: {
          engine: "postgres",
          uri: "postgres://localhost:5432/analytics_dev",
        },
        cache: {
          engine: "redis",
          host: "localhost",
          port: 6379,
        },
      };
  }
}

/**
 * Establishes a database connection using the resolved config.
 * Includes basic health-check and retry logic.
 *
 * @param {Object}  options
 * @param {string}  options.engine   - "mongodb" | "postgres" | "redis"
 * @param {string}  options.uri      - Full connection URI
 * @param {number}  options.retries  - Number of connection attempts
 * @returns {Promise<Object>} A database connection handle
 */
export async function connectDatabase({ engine, uri, retries = 3 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `[database] Connecting to ${engine} (attempt ${attempt}/${retries})…`,
      );

      let connection;

      switch (engine) {
        case "mongodb": {
          // In a real app this would be: const { MongoClient } = await import("mongodb");
          const { MongoClient } = await import("mongodb");
          const client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
          });
          await client.connect();
          connection = client.db();
          break;
        }

        case "postgres": {
          const { Pool } = await import("pg");
          const pool = new Pool({
            connectionString: uri,
            max: DEFAULT_POOL_SIZE,
            idleTimeoutMillis: IDLE_TIMEOUT_MS,
            connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
          });
          // verify connectivity
          const testClient = await pool.connect();
          testClient.release();
          connection = pool;
          break;
        }

        case "redis": {
          const redis = await import("redis");
          const client = redis.createClient({ url: uri });
          await client.connect();
          connection = client;
          break;
        }

        default:
          throw new Error(`Unsupported database engine: ${engine}`);
      }

      console.log(`[database] Connected to ${engine} successfully.`);
      return connection;
    } catch (error) {
      lastError = error;
      console.error(
        `[database] Connection attempt ${attempt} failed: ${error.message}`,
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 2_000 * attempt));
      }
    }
  }

  throw new Error(
    `[database] Failed to connect to ${engine} after ${retries} attempts: ${lastError?.message}`,
  );
}

/**
 * Creates a connection pool for the primary and analytics databases,
 * returning handles that other services can reuse.
 *
 * @returns {Promise<Object>} { primary, analytics, cache }
 */
export async function createConnectionPool() {
  const config = getDbConfig();

  const [primary, analytics, cache] = await Promise.all([
    connectDatabase({
      engine: config.primary.engine,
      uri: config.primary.uri,
    }),
    connectDatabase({
      engine: config.analytics.engine,
      uri: config.analytics.uri,
    }),
    connectDatabase({
      engine: config.cache.engine,
      uri: `${config.cache.host}`,
    }),
  ]);

  // Graceful shutdown hook
  const shutdown = async () => {
    console.log("[database] Closing all connections…");
    await Promise.allSettled([
      primary?.close?.(),
      analytics?.end?.(),
      cache?.quit?.(),
    ]);
    console.log("[database] All connections closed.");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return { primary, analytics, cache, shutdown };
}

export default getDbConfig;
