"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "@/components/icons";
import InvoiceModal from "@/components/invoice-modal";
import TokenUsageModal from "@/components/token-usage-modal";

interface ChatHeaderMenuProps {
  userId?: string;
}

export function ChatHeaderMenu({ userId }: ChatHeaderMenuProps) {
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isTokenUsageModalOpen, setIsTokenUsageModalOpen] = useState(false);

  return (
    <>
      <div className="absolute top-4 right-4 z-30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="bg-white shadow-sm">
              <MoreHorizontalIcon size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => setIsInvoiceModalOpen(true)}
              disabled={!userId}
            >
              Manage Invoices
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsTokenUsageModalOpen(true)}
              disabled={!userId}
            >
              Token Usage Analytics
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {userId && (
        <>
          <InvoiceModal
            isOpen={isInvoiceModalOpen}
            onClose={() => setIsInvoiceModalOpen(false)}
            userId={userId}
          />
          <TokenUsageModal
            isOpen={isTokenUsageModalOpen}
            onClose={() => setIsTokenUsageModalOpen(false)}
            userId={userId}
          />
        </>
      )}
    </>
  );
}
