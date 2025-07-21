CREATE TABLE `LineItems` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceId` text NOT NULL,
	`itemName` text NOT NULL,
	`itemQuantity` text NOT NULL,
	`itemPrice` text NOT NULL,
	`itemTotal` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`userId` text NOT NULL,
	`customerName` text NOT NULL,
	`vendorName` text NOT NULL,
	`invoiceNumber` text NOT NULL,
	`invoiceDate` text NOT NULL,
	`invoiceDueDate` text NOT NULL,
	`invoiceAmount` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_Invoices`("id", "createdAt", "userId", "customerName", "vendorName", "invoiceNumber", "invoiceDate", "invoiceDueDate", "invoiceAmount") SELECT "id", "createdAt", "userId", "customerName", "vendorName", "invoiceNumber", "invoiceDate", "invoiceDueDate", "invoiceAmount" FROM `Invoices`;--> statement-breakpoint
DROP TABLE `Invoices`;--> statement-breakpoint
ALTER TABLE `__new_Invoices` RENAME TO `Invoices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;