"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrashIcon } from "@/components/icons";
import { LineItem } from "@/lib/types/invoice.dto";
import { parseNumber, validateCurrency } from "@/lib/utils/number-parsing";
import { toast } from "sonner";

interface LineItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineItems: LineItem[];
  onSave: (lineItems: LineItem[]) => void;
  invoiceNumber: string;
}

export function LineItemsModal({
  isOpen,
  onClose,
  lineItems,
  onSave,
  invoiceNumber,
}: LineItemsModalProps) {
  const [items, setItems] = useState<LineItem[]>(lineItems || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setItems(lineItems || []);
  }, [lineItems]);

  const addNewItem = () => {
    setItems([
      ...items,
      {
        itemName: "",
        itemQuantity: "1",
        itemPrice: "0.00",
        itemTotal: "0.00",
      },
    ]);
  };

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total when quantity or price changes
    if (field === "itemQuantity" || field === "itemPrice") {
      const quantity = parseNumber(
        field === "itemQuantity" ? value : newItems[index].itemQuantity
      );
      const price = parseNumber(
        field === "itemPrice" ? value : newItems[index].itemPrice
      );
      newItems[index].itemTotal = (quantity * price).toFixed(2);
    }

    setItems(newItems);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName.trim()) {
        toast.error(`Item ${i + 1}: Item name is required`);
        return;
      }
      if (!validateCurrency(item.itemPrice)) {
        toast.error(`Item ${i + 1}: Invalid price format`);
        return;
      }
      if (!item.itemQuantity || isNaN(parseFloat(item.itemQuantity))) {
        toast.error(`Item ${i + 1}: Invalid quantity`);
        return;
      }
    }

    setIsLoading(true);
    try {
      await onSave(items);
      toast.success("Line items updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update line items");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Edit Line Items - Invoice #{invoiceNumber}
          </h2>
          <Button variant="outline" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-6 gap-4 p-4 border rounded-lg"
            >
              <div className="col-span-2">
                <Label htmlFor={`item-name-${index}`}>Item Name</Label>
                <Input
                  id={`item-name-${index}`}
                  value={item.itemName}
                  onChange={(e) =>
                    updateItem(index, "itemName", e.target.value)
                  }
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <Label htmlFor={`item-quantity-${index}`}>Quantity</Label>
                <Input
                  id={`item-quantity-${index}`}
                  value={item.itemQuantity}
                  onChange={(e) =>
                    updateItem(index, "itemQuantity", e.target.value)
                  }
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor={`item-price-${index}`}>Price</Label>
                <Input
                  id={`item-price-${index}`}
                  value={item.itemPrice}
                  onChange={(e) =>
                    updateItem(index, "itemPrice", e.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor={`item-total-${index}`}>Total</Label>
                <Input
                  id={`item-total-${index}`}
                  value={item.itemTotal}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon size={16} />
                </Button>
              </div>
            </div>
          ))}

          <Button onClick={addNewItem} variant="outline" className="w-full">
            Add New Item
          </Button>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
