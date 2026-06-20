import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781950849851 implements MigrationInterface {
    name = 'AutoMigration1781950849851'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "team_members" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "team_id" bigint NOT NULL, "user_id" bigint NOT NULL, "role" character varying(32) NOT NULL DEFAULT 'member', "archived_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_55d4779beaa5c5594178f27329" ON "team_members"  ("team_id", "role") `);
        await queryRunner.query(`CREATE INDEX "IDX_da5f9f84faa92118aab2b8b3e5" ON "team_members"  ("account_id", "user_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1d3c06a8217a8785e2af0ec4ab" ON "team_members"  ("team_id", "user_id") `);
        await queryRunner.query(`CREATE TABLE "teams" ("id" BIGSERIAL NOT NULL, "uuid" character varying(255) NOT NULL DEFAULT (gen_random_uuid()), "account_id" bigint NOT NULL, "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "description" text, "created_by_user_id" bigint NOT NULL, "archived_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_59dcc55c0af733a59470895cce" ON "teams"  ("uuid") `);
        await queryRunner.query(`CREATE INDEX "IDX_63bcb4049d829da9c66793252e" ON "teams"  ("account_id", "archived_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d1545d65f9ccaf1bcf192a0760" ON "teams"  ("account_id", "slug") `);
        await queryRunner.query(`CREATE TABLE "team_invitations" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "team_id" bigint NOT NULL, "email" character varying(255) NOT NULL, "role" character varying(32) NOT NULL DEFAULT 'member', "token_hash" character varying(64) NOT NULL, "status" character varying(32) NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "accepted_at" TIMESTAMP WITH TIME ZONE, "created_by_user_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c14b443d431077f89344a3fd262" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a3b81d4086d367f5907b7d1d90" ON "team_invitations"  ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "IDX_71462050beadab6c82c68d0107" ON "team_invitations"  ("team_id", "email") `);
        await queryRunner.query(`CREATE INDEX "IDX_8f31dc6f3121e0b616ab7071a2" ON "team_invitations"  ("account_id", "email", "status") `);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_c2d2b65f142ec7e11625d207e48" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_members" ADD CONSTRAINT "FK_c2bf4967c8c2a6b845dadfbf3d4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_9dc2f0140a747841db643785a15" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_25a755b4e381ecc1fc4ad45603b" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_invitations" ADD CONSTRAINT "FK_fa66eb9cf0f48123ad6b80ad94a" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_invitations" ADD CONSTRAINT "FK_47d9ff0726cf20571e29480a99b" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "team_invitations" ADD CONSTRAINT "FK_0380b3d9cf0ae710e8d0b8b5514" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_0380b3d9cf0ae710e8d0b8b5514"`);
        await queryRunner.query(`ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_47d9ff0726cf20571e29480a99b"`);
        await queryRunner.query(`ALTER TABLE "team_invitations" DROP CONSTRAINT "FK_fa66eb9cf0f48123ad6b80ad94a"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_25a755b4e381ecc1fc4ad45603b"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_9dc2f0140a747841db643785a15"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_c2bf4967c8c2a6b845dadfbf3d4"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea"`);
        await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_c2d2b65f142ec7e11625d207e48"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f31dc6f3121e0b616ab7071a2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71462050beadab6c82c68d0107"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3b81d4086d367f5907b7d1d90"`);
        await queryRunner.query(`DROP TABLE "team_invitations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d1545d65f9ccaf1bcf192a0760"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_63bcb4049d829da9c66793252e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_59dcc55c0af733a59470895cce"`);
        await queryRunner.query(`DROP TABLE "teams"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1d3c06a8217a8785e2af0ec4ab"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da5f9f84faa92118aab2b8b3e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_55d4779beaa5c5594178f27329"`);
        await queryRunner.query(`DROP TABLE "team_members"`);
    }

}
