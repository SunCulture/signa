import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1782003122795 implements MigrationInterface {
    name = 'AutoMigration1782003122795'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email_events" ("id" BIGSERIAL NOT NULL, "account_id" bigint, "email_message_id" bigint, "email" character varying(255) NOT NULL, "event_type" character varying(64) NOT NULL, "event_datetime" TIMESTAMP WITH TIME ZONE NOT NULL, "message_id" character varying(255), "emailable_type" character varying(255), "emailable_id" bigint, "data" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2ab38c98c3ca9385eff428134c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0694542cca319d93e8d939fae6" ON "email_events"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e8f189ab5f9d6f4f945c87f1cc" ON "email_events"  ("email_message_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2a8b011038128792e0b4bb7a89" ON "email_events"  ("account_id", "id") `);
        await queryRunner.query(`CREATE TABLE "email_messages" ("id" BIGSERIAL NOT NULL, "account_id" bigint, "message_id" character varying(255), "template" character varying(255) NOT NULL, "subject" character varying(255) NOT NULL, "recipients" text NOT NULL, "sender" text, "sha1" character varying(64) NOT NULL, "status" character varying(32) NOT NULL, "data" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_922cad79d5a315f5d1d06b077da" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ce6eb98c9bdb1ca1af920e624b" ON "email_messages"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e113e91097b900f875587b6b08" ON "email_messages"  ("message_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_504a0155a80c80ed49da3e2013" ON "email_messages"  ("account_id", "id") `);
        await queryRunner.query(`ALTER TABLE "access_tokens" ALTER COLUMN "permissions" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "access_tokens" ALTER COLUMN "permissions" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_504a0155a80c80ed49da3e2013"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e113e91097b900f875587b6b08"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce6eb98c9bdb1ca1af920e624b"`);
        await queryRunner.query(`DROP TABLE "email_messages"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2a8b011038128792e0b4bb7a89"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8f189ab5f9d6f4f945c87f1cc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0694542cca319d93e8d939fae6"`);
        await queryRunner.query(`DROP TABLE "email_events"`);
    }

}
