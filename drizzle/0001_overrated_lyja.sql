ALTER TABLE "transactions" RENAME TO "Transactions";--> statement-breakpoint
ALTER TABLE "Transactions" DROP CONSTRAINT "transactions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "collector_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "collector_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "collected_Wastes" ALTER COLUMN "collector_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "Transactions" ADD COLUMN "report_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Transactions" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_unique" UNIQUE("user_id");