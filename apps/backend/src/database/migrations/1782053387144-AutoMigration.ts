import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1782053387144 implements MigrationInterface {
    name = 'AutoMigration1782053387144'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dynamic_document_versions" ("id" BIGSERIAL NOT NULL, "dynamic_document_id" bigint NOT NULL, "sha1" character varying(255) NOT NULL, "areas" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2042df378a2827e48f4ed2c5003" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ba589cef5b425928929beab100" ON "dynamic_document_versions"  ("dynamic_document_id", "sha1") `);
        await queryRunner.query(`CREATE TABLE "dynamic_documents" ("id" BIGSERIAL NOT NULL, "template_id" bigint NOT NULL, "body" text NOT NULL, "head" text, "sha1" character varying(255) NOT NULL, "uuid" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f8132a1b56ddb18bd21bb592f28" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1d5e03e447144ec5411747c141" ON "dynamic_documents"  ("uuid") `);
        await queryRunner.query(`CREATE INDEX "IDX_214943c07cb43804354f1e995a" ON "dynamic_documents"  ("template_id") `);
        await queryRunner.query(`ALTER TABLE "access_tokens" ALTER COLUMN "permissions" SET DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "dynamic_document_versions" ADD CONSTRAINT "FK_14b01ae5c888375b1af9e7a53be" FOREIGN KEY ("dynamic_document_id") REFERENCES "dynamic_documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dynamic_documents" ADD CONSTRAINT "FK_214943c07cb43804354f1e995aa" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dynamic_documents" DROP CONSTRAINT "FK_214943c07cb43804354f1e995aa"`);
        await queryRunner.query(`ALTER TABLE "dynamic_document_versions" DROP CONSTRAINT "FK_14b01ae5c888375b1af9e7a53be"`);
        await queryRunner.query(`ALTER TABLE "access_tokens" ALTER COLUMN "permissions" SET DEFAULT '[]'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_214943c07cb43804354f1e995a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1d5e03e447144ec5411747c141"`);
        await queryRunner.query(`DROP TABLE "dynamic_documents"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba589cef5b425928929beab100"`);
        await queryRunner.query(`DROP TABLE "dynamic_document_versions"`);
    }

}
