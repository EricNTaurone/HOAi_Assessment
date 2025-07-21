import { auth } from "@/app/(auth)/auth";
import { saveAIMessages } from "@/lib/db/queries";
import { Message } from "@/lib/db/schema";
import { ExtendedAIMessage } from "@/lib/types/message.dto";

export interface PostMessageRequest {
  messages: ExtendedAIMessage[];
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const requestBody = await request.json();
  const { messages } = requestBody as PostMessageRequest;

  if (!messages || messages.length === 0) {
    return new Response("No messages provided", { status: 400 });
  }

  try {
    await saveAIMessages({ messages: messages });

    return new Response("Message posted Successfully", { status: 200 });
  } catch (error) {
    console.error("Failed to save messages:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
