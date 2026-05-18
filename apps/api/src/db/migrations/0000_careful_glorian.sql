CREATE TABLE `contributors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`original_script` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contributors_normalized_name` ON `contributors` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`field_name` text NOT NULL,
	`old_value` text,
	`new_value` text NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE TABLE `covers` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`source` text NOT NULL,
	`remote_url` text,
	`local_url` text,
	`width` integer,
	`height` integer,
	`license` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_covers_edition` ON `covers` (`edition_id`);--> statement-breakpoint
CREATE TABLE `edition_contributors` (
	`edition_id` text NOT NULL,
	`contributor_id` text NOT NULL,
	`role` text DEFAULT 'author' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`edition_id`, `contributor_id`, `role`),
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contributor_id`) REFERENCES `contributors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_edition_contributors_edition` ON `edition_contributors` (`edition_id`);--> statement-breakpoint
CREATE TABLE `editions` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text,
	`title` text NOT NULL,
	`normalized_title` text NOT NULL,
	`subtitle` text,
	`publisher` text,
	`published_date` text,
	`isbn10` text,
	`isbn13` text,
	`page_count` integer,
	`language` text,
	`cover_url` text,
	`description` text,
	`confidence` integer DEFAULT 0 NOT NULL,
	`needs_review` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_editions_isbn13` ON `editions` (`isbn13`) WHERE "editions"."isbn13" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_editions_isbn10` ON `editions` (`isbn10`) WHERE "editions"."isbn10" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_editions_normalized_title` ON `editions` (`normalized_title`);--> statement-breakpoint
CREATE INDEX `idx_editions_work_id` ON `editions` (`work_id`);--> statement-breakpoint
CREATE TABLE `external_identifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text,
	`work_id` text,
	`source` text NOT NULL,
	`identifier_type` text NOT NULL,
	`identifier_value` text NOT NULL,
	`external_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_external_identifiers` ON `external_identifiers` (`source`,`identifier_type`,`identifier_value`);--> statement-breakpoint
CREATE INDEX `idx_external_identifiers_edition` ON `external_identifiers` (`edition_id`);--> statement-breakpoint
CREATE TABLE `provider_health` (
	`name` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`circuit_state` text DEFAULT 'closed' NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`opened_at` text,
	`next_retry_at` text,
	`last_success_at` text,
	`last_error_at` text,
	`last_error_message` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`query_type` text NOT NULL,
	`result_json` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_search_cache_expires_at` ON `search_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `source_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`query` text NOT NULL,
	`query_type` text NOT NULL,
	`response_json` text NOT NULL,
	`fetched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_source_snapshots_source` ON `source_snapshots` (`source`);--> statement-breakpoint
CREATE INDEX `idx_source_snapshots_query` ON `source_snapshots` (`query`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_title` text NOT NULL,
	`normalized_title` text NOT NULL,
	`subtitle` text,
	`description` text,
	`language` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_works_normalized_title` ON `works` (`normalized_title`);