import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781823590253 implements MigrationInterface {
    name = 'AutoMigration1781823590253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "submitters" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "submission_id" bigint NOT NULL, "uuid" character varying(255) NOT NULL DEFAULT gen_random_uuid()::text, "slug" character varying(255) NOT NULL DEFAULT gen_random_uuid()::text, "email" character varying(255), "name" character varying(255), "phone" character varying(255), "external_id" character varying(255), "metadata" text NOT NULL, "preferences" text NOT NULL, "values" text NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE, "opened_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "declined_at" TIMESTAMP WITH TIME ZONE, "timezone" character varying(255), "ip" character varying(255), "ua" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f0378157ea6b30df24e48896f0a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4670179ac7edf20e9feba0d9b2" ON "submitters"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_0226421ebc2e76fa1bea7c08a7" ON "submitters"  ("submission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3a498f49ba64d9fb5e444ac816" ON "submitters"  ("uuid") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0ad3be36b3f838bfdb9dba8820" ON "submitters"  ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_d76f4d7362a8a963fdb4aa7034" ON "submitters"  ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_665811172a3d5d260ace1850bb" ON "submitters"  ("external_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b3141a4d4c782d12eccb726f0b" ON "submitters"  ("account_id", "id") `);
        await queryRunner.query(`CREATE TABLE "submissions" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "created_by_user_id" bigint, "template_id" bigint, "name" text, "slug" character varying(255) NOT NULL DEFAULT gen_random_uuid()::text, "source" character varying(255) NOT NULL, "submitters_order" character varying(255) NOT NULL, "preferences" text NOT NULL, "template_fields" text, "template_schema" text, "template_submitters" text, "variables" text, "variables_schema" text, "expire_at" TIMESTAMP WITH TIME ZONE, "archived_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_10b3be95b8b2fb1e482e07d706b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cfef18c673c101a246c3c2fea6" ON "submissions"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_510e856e8dcc0627dbe6cf36a2" ON "submissions"  ("created_by_user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_08ae07e6a3a6b97c95422a47df" ON "submissions"  ("template_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_96a4fe00c00e5495d51cf6ec92" ON "submissions"  ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_2d0ab97c20643532a70dd9d254" ON "submissions"  ("account_id", "template_id", "id") `);
        await queryRunner.query(`CREATE INDEX "IDX_a4699ce06d737fb9851679932f" ON "submissions"  ("account_id", "id") `);
        await queryRunner.query(`CREATE TABLE "submission_events" ("id" BIGSERIAL NOT NULL, "account_id" bigint, "submission_id" bigint NOT NULL, "submitter_id" bigint, "event_type" character varying(255) NOT NULL, "event_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "data" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9d543c147bfdb64e11af9f09c83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_afb28ba14c29d49af7c57ca3c2" ON "submission_events"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8c2bb197e4311c469005597a87" ON "submission_events"  ("submission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_04141a98deaedc779bd751ca74" ON "submission_events"  ("submitter_id") `);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "active_storage_blobs" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "active_storage_attachments" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "templates" ALTER COLUMN "slug" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "submitters" ADD CONSTRAINT "FK_4670179ac7edf20e9feba0d9b29" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submitters" ADD CONSTRAINT "FK_0226421ebc2e76fa1bea7c08a70" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_cfef18c673c101a246c3c2fea60" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_510e856e8dcc0627dbe6cf36a2b" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submissions" ADD CONSTRAINT "FK_08ae07e6a3a6b97c95422a47dfb" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submission_events" ADD CONSTRAINT "FK_afb28ba14c29d49af7c57ca3c25" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submission_events" ADD CONSTRAINT "FK_8c2bb197e4311c469005597a877" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "submission_events" ADD CONSTRAINT "FK_04141a98deaedc779bd751ca742" FOREIGN KEY ("submitter_id") REFERENCES "submitters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "submission_events" DROP CONSTRAINT "FK_04141a98deaedc779bd751ca742"`);
        await queryRunner.query(`ALTER TABLE "submission_events" DROP CONSTRAINT "FK_8c2bb197e4311c469005597a877"`);
        await queryRunner.query(`ALTER TABLE "submission_events" DROP CONSTRAINT "FK_afb28ba14c29d49af7c57ca3c25"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_08ae07e6a3a6b97c95422a47dfb"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_510e856e8dcc0627dbe6cf36a2b"`);
        await queryRunner.query(`ALTER TABLE "submissions" DROP CONSTRAINT "FK_cfef18c673c101a246c3c2fea60"`);
        await queryRunner.query(`ALTER TABLE "submitters" DROP CONSTRAINT "FK_0226421ebc2e76fa1bea7c08a70"`);
        await queryRunner.query(`ALTER TABLE "submitters" DROP CONSTRAINT "FK_4670179ac7edf20e9feba0d9b29"`);
        await queryRunner.query(`ALTER TABLE "templates" ALTER COLUMN "slug" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "active_storage_attachments" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "active_storage_blobs" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`DROP INDEX "public"."IDX_04141a98deaedc779bd751ca74"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8c2bb197e4311c469005597a87"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_afb28ba14c29d49af7c57ca3c2"`);
        await queryRunner.query(`DROP TABLE "submission_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a4699ce06d737fb9851679932f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d0ab97c20643532a70dd9d254"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_96a4fe00c00e5495d51cf6ec92"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_08ae07e6a3a6b97c95422a47df"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_510e856e8dcc0627dbe6cf36a2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cfef18c673c101a246c3c2fea6"`);
        await queryRunner.query(`DROP TABLE "submissions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3141a4d4c782d12eccb726f0b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_665811172a3d5d260ace1850bb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d76f4d7362a8a963fdb4aa7034"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0ad3be36b3f838bfdb9dba8820"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3a498f49ba64d9fb5e444ac816"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0226421ebc2e76fa1bea7c08a7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4670179ac7edf20e9feba0d9b2"`);
        await queryRunner.query(`DROP TABLE "submitters"`);
    }

}
