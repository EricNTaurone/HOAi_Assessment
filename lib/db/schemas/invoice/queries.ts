import {Invoice, invoices} from "@/lib/db/schemas/invoice/schema";
import {desc, eq} from "drizzle-orm";
import {db} from "@/lib/db/queries";
import {InvoiceDto, UpdateInvoiceDto} from "@/lib/types/invoice.dto";

export async function getInvoicesByUserId({userId}: { userId: string }): Promise<InvoiceDto[]> {
    try {

        const userInvoices: Invoice[] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.userId, userId))
            .orderBy(desc(invoices.createdAt));
        return userInvoices.map(invoice => convertToDto(invoice));
    } catch (error) {
        console.error('Failed to get invoices by user id from database', error);
        throw error;
    }
}

export async function getInvoiceById({id}: { id: string }): Promise<InvoiceDto> {
    try {
        const [invoice] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.id, id))
            .orderBy(desc(invoices.createdAt));

        return convertToDto(invoice);
    } catch (error) {
        console.error('Failed to get invoices by id from database', error);
        throw error;
    }
}

export async function updateInvoice(updateData: UpdateInvoiceDto): Promise<InvoiceDto> {
    try {
        // Build the update object, excluding undefined values
        const updateFields: Partial<Invoice> = {};

        if (updateData.customerName !== undefined) updateFields.customerName = updateData.customerName;
        if (updateData.vendorName !== undefined) updateFields.vendorName = updateData.vendorName;
        if (updateData.invoiceNumber !== undefined) updateFields.invoiceNumber = updateData.invoiceNumber;
        if (updateData.invoiceDate !== undefined) updateFields.invoiceDate = updateData.invoiceDate;
        if (updateData.invoiceDueDate !== undefined) updateFields.invoiceDueDate = updateData.invoiceDueDate;
        if (updateData.invoiceAmount !== undefined) updateFields.invoiceAmount = updateData.invoiceAmount;
        if (updateData.lineItems !== undefined) updateFields.lineItems = updateData.lineItems;

        // Perform the update
        const [updatedInvoice] = await db
            .update(invoices)
            .set(updateFields)
            .where(eq(invoices.id, updateData.id))
            .returning();

        if (!updatedInvoice) {
            throw new Error('Invoice not found');
        }

        return convertToDto(updatedInvoice);
    } catch (error) {
        console.error('Failed to update invoice in database', error);
        throw error;
    }
}


export async function insertInvoice(invoice: InvoiceDto) {
    try {
        return await db
            .insert(invoices)
            .values({
                userId: invoice.userId,
                customerName: invoice.customerName,
                vendorName: invoice.vendorName,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.invoiceDate,
                invoiceDueDate: invoice.invoiceDueDate,
                invoiceAmount: invoice.invoiceAmount,
                lineItems: invoice.lineItems,
                createdAt: new Date(),
            });
    } catch (error) {
        console.error('Failed to insert invoice in database', error);
        throw error;
    }
}

export function convertToDto(db: Invoice): InvoiceDto {
    return {
        id: db.id,
        userId: db.userId,
        customerName: db.customerName,
        vendorName: db.vendorName,
        invoiceNumber: db.invoiceNumber,
        invoiceDate: db.invoiceDate,
        invoiceDueDate: db.invoiceDueDate,
        invoiceAmount: db.invoiceAmount,
        lineItems: db.lineItems != null ? db.lineItems : undefined,
        createdAt: db.createdAt.getMilliseconds()
    }
}