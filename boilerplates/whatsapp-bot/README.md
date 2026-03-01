# WhatsApp Bot Starter

A production-ready WhatsApp Business API bot built with TypeScript and Express. Supports the official Meta Cloud API and optional Baileys multi-device integration. Designed with India-focused features in mind.

## Features

- **Cloud API Integration** -- Send and receive messages through the official WhatsApp Business Cloud API.
- **Baileys Support (optional)** -- Multi-device WhatsApp Web connection via `@whiskeysockets/baileys` with QR-code pairing.
- **Command System** -- Slash-command routing (`/help`, `/start`, `/status`) that is easy to extend.
- **Message Type Handling** -- Text, image, and location messages are handled out of the box.
- **Template Messages** -- Send pre-approved template messages for outbound notifications.
- **India-Focused Notes** -- UPI payment link helpers and regional language considerations below.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start in development mode
npm run dev

# 4. Expose your local server (for webhook registration)
# Use ngrok, Cloudflare Tunnel, or any reverse proxy:
ngrok http 3000
```

Register the public URL as your webhook in the Meta Developer Console:
- Webhook URL: `https://<your-domain>/webhook`
- Verify Token: the value you set in `.env`

## Environment Variables

| Variable           | Required | Description                                  |
| ------------------ | -------- | -------------------------------------------- |
| `WHATSAPP_TOKEN`   | Yes      | Access token from Meta Business dashboard    |
| `VERIFY_TOKEN`     | Yes      | Custom string for webhook verification       |
| `PHONE_NUMBER_ID`  | Yes      | Phone number ID from Meta dashboard          |
| `PORT`             | No       | Server port (default: `3000`)                |
| `USE_BAILEYS`      | No       | Set to `true` to enable Baileys multi-device |

## How to Add a New Command

1. Open `src/handlers/commands.ts`.
2. Add an entry to the `commands` map:

```typescript
const commands: Record<string, CommandHandler> = {
  // ...existing commands

  ping: (_from, _args) => {
    return "Pong!";
  },
};
```

3. Restart the server. Users can now send `/ping` to get a response.

## India-Focused Considerations

### UPI Payment Links

Generate UPI deep-links to allow users to pay directly from WhatsApp:

```
upi://pay?pa=merchant@upi&pn=MerchantName&am=100.00&cu=INR&tn=OrderPayment
```

Send this as a text message and WhatsApp on Android will make it tappable.

### Regional Language Support

- WhatsApp Cloud API template messages support multiple languages including Hindi (`hi`), Tamil (`ta`), Telugu (`te`), Bengali (`bn`), Marathi (`mr`), and Gujarati (`gu`).
- Pass the language code when calling `sendTemplate`:

```typescript
await sendTemplate(to, "order_confirmation", ["12345"], "hi");
```

- For free-form text, keep responses in the user's preferred language by detecting it from their incoming messages or storing a preference per user.

### Compliance Notes

- Follow Meta's Commerce Policy and WhatsApp Business Policy for India.
- Obtain opt-in consent before sending template messages.
- Respect the 24-hour session messaging window for non-template messages.

## Project Structure

```
whatsapp-bot/
  src/
    index.ts              # Express server, webhook endpoints
    handlers/
      message.ts          # Incoming message routing
      commands.ts         # Slash-command definitions
    services/
      whatsapp.ts         # Cloud API client (sendMessage, sendTemplate)
  .env.example            # Environment variable template
  package.json
  tsconfig.json
```

## Build for Production

```bash
npm run build
npm start
```

## License

MIT
