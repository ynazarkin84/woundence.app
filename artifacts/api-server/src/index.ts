import { createApp } from "./app";
import { logger } from "./lib/logger";
import { ensureWoundImagesBucket } from "./lib/supabaseStorage";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

ensureWoundImagesBucket()
  .catch((err) => {
    logger.warn({ err }, "Could not verify/create the Supabase Storage bucket — wound photo uploads will fail until this is resolved");
  })
  .finally(() => {
    createApp().then((app) => {
      app.listen(port, (err) => {
        if (err) {
          logger.error({ err }, "Error listening on port");
          process.exit(1);
        }
        logger.info({ port }, "Server listening");
      });
    }).catch((err) => {
      logger.error({ err }, "Failed to initialize application");
      process.exit(1);
    });
  });
