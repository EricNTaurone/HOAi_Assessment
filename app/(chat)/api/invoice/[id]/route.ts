import { auth } from "@/app/(auth)/auth";
import {
  getInvoiceById,
  deleteInvoice,
} from "@/lib/db/schemas/invoice/queries";
import { deleteChatById } from "@/lib/db/queries";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = await props.params;
  const invoiceId = params.id;

  if (!invoiceId) {
    return new Response("Missing invoice id", { status: 400 });
  }

  try {
    const body = await request.json();
    const { deleteChat } = body;

    // First verify the invoice exists and belongs to the user
    const invoice = await getInvoiceById({ id: invoiceId });
    if (!invoice || invoice.userId !== session.user.id) {
      return new Response("Invoice not found or unauthorized", { status: 404 });
    }

    // Delete the invoice
    const success = await deleteInvoice(invoiceId);
    if (!success) {
      return new Response("Failed to delete invoice", { status: 500 });
    }

    // If requested, also delete associated chat
    if (deleteChat) {
      try {
        await deleteChatById({ id: invoice.chatId });
        console.log(
          `Chat deletion requested for invoice ${invoiceId} submitted`
        );
      } catch (chatError) {
        console.error("Failed to delete associated chat:", chatError);
        // Don't fail the whole operation if chat deletion fails
      }
    }

    return new Response("Invoice deleted successfully", { status: 200 });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
