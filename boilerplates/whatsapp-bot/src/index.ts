import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./handlers/message";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "default-verify-token";

/**
 * GET /webhook — Meta webhook verification.
 * Responds to the hub.challenge when the verify token matches.
 */
app.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const token = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[webhook] Verification successful");
    res.status(200).send(challenge);
    return;
  }

  console.warn("[webhook] Verification failed — token mismatch");
  res.sendStatus(403);
});

/**
 * POST /webhook — Receives incoming WhatsApp messages from the Cloud API
 * and delegates them to the message handler.
 */
app.post("/webhook", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      res.sendStatus(404);
      return;
    }

    const entries = body.entry ?? [];

    for (const entry of entries) {
      const changes = entry.changes ?? [];

      for (const change of changes) {
        const messages = change.value?.messages ?? [];

        for (const message of messages) {
          await handleIncomingMessage(message);
        }
      }
    }

    // Always acknowledge the webhook promptly to avoid retries.
    res.sendStatus(200);
  } catch (error) {
    console.error("[webhook] Error processing message:", error);
    res.sendStatus(500);
  }
});

/**
 * GET /health — Simple health-check endpoint for uptime monitors.
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`[server] WhatsApp bot listening on port ${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/health`);
});
