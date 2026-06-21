import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781957563719 implements MigrationInterface {
    name = 'AutoMigration1781957563719'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "webhook_urls" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "url" text NOT NULL, "events" jsonb NOT NULL DEFAULT '[]'::jsonb, "secret" jsonb NOT NULL DEFAULT '{}'::jsonb, "hmac_secret" text NOT NULL, "sha1" character varying(64) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ee1651abfefd2cd3232e00e2038" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_086cba8b4d25da5c05509649c3" ON "webhook_urls"  ("sha1") `);
        await queryRunner.query(`CREATE INDEX "IDX_6e3c88a8347eaab272f320e014" ON "webhook_urls"  ("account_id") `);
        await queryRunner.query(`CREATE TABLE "webhook_events" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "webhook_url_id" bigint NOT NULL, "uuid" character varying(255) NOT NULL, "event_type" character varying(255) NOT NULL, "record_type" character varying(255) NOT NULL, "record_id" bigint NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'pending', "payload" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4cba37e6a0acb5e1fc49c34ebfd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_eac7925bcd823c210448e216ce" ON "webhook_events"  ("account_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f7b459a4f06d219515a2c199fb" ON "webhook_events"  ("webhook_url_id", "uuid") `);
        await queryRunner.query(`CREATE INDEX "IDX_86e08b23776986412c9fb95474" ON "webhook_events"  ("webhook_url_id", "id") `);
        await queryRunner.query(`CREATE TABLE "webhook_attempts" ("id" BIGSERIAL NOT NULL, "webhook_event_id" bigint NOT NULL, "attempt" integer NOT NULL DEFAULT '0', "response_status_code" integer NOT NULL DEFAULT '0', "response_body" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2de7e7887ad97de459adab62638" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f3c2436d0edc9198e43d031216" ON "webhook_attempts"  ("webhook_event_id", "id") `);
        await queryRunner.query(`ALTER TABLE "teams" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "webhook_events" ADD CONSTRAINT "FK_8685e9e0a734ee268da2766310d" FOREIGN KEY ("webhook_url_id") REFERENCES "webhook_urls"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "webhook_attempts" ADD CONSTRAINT "FK_4aa8f1561f82f2f9736b9ee185e" FOREIGN KEY ("webhook_event_id") REFERENCES "webhook_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "webhook_attempts" DROP CONSTRAINT "FK_4aa8f1561f82f2f9736b9ee185e"`);
        await queryRunner.query(`ALTER TABLE "webhook_events" DROP CONSTRAINT "FK_8685e9e0a734ee268da2766310d"`);
        await queryRunner.query(`ALTER TABLE "teams" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f3c2436d0edc9198e43d031216"`);
        await queryRunner.query(`DROP TABLE "webhook_attempts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_86e08b23776986412c9fb95474"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f7b459a4f06d219515a2c199fb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eac7925bcd823c210448e216ce"`);
        await queryRunner.query(`DROP TABLE "webhook_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6e3c88a8347eaab272f320e014"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_086cba8b4d25da5c05509649c3"`);
        await queryRunner.query(`DROP TABLE "webhook_urls"`);
    }

}
