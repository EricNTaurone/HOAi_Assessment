import {auth} from '@/app/(auth)/auth';
import {notFound} from "next/navigation";
import {convertToUIMessages, generateUUID} from "@/lib/utils";
import {DEFAULT_CHAT_MODEL} from "@/lib/ai/models";
import {DataStreamHandler} from "@/components/data-stream-handler";
import {cookies} from "next/headers";
import {InvoiceChat} from "@/components/invoice-chat";
import {getChatById, getMessagesByChatId} from "@/lib/db/queries";


export default async function Page({searchParams}: { searchParams: Promise<{ threadId?: string }> }) {

    const session = await auth();
    if (!session || !session.user) {
        return notFound();
    }

    const params = await searchParams;
    let threadId = params.threadId;

    if (!threadId) {
        return initializeChatWithoutThreadId();
    }
    return initializeChatWithThreadId(threadId, session);
}

async function initializeChatWithThreadId(threadId: string, session: any) {

    const chat = await getChatById({id: threadId});

    if (!chat) {
        notFound();
    }

    if (chat.visibility === 'private') {
        if (!session || !session.user) {
            return notFound();
        }
    }

    const messagesFromDb = await getMessagesByChatId({id: threadId});


    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get('chat-model');

    if (!chatModelFromCookie) {
        return (
            <>
                <InvoiceChat
                    id={threadId}
                    initialMessages={convertToUIMessages(messagesFromDb)}
                    selectedChatModel={DEFAULT_CHAT_MODEL}
                    selectedVisibilityType={chat.visibility}
                />
                <DataStreamHandler id={threadId}/>
            </>
        );
    }

    return (
        <>
            <InvoiceChat
                id={threadId}
                initialMessages={convertToUIMessages(messagesFromDb)}
                selectedChatModel={chatModelFromCookie.value}
                selectedVisibilityType={chat.visibility}
            />
            <DataStreamHandler id={threadId}/>
        </>
    );
}

async function initializeChatWithoutThreadId() {

    const threadId = generateUUID().toString();

    const cookieStore = await cookies();
    const chatModelFromCookie = cookieStore.get('chat-model');

    if (!chatModelFromCookie) {
        return (
            <>
                <InvoiceChat
                    id={threadId}
                    initialMessages={convertToUIMessages([])}
                    selectedChatModel={DEFAULT_CHAT_MODEL}
                    selectedVisibilityType={'public'}
                />
                <DataStreamHandler id={threadId}/>
            </>
        );
    }

    return (
        <>
            <InvoiceChat
                id={threadId}
                initialMessages={convertToUIMessages([])}
                selectedChatModel={chatModelFromCookie.value}
                selectedVisibilityType={'public'}
            />
            <DataStreamHandler id={threadId}/>
        </>
    );
}
