CREATE TABLE "buyers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(10) NOT NULL,
	"phone" varchar(20),
	"waste_type" varchar(100) NOT NULL,
	"location" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"max_distance_km" integer NOT NULL,
	"preferred_waste_type" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sellers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(10) NOT NULL,
	"waste_type" varchar(100) NOT NULL,
	"location" varchar(255) NOT NULL,
	"price" varchar(50),
	"email" varchar(100),
	"phone" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_user_id_unique" UNIQUE("user_id");