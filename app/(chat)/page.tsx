import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ threadId?: string }>;
}) {
  const params = await searchParams;

  // If there's a threadId, redirect to /chat with the threadId
  if (params.threadId) {
    redirect(`/chat?threadId=${params.threadId}`);
  }

  // Otherwise, just redirect to /chat
  redirect("/chat");
}
