import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781999223662 implements MigrationInterface {
    name = 'AutoMigration1781999223662'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "access_tokens" ADD "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb`);
        await queryRunner.query(`ALTER TABLE "access_tokens" ADD "last_used_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "access_tokens" ADD "revoked_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "access_tokens" DROP COLUMN "revoked_at"`);
        await queryRunner.query(`ALTER TABLE "access_tokens" DROP COLUMN "last_used_at"`);
        await queryRunner.query(`ALTER TABLE "access_tokens" DROP COLUMN "permissions"`);
    }

}
