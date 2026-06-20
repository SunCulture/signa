import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781918194014 implements MigrationInterface {
    name = 'AutoMigration1781918194014'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "completed_documents" ("id" BIGSERIAL NOT NULL, "sha256" character varying(255) NOT NULL, "submitter_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5ffefb7f5135eb2ba02e2d55ecf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_07d4621f217ad8fb0bd422bf79" ON "completed_documents"  ("sha256") `);
        await queryRunner.query(`CREATE INDEX "IDX_ca0ee27519faa4a7c1dd70f796" ON "completed_documents"  ("submitter_id") `);
        await queryRunner.query(`CREATE TABLE "completed_submitters" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "submission_id" bigint NOT NULL, "submitter_id" bigint NOT NULL, "template_id" bigint, "completed_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_first" boolean, "sms_count" integer NOT NULL DEFAULT '0', "source" character varying(255) NOT NULL, "verification_method" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ba3dcee350b7bb7b56ce5221f05" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_80e3e1ff3bbffdff2aa0d989d7" ON "completed_submitters"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_807ef8b58bd07f5af8ec27593b" ON "completed_submitters"  ("submission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_95c26537bd552a16e9d4f0f6fc" ON "completed_submitters"  ("template_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3b2df60176504de231a5099871" ON "completed_submitters"  ("submitter_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b3872e40244d864f37525c7b86" ON "completed_submitters"  ("account_id", "completed_at") `);
        await queryRunner.query(`CREATE TABLE "document_generation_events" ("id" BIGSERIAL NOT NULL, "submitter_id" bigint NOT NULL, "event_name" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0e85971153a8596ba8b81856c92" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9cc6c449a88abf7f49f68975ba" ON "document_generation_events"  ("submitter_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_42d4693952479bb4cb7b2e1491" ON "document_generation_events"  ("submitter_id", "event_name") `);
        await queryRunner.query(`ALTER TABLE "completed_documents" ADD CONSTRAINT "FK_ca0ee27519faa4a7c1dd70f7969" FOREIGN KEY ("submitter_id") REFERENCES "submitters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "completed_submitters" ADD CONSTRAINT "FK_80e3e1ff3bbffdff2aa0d989d7c" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "completed_submitters" ADD CONSTRAINT "FK_807ef8b58bd07f5af8ec27593b2" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "completed_submitters" ADD CONSTRAINT "FK_3b2df60176504de231a50998711" FOREIGN KEY ("submitter_id") REFERENCES "submitters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "completed_submitters" ADD CONSTRAINT "FK_95c26537bd552a16e9d4f0f6fcc" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_generation_events" ADD CONSTRAINT "FK_9cc6c449a88abf7f49f68975ba0" FOREIGN KEY ("submitter_id") REFERENCES "submitters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_generation_events" DROP CONSTRAINT "FK_9cc6c449a88abf7f49f68975ba0"`);
        await queryRunner.query(`ALTER TABLE "completed_submitters" DROP CONSTRAINT "FK_95c26537bd552a16e9d4f0f6fcc"`);
        await queryRunner.query(`ALTER TABLE "completed_submitters" DROP CONSTRAINT "FK_3b2df60176504de231a50998711"`);
        await queryRunner.query(`ALTER TABLE "completed_submitters" DROP CONSTRAINT "FK_807ef8b58bd07f5af8ec27593b2"`);
        await queryRunner.query(`ALTER TABLE "completed_submitters" DROP CONSTRAINT "FK_80e3e1ff3bbffdff2aa0d989d7c"`);
        await queryRunner.query(`ALTER TABLE "completed_documents" DROP CONSTRAINT "FK_ca0ee27519faa4a7c1dd70f7969"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_42d4693952479bb4cb7b2e1491"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9cc6c449a88abf7f49f68975ba"`);
        await queryRunner.query(`DROP TABLE "document_generation_events"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3872e40244d864f37525c7b86"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3b2df60176504de231a5099871"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95c26537bd552a16e9d4f0f6fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_807ef8b58bd07f5af8ec27593b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_80e3e1ff3bbffdff2aa0d989d7"`);
        await queryRunner.query(`DROP TABLE "completed_submitters"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ca0ee27519faa4a7c1dd70f796"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07d4621f217ad8fb0bd422bf79"`);
        await queryRunner.query(`DROP TABLE "completed_documents"`);
    }

}
