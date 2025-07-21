import { type Message as AIMessage } from "ai";

// Extend AIMessage to include chatId for database operations
export interface ExtendedAIMessage extends AIMessage {
  chatId: string;
}
