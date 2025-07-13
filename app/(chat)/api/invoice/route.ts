import {auth} from "@/app/(auth)/auth";
import {getInvoiceById, getInvoicesByUserId, insertInvoice, updateInvoice} from "@/lib/db/schemas/invoice/queries";
import {InvoiceDto, SearchType, UpdateInvoiceDto} from "@/lib/types/invoice.dto";


export async function GET(request: Request): Promise<Response> {
    const session = await auth();

    if (!session || !session.user) {
        return new Response('Unauthorized', {status: 401});
    }

    const {searchParams} = new URL(request.url);
    const id = searchParams.get('id');
    const searchType = searchParams.get('searchType');

    if (!id || !searchType) {
        return new Response('Missing id or searchType', {status: 400});
    }

    switch (searchType) {
        case SearchType.ID:
            return Response.json(await getInvoiceById({id}), {status: 200});
        case SearchType.USER_ID:
            return Response.json(await getInvoicesByUserId({userId: id}), {status: 200});
        default:
            return new Response('Invalid searchType', {status: 400});
    }

}

export async function PUT(request: Request) {
    const session = await auth();

    if (!session || !session.user) {
        return new Response('Unauthorized', {status: 401});
    }

    try {
        const invoiceData: InvoiceDto = await request.json();

        // Validate required fields
        if (!invoiceData.id || !invoiceData.customerName || !invoiceData.vendorName ||
            !invoiceData.invoiceNumber || !invoiceData.invoiceDate ||
            !invoiceData.invoiceDueDate || !invoiceData.invoiceAmount) {
            return new Response('Missing required fields', {status: 400});
        }

        // Ensure the invoice belongs to the authenticated user
        const invoiceWithUserId: InvoiceDto = {
            ...invoiceData,
            userId: session.user.id
        };

        const result = await insertInvoice(invoiceWithUserId);

        return Response.json(result, {status: 200});
    } catch (error) {
        console.error('Failed to insert invoice:', error);
        return new Response('Internal Server Error', {status: 500});
    }
}

export async function POST(request: Request): Promise<Response> {
    const session = await auth();

    if (!session || !session.user) {
        return new Response('Unauthorized', {status: 401});
    }

    try {
        const updateData: UpdateInvoiceDto = await request.json();

        if (!updateData.id) {
            return new Response('Missing id', {status: 400});
        }

        const result = await updateInvoice(updateData);

        return Response.json(result, {status: 200});
    } catch (error) {
        console.error('Failed to update invoice:', error);
        return new Response('Internal Server Error', {status: 500});
    }
}


async function fetchInvoicesByUserId(userId: string): Promise<Response> {
    const invoices = await getInvoicesByUserId({userId});
    return returnInvoicesOr404(invoices);
}

async function fetchInvoiceById(id: string): Promise<Response> {
    const invoice = await getInvoiceById({id});
    return returnInvoicesOr404(invoice);
}

function returnInvoicesOr404(invoices: InvoiceDto[] | InvoiceDto): Response {
    if (!invoices) {
        return new Response('Not Found', {status: 404});
    }
    return Response.json(invoices, {status: 200});
}