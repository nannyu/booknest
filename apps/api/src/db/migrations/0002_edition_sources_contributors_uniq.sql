CREATE TABLE `edition_sources` (
	`edition_id` text NOT NULL,
	`source` text NOT NULL,
	`external_id` text,
	`external_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`edition_id`, `source`),
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_edition_sources_edition` ON `edition_sources` (`edition_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_contributors_normalized_name` ON `contributors` (`normalized_name`);--> statement-breakpoint
DELETE FROM `external_identifiers` WHERE `identifier_type` = 'source';
