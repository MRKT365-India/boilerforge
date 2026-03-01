import axios, { AxiosError } from "axios";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID ?? "";

const GRAPH_API_VERSION = "v18.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}`;

/**
 * Creates an axios instance pre-configured for the WhatsApp Cloud API.
 */
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  },
});

/**
 * Sends a plain text message to a WhatsApp recipient.
 *
 * @param to   - The recipient's phone number in international format (e.g. "919876543210").
 * @param text - The message body.
 */
export async function sendMessage(to: string, text: string): Promise<void> {
  try {
    await api.post("/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    });

    console.log(`[whatsapp] Message sent to ${to}`);
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(
      "[whatsapp] Failed to send message:",
      axiosError.response?.data ?? axiosError.message
    );
    throw error;
  }
}

/**
 * Sends a pre-approved template message to a WhatsApp recipient.
 *
 * Template messages are required for initiating conversations outside
 * the 24-hour messaging window.
 *
 * @param to           - The recipient's phone number in international format.
 * @param templateName - The name of the approved template.
 * @param params       - An array of parameter values to fill template placeholders.
 * @param language     - The template language code (defaults to "en" for English).
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  params: string[] = [],
  language: string = "en"
): Promise<void> {
  const components =
    params.length > 0
      ? [
          {
            type: "body",
            parameters: params.map((value) => ({
              type: "text",
              text: value,
            })),
          },
        ]
      : [];

  try {
    await api.post("/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        ...(components.length > 0 ? { components } : {}),
      },
    });

    console.log(
      `[whatsapp] Template "${templateName}" sent to ${to}`
    );
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(
      "[whatsapp] Failed to send template:",
      axiosError.response?.data ?? axiosError.message
    );
    throw error;
  }
}
