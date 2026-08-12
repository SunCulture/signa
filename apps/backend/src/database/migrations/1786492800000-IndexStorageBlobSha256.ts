import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexStorageBlobSha2561786492800000 implements MigrationInterface {
  name = 'IndexStorageBlobSha2561786492800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "active_storage_blobs" ADD "sha256" character varying(43)`,
    );
    await queryRunner.query(`
      UPDATE "active_storage_blobs"
      SET "sha256" = ("metadata"::jsonb ->> 'sha256')
      WHERE "metadata" IS NOT NULL
        AND ("metadata"::jsonb ->> 'sha256') ~ '^[A-Za-z0-9_-]{43}$'
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_active_storage_blobs_sha256" ON "active_storage_blobs" ("sha256")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_active_storage_attachments_blob_record_name" ON "active_storage_attachments" ("blob_id", "record_type", "name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_active_storage_attachments_blob_record_name"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_active_storage_blobs_sha256"`,
    );
    await queryRunner.query(
      `ALTER TABLE "active_storage_blobs" DROP COLUMN "sha256"`,
    );
  }
}
