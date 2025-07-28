ALTER TABLE "rewards" DROP CONSTRAINT "rewards_user_id_unique";--> statement-breakpoint
ALTER TABLE "Transactions" ALTER COLUMN "report_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Transactions" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;