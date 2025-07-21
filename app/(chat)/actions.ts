"use server";

import { generateText, type Message } from "ai";
import { cookies } from "next/headers";

import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from "@/lib/db/queries";
import type { VisibilityType } from "@/components/visibility-selector";
import { myProvider } from "@/lib/ai/models";
import {
  getPromptCache,
  upsertPromptCache,
} from "@/lib/db/schemas/prompt-cache/queries";
import { generateUUID } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  try {
    const cacheMessage = await getPromptCache(message.content);
    if (cacheMessage) {
      console.log(`Cache hit. cache id: ${cacheMessage.id}`);
      return cacheMessage.cachedResponse;
    }
  } catch (error) {
    console.error("Attempt to hit prompt cache failed: ", error);
  }

  const response = await generateText({
    model: myProvider.languageModel("title-model"),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: message.content,
  });

  try {
    await upsertPromptCache({
      id: generateUUID(),
      prompt: message.content,
      cachedResponse: response.text,
    });
  } catch (error) {
    console.error("Failed to save prompt. Error was: ", error);
  }

  return response.text;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}
