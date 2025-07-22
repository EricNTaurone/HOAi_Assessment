PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `Tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`invoiceId` text NOT NULL,
	`userId` text NOT NULL,
	`operationType` text DEFAULT 'EXTRACTION',
	`inputTokens` integer,
	`outputTokens` integer,
	`totalTokens` integer,
	`cost` real,
	`costUnit` text DEFAULT 'USD',
	`modelUsed` text,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `Invoices`(`userId`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=ON;