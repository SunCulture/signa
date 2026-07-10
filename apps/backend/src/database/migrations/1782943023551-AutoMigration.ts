import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1782943023551 implements MigrationInterface {
    name = 'AutoMigration1782943023551'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pdf_revocation_evidence" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "account_id" bigint NOT NULL, "certificate_sha256" character varying(64) NOT NULL, "issuer_hash" character varying(128) NOT NULL, "serial_number" character varying(128) NOT NULL, "evidence_type" character varying(16) NOT NULL, "status" character varying(32) NOT NULL, "url" text, "data_base64" text, "this_update" TIMESTAMP, "next_update" TIMESTAMP, "checked_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_61c3c027e7fd227b8e95f92d1fa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_26b53c6f1a8890229f00e4f65a" ON "pdf_revocation_evidence"  ("account_id", "certificate_sha256", "evidence_type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_26b53c6f1a8890229f00e4f65a"`);
        await queryRunner.query(`DROP TABLE "pdf_revocation_evidence"`);
    }

}
