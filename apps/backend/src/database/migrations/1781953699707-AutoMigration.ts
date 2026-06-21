import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781953699707 implements MigrationInterface {
    name = 'AutoMigration1781953699707'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "teams" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "teams" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()`);
    }

}
