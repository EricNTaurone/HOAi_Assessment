import { auth } from "@/app/(auth)/auth";
import { subMonths } from "date-fns";
import { leftJoinQuerytokensAndInvoices } from "@/lib/db/schemas/token/queries";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    const threeMonthsAgo = subMonths(new Date(), 3);

    const tokenData = await leftJoinQuerytokensAndInvoices(userId, threeMonthsAgo);

    return Response.json(tokenData, { status: 200 });
  } catch (error) {
    console.error("Error fetching token data:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
