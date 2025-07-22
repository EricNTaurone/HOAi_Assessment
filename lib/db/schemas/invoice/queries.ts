import { Invoice, invoices, lineItems } from "@/lib/db/schemas/invoice/schema";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import {
  InvoiceDto,
  UpdateInvoiceDto,
  LineItem,
} from "@/lib/types/invoice.dto";
import { generateUUID } from "@/lib/utils";

export async function getInvoicesByUserId({
  userId,
}: {
  userId: string;
}): Promise<InvoiceDto[]> {
  try {
    const userInvoices = await db
      .select()
      .from(invoices)
      .leftJoin(lineItems, eq(invoices.id, lineItems.invoiceId))
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));

    // Group line items by invoice
    const invoiceMap = new Map<string, InvoiceDto>();

    for (const row of userInvoices) {
      const invoice = row.Invoices;
      const lineItem = row.LineItems;

      if (!invoiceMap.has(invoice.id)) {
        invoiceMap.set(invoice.id, convertToDto(invoice, []));
      }

      if (lineItem) {
        const invoiceDto = invoiceMap.get(invoice.id)!;
        if (!invoiceDto.lineItems) {
          invoiceDto.lineItems = [];
        }
        invoiceDto.lineItems.push({
          itemName: lineItem.itemName,
          itemQuantity: lineItem.itemQuantity,
          itemPrice: lineItem.itemPrice,
          itemTotal: lineItem.itemTotal,
        });
      }
    }

    return Array.from(invoiceMap.values());
  } catch (error) {
    console.error("Failed to get invoices by user id from database", error);
    throw error;
  }
}

export async function getInvoiceById({
  id,
}: {
  id: string;
}): Promise<InvoiceDto> {
  try {
    const invoiceWithItems = await db
      .select()
      .from(invoices)
      .leftJoin(lineItems, eq(invoices.id, lineItems.invoiceId))
      .where(eq(invoices.id, id))
      .orderBy(desc(invoices.createdAt));

    if (invoiceWithItems.length === 0) {
      throw new Error("Invoice not found");
    }

    const invoice = invoiceWithItems[0].Invoices;
    const items: LineItem[] = invoiceWithItems
      .filter((row) => row.LineItems !== null)
      .map((row) => ({
        itemName: row.LineItems!.itemName,
        itemQuantity: row.LineItems!.itemQuantity,
        itemPrice: row.LineItems!.itemPrice,
        itemTotal: row.LineItems!.itemTotal,
      }));

    return convertToDto(invoice, items);
  } catch (error) {
    console.error("Failed to get invoice by id from database", error);
    throw error;
  }
}

export async function updateInvoice(
  updateData: UpdateInvoiceDto
): Promise<void> {
  try {
    const updateFields: Partial<Invoice> = {};

    if (updateData.customerName !== undefined)
      updateFields.customerName = updateData.customerName;
    if (updateData.vendorName !== undefined)
      updateFields.vendorName = updateData.vendorName;
    if (updateData.invoiceNumber !== undefined)
      updateFields.invoiceNumber = updateData.invoiceNumber;
    if (updateData.invoiceDate !== undefined)
      updateFields.invoiceDate = updateData.invoiceDate;
    if (updateData.invoiceDueDate !== undefined)
      updateFields.invoiceDueDate = updateData.invoiceDueDate;
    if (updateData.invoiceAmount !== undefined)
      updateFields.invoiceAmount = updateData.invoiceAmount;

    console.log("Updating invoice with fields:", updateData);
    if (Object.keys(updateFields).length > 0) {
      const [updated] = await db
        .update(invoices)
        .set(updateFields)
        .where(eq(invoices.id, updateData.id))
        .returning();
  
      if (!updated) {
        throw new Error("Invoice not found");
      }
    }

    // Update line items if provided
    if (updateData.lineItems !== undefined) {
      // Delete existing line items
      await db.delete(lineItems).where(eq(lineItems.invoiceId, updateData.id));

      // Insert new line items
      if (updateData.lineItems.length > 0) {
        await db.insert(lineItems).values(
          updateData.lineItems.map((item) => ({
            invoiceId: updateData.id,
            itemName: item.itemName,
            itemQuantity: item.itemQuantity,
            itemPrice: item.itemPrice,
            itemTotal: item.itemTotal,
          }))
        );
      }
    }
  } catch (error) {
    console.error("Failed to update invoice in database", error);
    throw error;
  }
}

export async function insertInvoice(invoice: InvoiceDto): Promise<InvoiceDto> {
  try {
    // Insert invoice first
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        id: invoice.id || generateUUID(),
        userId: invoice.userId,
        customerName: invoice.customerName,
        vendorName: invoice.vendorName,
        chatId: invoice.chatId,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoiceDueDate: invoice.invoiceDueDate,
        invoiceAmount: invoice.invoiceAmount,
      })
      .returning();

    let insertedLineItems: LineItem[] = [];

    // Insert line items if provided
    if (invoice.lineItems && invoice.lineItems.length > 0) {
      await db.insert(lineItems).values(
        invoice.lineItems.map((item) => ({
          invoiceId: newInvoice.id,
          itemName: item.itemName,
          itemQuantity: item.itemQuantity,
          itemPrice: item.itemPrice,
          itemTotal: item.itemTotal,
        }))
      );

      insertedLineItems = [...invoice.lineItems];
    }

    return convertToDto(newInvoice, insertedLineItems);
  } catch (error) {
    console.error("Failed to insert invoice in database", error);
    throw error;
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    const deletedRows = await db.delete(invoices).where(eq(invoices.id, id));

    // Check if any rows were deleted
    return deletedRows.changes > 0;
  } catch (error) {
    console.error("Failed to delete invoice from database", error);
    throw error;
  }
}

export function convertToDto(
  dbInvoice: Invoice,
  lineItemsList: LineItem[]
): InvoiceDto {
  return {
    id: dbInvoice.id,
    userId: dbInvoice.userId,
    customerName: dbInvoice.customerName,
    vendorName: dbInvoice.vendorName,
    invoiceNumber: dbInvoice.invoiceNumber,
    invoiceDate: dbInvoice.invoiceDate,
    invoiceDueDate: dbInvoice.invoiceDueDate,
    invoiceAmount: dbInvoice.invoiceAmount,
    chatId: dbInvoice.chatId,
    lineItems: lineItemsList.length > 0 ? lineItemsList : undefined,
    createdAt: dbInvoice.createdAt.getTime(),
  };
}
