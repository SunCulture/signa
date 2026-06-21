import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781957934500 implements MigrationInterface {
    name = 'AutoMigration1781957934500'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "teams" ALTER COLUMN "uuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "webhook_urls" ALTER COLUMN "events" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "webhook_urls" ALTER COLUMN "secret" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "webhook_urls" ALTER COLUMN "secret" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "webhook_urls" ALTER COLUMN "events" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "teams" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`);
    }

}
