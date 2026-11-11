CREATE TABLE `family_documents` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_history` (
	`owner_id` text NOT NULL,
	`revision` integer NOT NULL,
	`content` text NOT NULL,
	`saved_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `revision`)
);
