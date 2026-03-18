CREATE TABLE "slack_user_installations" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"slack_user_id" text NOT NULL,
	"user_token" text,
	"user_refresh_token" text,
	"user_token_expires_at" timestamp,
	"user_scopes" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" text,
	"team_name" text,
	"enterprise_id" text,
	"enterprise_name" text,
	"enterprise_url" text,
	"is_enterprise_install" boolean DEFAULT false NOT NULL,
	"app_id" text,
	"bot_user_id" text,
	"bot_token" text,
	"bot_refresh_token" text,
	"bot_token_expires_at" timestamp,
	"bot_scopes" text[],
	"incoming_webhook_url" text,
	"incoming_webhook_channel" text,
	"incoming_webhook_channel_id" text,
	"incoming_webhook_config_url" text,
	"auth_version" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slack_user_installations" ADD CONSTRAINT "slack_user_installations_workspace_id_slack_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."slack_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_user_idx" ON "slack_user_installations" USING btree ("workspace_id","slack_user_id");