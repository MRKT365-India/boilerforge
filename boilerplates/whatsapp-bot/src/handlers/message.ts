import { sendMessage } from "../services/whatsapp";
import { handleCommand } from "./commands";

/**
 * Represents an incoming WhatsApp message from the Cloud API webhook payload.
 */
interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  location?: { latitude: number; longitude: number };
  [key: string]: unknown;
}

/**
 * Processes a single incoming WhatsApp message.
 *
 * - Text messages starting with "/" are routed to the command handler.
 * - All other message types receive a default acknowledgment.
 */
export async function handleIncomingMessage(
  message: IncomingMessage
): Promise<void> {
  const { from, type, id } = message;

  console.log(
    `[message] Received ${type} message from ${from} (id: ${id})`
  );

  switch (type) {
    case "text": {
      const body = message.text?.body ?? "";

      if (body.startsWith("/")) {
        const parts = body.slice(1).split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        const reply = handleCommand(from, command, args);
        await sendMessage(from, reply);
        return;
      }

      // Echo-style acknowledgment for plain text.
      await sendMessage(
        from,
        `Thanks for your message! You said: "${body}"\n\nType /help to see available commands.`
      );
      return;
    }

    case "image": {
      const caption = message.image?.caption ?? "(no caption)";
      console.log(`[message] Image received — caption: ${caption}`);
      await sendMessage(from, "Got your image! We'll process it shortly.");
      return;
    }

    case "location": {
      const lat = message.location?.latitude;
      const lng = message.location?.longitude;
      console.log(`[message] Location received — lat: ${lat}, lng: ${lng}`);
      await sendMessage(
        from,
        `Got your location (${lat}, ${lng}). Thanks!`
      );
      return;
    }

    default: {
      console.log(`[message] Unhandled message type: ${type}`);
      await sendMessage(
        from,
        "Sorry, we don't support that message type yet. Try sending text or type /help."
      );
    }
  }
}
