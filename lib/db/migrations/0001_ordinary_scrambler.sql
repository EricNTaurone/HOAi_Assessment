CREATE TABLE `Invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`userId` text NOT NULL,
	`customerName` text NOT NULL,
	`vendorName` text NOT NULL,
	`invoiceNumber` text NOT NULL,
	`invoiceDate` text NOT NULL,
	`invoiceDueDate` text NOT NULL,
	`invoiceAmount` numeric NOT NULL,
	`lineItems` text
);
--> statement-breakpoint
CREATE TABLE `Tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`invoiceId` text NOT NULL,
	`operationType` text DEFAULT 'EXTRACTION' NOT NULL,
	`inputTokens` integer,
	`outputTokens` integer,
	`totalTokens` integer,
	`cost` numeric,
	`costUnit` text DEFAULT 'USD',
	`modelUsed` text,
	`cachedTokens` integer DEFAULT 0,
	FOREIGN KEY (`invoiceId`) REFERENCES `Invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `PromptCache` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`promptHash` text NOT NULL,
	`cachedResponse` text NOT NULL,
	`tokensSaved` integer DEFAULT 0 NOT NULL,
	`cacheHits` integer DEFAULT 0 NOT NULL,
	`ttl` integer DEFAULT 300000
);
--> statement-breakpoint
ALTER TABLE `Document` ADD `userId` text;--> statement-breakpoint
ALTER TABLE `Suggestion` ADD `userId` text;