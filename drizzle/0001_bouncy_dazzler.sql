ALTER TABLE `contact_messages` ADD `status` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `reading_time` text DEFAULT '5 menit' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `year` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `role` text NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `category` text NOT NULL;