import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781875837279 implements MigrationInterface {
    name = 'AutoMigration1781875837279'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "active_storage_blobs" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "active_storage_attachments" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "templates" ALTER COLUMN "slug" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "slug" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "submitters" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "submitters" ALTER COLUMN "slug" SET DEFAULT gen_random_uuid()::text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "submitters" ALTER COLUMN "slug" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "submitters" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "slug" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "templates" ALTER COLUMN "slug" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "active_storage_attachments" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "active_storage_blobs" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
    }

}
