CREATE TABLE `Chat` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`title` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Document` (
	`id` text NOT NULL,
	`userId` text,
	`createdAt` integer NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`kind` text DEFAULT 'text' NOT NULL,
	PRIMARY KEY(`id`, `createdAt`)
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`id` text PRIMARY KEY NOT NULL,
	`chatId` text NOT NULL,
	`role` text NOT NULL,
	`content` blob NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Suggestion` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`documentId` text NOT NULL,
	`documentCreatedAt` integer NOT NULL,
	`originalText` text NOT NULL,
	`suggestedText` text NOT NULL,
	`description` text,
	`isResolved` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`documentId`,`documentCreatedAt`) REFERENCES `Document`(`id`,`createdAt`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Vote` (
	`chatId` text NOT NULL,
	`messageId` text NOT NULL,
	`isUpvoted` integer NOT NULL,
	PRIMARY KEY(`chatId`, `messageId`),
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `Invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`userId` text NOT NULL,
	`chatId` text NOT NULL,
	`customerName` text NOT NULL,
	`vendorName` text NOT NULL,
	`invoiceNumber` text NOT NULL,
	`invoiceDate` text NOT NULL,
	`invoiceDueDate` text NOT NULL,
	`invoiceAmount` text NOT NULL,
	FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE TABLE `PromptCache` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`promptHash` text NOT NULL,
	`cachedResponse` text NOT NULL,
	`tokensSaved` integer DEFAULT 0 NOT NULL,
	`cacheHits` integer DEFAULT 0 NOT NULL,
	`ttl` integer DEFAULT 300000
);
