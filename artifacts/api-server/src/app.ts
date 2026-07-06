import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Reflecting any origin (the old behaviour) lets a malicious site issue
// credentialed requests using a logged-in user's session cookie. Native
// mobile fetch and server-to-server calls (Railway healthchecks, curl) send
// no Origin header at all and are always allowed through; only browser
// requests are checked against this list.
const defaultAllowedOrigins = ["http://localhost:22916", "http://localhost:19006"];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : defaultAllowedOrigins;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed`));
    },
    credentials: true,
  }),
);

// General ceiling against scripted abuse. Per-route limiters (see the
// wound-image analyze route) apply tighter limits on expensive endpoints.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Resolve the publishable key from the incoming request host so the same
// server can serve multiple Clerk custom domains. Falls back to
// CLERK_PUBLISHABLE_KEY when the host doesn't map to a custom domain.
//
// getClerkProxyHost is shared with clerkProxyMiddleware so that both
// halves of the auth setup agree on which hostname is canonical.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

export async function createApp(): Promise<Express> {
  app.use("/api", router);

  // Without this, errors thrown by middleware that runs before a route
  // handler (e.g. multer's fileFilter rejecting an unsupported upload)
  // fall through to Express's default HTML error page instead of the JSON
  // shape every client here expects — and with no application-level log.
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction,
    ) => {
      req.log?.error({ err }, "Unhandled request error");
      if (res.headersSent) return;
      const isCorsRejection = err.message?.startsWith("Origin ");
      res
        .status(isCorsRejection ? 403 : 500)
        .json({ message: err.message || "Internal server error" });
    },
  );

  return app;
}

export default app;
