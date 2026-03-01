/**
 * Handles slash-commands received via WhatsApp text messages.
 *
 * To add a new command, register it in the `commands` map below.
 */

type CommandHandler = (from: string, args: string[]) => string;

const commands: Record<string, CommandHandler> = {
  /**
   * /start — Welcome message for first-time users.
   */
  start: (_from, _args) => {
    return [
      "Welcome to our WhatsApp Bot!",
      "",
      "Here's what I can do:",
      "  /help   — Show available commands",
      "  /status — Check bot status",
      "",
      "Send any text message and I'll respond.",
      "For support, type /help.",
    ].join("\n");
  },

  /**
   * /help — Lists all available commands.
   */
  help: (_from, _args) => {
    return [
      "Available commands:",
      "",
      "  /start  — Welcome message",
      "  /help   — Show this help text",
      "  /status — Bot status & uptime",
      "",
      "You can also send:",
      "  - Text messages",
      "  - Images",
      "  - Location pins",
      "",
      "Need assistance? Contact support@example.com",
    ].join("\n");
  },

  /**
   * /status — Reports current bot status.
   */
  status: (_from, _args) => {
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return [
      "Bot Status: Online",
      `Uptime: ${hours}h ${minutes}m ${seconds}s`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join("\n");
  },
};

/**
 * Routes a command string to the appropriate handler.
 *
 * @param from    - The sender's phone number.
 * @param command - The command name (without the leading "/").
 * @param args    - Any arguments following the command.
 * @returns The text response to send back to the user.
 */
export function handleCommand(
  from: string,
  command: string,
  args: string[]
): string {
  const handler = commands[command];

  if (!handler) {
    return `Unknown command: /${command}\n\nType /help to see available commands.`;
  }

  return handler(from, args);
}
