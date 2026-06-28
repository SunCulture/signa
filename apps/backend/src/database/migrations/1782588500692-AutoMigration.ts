import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1782588500692 implements MigrationInterface {
    name = 'AutoMigration1782588500692'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "template_events" ("id" SERIAL NOT NULL, "account_id" integer NOT NULL, "template_id" integer NOT NULL, "user_id" integer, "event_type" character varying(255) NOT NULL, "summary" character varying(255) NOT NULL, "event_timestamp" TIMESTAMP NOT NULL, "data" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76a44324a3bf703cc4273de5ee1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ec8f4f033471a791da306bb689" ON "template_events"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_d1609210e4d82866ed297490c0" ON "template_events"  ("template_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_36ee22cf8e5783fb4257e90524" ON "template_events"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b9705a5e572316d82fa27efb0c" ON "template_events"  ("template_id", "event_timestamp") `);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "submission_id" bigint`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "submitter_id" bigint`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "job_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "attempt" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "last_error_message" text`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "last_error_stack" text`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "provider_response" text`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "queued_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "sent_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "skipped_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "email_messages" ADD "failed_at" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_7e0d38392d43e34be0597154d0" ON "email_messages"  ("submission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c7cdd5e82c3b2ab1142abac206" ON "email_messages"  ("submitter_id") `);
        await queryRunner.query(`ALTER TABLE "template_events" ADD CONSTRAINT "FK_ec8f4f033471a791da306bb6890" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_events" ADD CONSTRAINT "FK_d1609210e4d82866ed297490c08" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_events" ADD CONSTRAINT "FK_36ee22cf8e5783fb4257e90524a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "template_events" DROP CONSTRAINT "FK_36ee22cf8e5783fb4257e90524a"`);
        await queryRunner.query(`ALTER TABLE "template_events" DROP CONSTRAINT "FK_d1609210e4d82866ed297490c08"`);
        await queryRunner.query(`ALTER TABLE "template_events" DROP CONSTRAINT "FK_ec8f4f033471a791da306bb6890"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c7cdd5e82c3b2ab1142abac206"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e0d38392d43e34be0597154d0"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "failed_at"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "skipped_at"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "sent_at"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "queued_at"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "provider_response"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "last_error_stack"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "last_error_message"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "attempt"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "job_id"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "submitter_id"`);
        await queryRunner.query(`ALTER TABLE "email_messages" DROP COLUMN "submission_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b9705a5e572316d82fa27efb0c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_36ee22cf8e5783fb4257e90524"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d1609210e4d82866ed297490c0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ec8f4f033471a791da306bb689"`);
        await queryRunner.query(`DROP TABLE "template_events"`);
    }

}
