import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1783287631566 implements MigrationInterface {
    name = 'AutoMigration1783287631566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pdf_trust_roots" ("id" character varying(36) NOT NULL, "account_id" bigint NOT NULL, "name" character varying(255) NOT NULL, "certificate_der_base64" text NOT NULL, "fingerprint_sha256" character varying(64) NOT NULL, "subject" text NOT NULL, "issuer" text NOT NULL, "serial_number" character varying(128) NOT NULL, "valid_from" TIMESTAMP NOT NULL, "valid_to" TIMESTAMP NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f34a5d71febaacedbcd77aa87ec" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2e6f070f19e46aaf757fc74b44" ON "pdf_trust_roots"  ("account_id", "fingerprint_sha256") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2e6f070f19e46aaf757fc74b44"`);
        await queryRunner.query(`DROP TABLE "pdf_trust_roots"`);
    }

}
