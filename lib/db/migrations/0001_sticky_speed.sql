PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Tokens` (
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
	`modelUsed` text
);
--> statement-breakpoint
INSERT INTO `__new_Tokens`("id", "createdAt", "invoiceId", "userId", "operationType", "inputTokens", "outputTokens", "totalTokens", "cost", "costUnit", "modelUsed") SELECT "id", "createdAt", "invoiceId", "userId", "operationType", "inputTokens", "outputTokens", "totalTokens", "cost", "costUnit", "modelUsed" FROM `Tokens`;--> statement-breakpoint
DROP TABLE `Tokens`;--> statement-breakpoint
ALTER TABLE `__new_Tokens` RENAME TO `Tokens`;--> statement-breakpoint
PRAGMA foreign_keys=ON;