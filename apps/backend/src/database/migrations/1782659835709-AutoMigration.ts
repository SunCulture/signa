import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1782659835709 implements MigrationInterface {
    name = 'AutoMigration1782659835709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "identity_verifications" ("id" SERIAL NOT NULL, "account_id" integer NOT NULL, "submission_id" integer NOT NULL, "submitter_id" integer NOT NULL, "field_uuid" character varying(255) NOT NULL, "status" character varying(64) NOT NULL DEFAULT 'pending', "provider" character varying(64), "method" character varying(64) NOT NULL DEFAULT 'kba', "provider_reference" character varying(255), "data" text NOT NULL, "verified_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_42a93e679bc1d9568b6e80ea080" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d74ad26a33eccc63252b127341" ON "identity_verifications"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_00b09e403de257d2d482aa3672" ON "identity_verifications"  ("submission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f0ad6a0349cd5cd2151c6bbdda" ON "identity_verifications"  ("submitter_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_25e0a16883885f7dc522ee8dae" ON "identity_verifications"  ("submitter_id", "field_uuid") `);
        await queryRunner.query(`CREATE INDEX "IDX_23703fd9cf47fd5135768c5551" ON "identity_verifications"  ("account_id", "submission_id") `);
        await queryRunner.query(`CREATE TABLE "payment_attempts" ("id" SERIAL NOT NULL, "account_id" integer NOT NULL, "submission_id" integer NOT NULL, "submitter_id" integer NOT NULL, "field_uuid" character varying(255) NOT NULL, "status" character varying(64) NOT NULL DEFAULT 'requires_provider', "provider" character varying(64), "provider_reference" character varying(255), "amount" integer, "currency" character varying(16), "data" text NOT NULL, "completed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a0d8a67c07a0fef98dfd20214e5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5ebe3308beb697ea3f1ab301ab" ON "payment_attempts"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3e584a231b0d1f512464a5bea4" ON "payment_attempts"  ("submission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6662eca994487ae8b16a295dc8" ON "payment_attempts"  ("submitter_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e04d08acfd16e1e36e058af9d7" ON "payment_attempts"  ("submitter_id", "field_uuid") `);
        await queryRunner.query(`CREATE INDEX "IDX_9b0684f7e226a5d837ffa3bac8" ON "payment_attempts"  ("account_id", "submission_id") `);
        await queryRunner.query(`ALTER TABLE "access_tokens" ADD "team_id" bigint`);
        await queryRunner.query(`CREATE INDEX "IDX_ddc3423510ac08437a0bcc43da" ON "access_tokens"  ("team_id") `);
        await queryRunner.query(`ALTER TABLE "identity_verifications" ADD CONSTRAINT "FK_d74ad26a33eccc63252b1273411" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" ADD CONSTRAINT "FK_00b09e403de257d2d482aa3672a" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" ADD CONSTRAINT "FK_f0ad6a0349cd5cd2151c6bbddad" FOREIGN KEY ("submitter_id") REFERENCES "submitters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_attempts" ADD CONSTRAINT "FK_5ebe3308beb697ea3f1ab301ab7" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_attempts" ADD CONSTRAINT "FK_3e584a231b0d1f512464a5bea4c" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_attempts" ADD CONSTRAINT "FK_6662eca994487ae8b16a295dc85" FOREIGN KEY ("submitter_id") REFERENCES "submitters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_attempts" DROP CONSTRAINT "FK_6662eca994487ae8b16a295dc85"`);
        await queryRunner.query(`ALTER TABLE "payment_attempts" DROP CONSTRAINT "FK_3e584a231b0d1f512464a5bea4c"`);
        await queryRunner.query(`ALTER TABLE "payment_attempts" DROP CONSTRAINT "FK_5ebe3308beb697ea3f1ab301ab7"`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" DROP CONSTRAINT "FK_f0ad6a0349cd5cd2151c6bbddad"`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" DROP CONSTRAINT "FK_00b09e403de257d2d482aa3672a"`);
        await queryRunner.query(`ALTER TABLE "identity_verifications" DROP CONSTRAINT "FK_d74ad26a33eccc63252b1273411"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ddc3423510ac08437a0bcc43da"`);
        await queryRunner.query(`ALTER TABLE "access_tokens" DROP COLUMN "team_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9b0684f7e226a5d837ffa3bac8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e04d08acfd16e1e36e058af9d7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6662eca994487ae8b16a295dc8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3e584a231b0d1f512464a5bea4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5ebe3308beb697ea3f1ab301ab"`);
        await queryRunner.query(`DROP TABLE "payment_attempts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23703fd9cf47fd5135768c5551"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_25e0a16883885f7dc522ee8dae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f0ad6a0349cd5cd2151c6bbdda"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_00b09e403de257d2d482aa3672"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d74ad26a33eccc63252b127341"`);
        await queryRunner.query(`DROP TABLE "identity_verifications"`);
    }

}
