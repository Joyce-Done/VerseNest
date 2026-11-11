CREATE TABLE `parent_consent_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`opted_in` integer NOT NULL,
	`consent_text` text NOT NULL,
	`consent_version` text NOT NULL,
	`recorded_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `parent_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`marketing_opt_in` integer DEFAULT 0 NOT NULL,
	`consent_at` text,
	`consent_version` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
