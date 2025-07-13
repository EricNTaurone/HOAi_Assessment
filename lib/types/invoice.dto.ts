export interface InvoiceDto {
    id?: string,
    createdAt?: number,
    userId: string,
    customerName: string,
    vendorName: string,
    invoiceNumber: string,
    invoiceDate: string,
    invoiceDueDate: string,
    invoiceAmount: number,
    lineItems?: LineItem[]
}

export interface LineItem {
    itemName: string,
    itemQuantity: string,
    itemPrice: string,
    itemTotal: string,
}

export interface UpdateInvoiceDto {
    id: string,
    customerName?: string,
    vendorName?: string,
    invoiceNumber?: string,
    invoiceDate?: string,
    invoiceDueDate?: string,
    invoiceAmount?: number,
    lineItems?: LineItem[]
}

export enum SearchType {
    ID = 'ID',
    USER_ID = 'USER_ID'
}