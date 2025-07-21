"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrashIcon, PencilEditIcon } from "@/components/icons";
import {
  InvoiceDto,
  UpdateInvoiceDto,
  SearchType,
} from "@/lib/types/invoice.dto";
import { LineItemsModal } from "@/components/line-items-modal";
import { toast } from "sonner";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

type SortField = "vendorName" | "invoiceAmount" | "invoiceDueDate";
type SortDirection = "asc" | "desc";

export default function InvoiceModal({
  isOpen,
  onClose,
  userId,
}: InvoiceModalProps) {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<InvoiceDto>>({});
  const [lineItemsModalOpen, setLineItemsModalOpen] = useState(false);
  const [selectedInvoiceForLineItems, setSelectedInvoiceForLineItems] =
    useState<InvoiceDto | null>(null);
  const [sortField, setSortField] = useState<SortField>("invoiceDueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchInvoices = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/invoice?id=${userId}&searchType=${SearchType.USER_ID}`
      );
      if (!response.ok) throw new Error("Failed to fetch invoices");

      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen, fetchInvoices]);

  const validateCurrency = (value: string): boolean => {
    const currencyRegex = /^[\$£€¥₹₽¢₩₪₨₦₡₱₫₭₮₯₲₹₴₵₶₷₸₹₺₻₼₽₾₿]?\d*\.?\d*$/;
    return currencyRegex.test(value.trim());
  };

  const sortInvoices = (invoices: InvoiceDto[]): InvoiceDto[] => {
    return [...invoices].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "vendorName":
          aValue = a.vendorName.toLowerCase();
          bValue = b.vendorName.toLowerCase();
          break;
        case "invoiceAmount":
          aValue = parseFloat(a.invoiceAmount.replace(/[^\d.-]/g, "")) || 0;
          bValue = parseFloat(b.invoiceAmount.replace(/[^\d.-]/g, "")) || 0;
          break;
        case "invoiceDueDate":
          aValue = new Date(a.invoiceDueDate).getTime();
          bValue = new Date(b.invoiceDueDate).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const startEditing = (invoice: InvoiceDto) => {
    setEditingId(invoice.id!);
    setEditingData({
      id: invoice.id,
      customerName: invoice.customerName,
      vendorName: invoice.vendorName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      invoiceDueDate: invoice.invoiceDueDate,
      invoiceAmount: invoice.invoiceAmount,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveInvoice = async () => {
    if (!editingId || !editingData) return;

    // Validation
    if (!editingData.customerName?.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!editingData.vendorName?.trim()) {
      toast.error("Vendor name is required");
      return;
    }
    if (!editingData.invoiceNumber?.trim()) {
      toast.error("Invoice number is required");
      return;
    }
    if (
      !editingData.invoiceAmount ||
      !validateCurrency(editingData.invoiceAmount)
    ) {
      toast.error("Invalid invoice amount format");
      return;
    }

    try {
      const updateData: UpdateInvoiceDto = {
        id: editingId,
        customerName: editingData.customerName,
        vendorName: editingData.vendorName,
        invoiceNumber: editingData.invoiceNumber,
        invoiceDate: editingData.invoiceDate,
        invoiceDueDate: editingData.invoiceDueDate,
        invoiceAmount: editingData.invoiceAmount,
      };

      const response = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error("Failed to update invoice");

      await fetchInvoices();
      cancelEditing();
      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast.error("Failed to save changes");
    }
  };

  const deleteInvoice = async (invoice: InvoiceDto) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete invoice #${invoice.invoiceNumber} from ${invoice.vendorName}?`
    );

    if (!confirmed) return;

    const deleteChat = window.confirm(
      "Do you also want to delete the chat conversation linked to this invoice?"
    );

    try {
      const response = await fetch(`/api/invoice/${invoice.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteChat }),
      });

      if (!response.ok) throw new Error("Failed to delete invoice");

      await fetchInvoices();
      toast.success("Invoice deleted successfully");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const handleLineItemsEdit = (invoice: InvoiceDto) => {
    setSelectedInvoiceForLineItems(invoice);
    setLineItemsModalOpen(true);
  };

  const saveLineItems = async (lineItems: any[]) => {
    if (!selectedInvoiceForLineItems) return;

    const updateData: UpdateInvoiceDto = {
      id: selectedInvoiceForLineItems.id!,
      lineItems: lineItems,
    };

    const response = await fetch("/api/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) throw new Error("Failed to update line items");

    await fetchInvoices();
  };

  const sortedInvoices = sortInvoices(invoices);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
        <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Invoice Management</h2>
            <Button variant="outline" onClick={onClose}>
              ×
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-500">Loading invoices...</div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="border p-2 text-left">Customer</th>
                    <th
                      className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("vendorName")}
                    >
                      Vendor{" "}
                      {sortField === "vendorName" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="border p-2 text-left">Invoice #</th>
                    <th className="border p-2 text-left">Date</th>
                    <th
                      className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("invoiceDueDate")}
                    >
                      Due Date{" "}
                      {sortField === "invoiceDueDate" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("invoiceAmount")}
                    >
                      Amount{" "}
                      {sortField === "invoiceAmount" &&
                        (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="border p-2 text-center">Line Items</th>
                    <th className="border p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((invoice) => {
                    const isEditing = editingId === invoice.id;

                    return (
                      <tr
                        key={invoice.id}
                        className={`hover:bg-gray-50 ${
                          isEditing ? "bg-blue-50" : ""
                        }`}
                        onClick={() => !isEditing && startEditing(invoice)}
                      >
                        <td className="border p-2">
                          {isEditing ? (
                            <Input
                              value={editingData.customerName || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  customerName: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            invoice.customerName
                          )}
                        </td>
                        <td className="border p-2">
                          {isEditing ? (
                            <Input
                              value={editingData.vendorName || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  vendorName: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            invoice.vendorName
                          )}
                        </td>
                        <td className="border p-2">
                          {isEditing ? (
                            <Input
                              value={editingData.invoiceNumber || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  invoiceNumber: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            invoice.invoiceNumber
                          )}
                        </td>
                        <td className="border p-2">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editingData.invoiceDate || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  invoiceDate: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            invoice.invoiceDate
                          )}
                        </td>
                        <td className="border p-2">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editingData.invoiceDueDate || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  invoiceDueDate: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            invoice.invoiceDueDate
                          )}
                        </td>
                        <td className="border p-2">
                          {isEditing ? (
                            <Input
                              value={editingData.invoiceAmount || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  invoiceAmount: e.target.value,
                                })
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder="$0.00"
                            />
                          ) : (
                            invoice.invoiceAmount
                          )}
                        </td>
                        <td className="border p-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLineItemsEdit(invoice);
                            }}
                          >
                            <PencilEditIcon size={14} />
                          </Button>
                        </td>
                        <td className="border p-2 text-center">
                          {isEditing ? (
                            <div className="space-x-1">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveInvoice();
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditing();
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteInvoice(invoice);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon size={14} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {sortedInvoices.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No invoices found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <LineItemsModal
        isOpen={lineItemsModalOpen}
        onClose={() => {
          setLineItemsModalOpen(false);
          setSelectedInvoiceForLineItems(null);
        }}
        lineItems={selectedInvoiceForLineItems?.lineItems || []}
        onSave={saveLineItems}
        invoiceNumber={selectedInvoiceForLineItems?.invoiceNumber || ""}
      />
    </>
  );
}
