import { auth } from "@/app/(auth)/auth";
import { notFound } from "next/navigation";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { cookies } from "next/headers";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { Chat } from "@/components/chat";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ threadId?: string }>;
}) {
  const session = await auth();
  if (!session || !session.user) {
    return notFound();
  }

  const params = await searchParams;
  let threadId = params.threadId;

  if (!threadId) {
    return initializeChatWithoutThreadId(session);
  }
  return initializeChatWithThreadId(threadId, session);
}

async function initializeChatWithThreadId(threadId: string, session: any) {
  const chat = await getChatById({ id: threadId });
  const isNewChat = false;

  if (!chat) {
    notFound();
  }

  if (chat.visibility === "private") {
    if (!session || !session.user) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({ id: threadId });

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  if (!chatModelFromCookie) {
    return (
      <>
        {" "}
        <Chat
          id={threadId}
          initialMessages={convertToUIMessages(messagesFromDb)}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType={chat.visibility}
          isNewChat={isNewChat}
          user={session.user}
        />
        <DataStreamHandler id={threadId} />
      </>
    );
  }

  return (
    <>
      {" "}
      <Chat
        id={threadId}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={chatModelFromCookie.value}
        selectedVisibilityType={chat.visibility}
        isNewChat={isNewChat}
        user={session.user}
      />
      <DataStreamHandler id={threadId} />
    </>
  );
}

async function initializeChatWithoutThreadId(session: any) {
  const threadId = generateUUID().toString();
  const isNewChat = true;

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          id={threadId}
          initialMessages={convertToUIMessages([])}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType={"public"}
          isNewChat={isNewChat}
          user={session.user}
        />
        <DataStreamHandler id={threadId} />
      </>
    );
  }

  return (
    <>
      <Chat
        id={threadId}
        initialMessages={convertToUIMessages([])}
        selectedChatModel={chatModelFromCookie.value}
        selectedVisibilityType={"public"}
        isNewChat={isNewChat}
        user={session.user}
      />
      <DataStreamHandler id={threadId} />
    </>
  );
}
