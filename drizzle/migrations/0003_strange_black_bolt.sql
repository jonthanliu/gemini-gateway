CREATE TABLE `model_mappings` (
	`id` integer PRIMARY KEY NOT NULL,
	`source_name` text NOT NULL,
	`source_protocol` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`target_name` text NOT NULL,
	`target_provider` text DEFAULT 'gemini' NOT NULL,
	`target_method` text DEFAULT 'generateContent' NOT NULL,
	`capabilities` text,
	`constraints` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
