CREATE TABLE `ApiKey` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')),
	`lastUsed` integer,
	`lastChecked` integer,
	`failCount` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ApiKey_key_unique` ON `ApiKey` (`key`);--> statement-breakpoint
CREATE TABLE `ErrorLog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`apiKey` text,
	`errorType` text NOT NULL,
	`errorMessage` text NOT NULL,
	`errorDetails` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `RequestLog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`apiKey` text NOT NULL,
	`model` text NOT NULL,
	`statusCode` integer NOT NULL,
	`isSuccess` integer NOT NULL,
	`latency` real NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `Setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
