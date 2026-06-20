import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1781818050366 implements MigrationInterface {
  name = 'AutoMigration1781818050366';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "email" character varying(255) NOT NULL, "uuid" character varying(255) NOT NULL DEFAULT gen_random_uuid()::text, "first_name" character varying(255), "last_name" character varying(255), "role" character varying(64) NOT NULL DEFAULT 'admin', "encrypted_password" character varying(255) NOT NULL, "confirmation_sent_at" TIMESTAMP WITH TIME ZONE, "confirmation_token" character varying, "confirmed_at" TIMESTAMP WITH TIME ZONE, "consumed_timestep" integer, "current_sign_in_at" TIMESTAMP WITH TIME ZONE, "current_sign_in_ip" character varying, "failed_attempts" integer NOT NULL DEFAULT '0', "last_sign_in_at" TIMESTAMP WITH TIME ZONE, "last_sign_in_ip" character varying, "locked_at" TIMESTAMP WITH TIME ZONE, "otp_required_for_login" boolean NOT NULL DEFAULT false, "otp_secret" character varying, "remember_created_at" TIMESTAMP WITH TIME ZONE, "reset_password_token" character varying, "reset_password_sent_at" TIMESTAMP WITH TIME ZONE, "sign_in_count" integer NOT NULL DEFAULT '0', "unconfirmed_email" character varying, "unlock_token" character varying, "archived_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17a709b8b6146c491e6615c29d" ON "users"  ("account_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_951b8f1dfc94ac1d0301a14b7e" ON "users"  ("uuid") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ee6419219542371563e0592db5" ON "users"  ("reset_password_token") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b800fd597d3e239f367bb8852d" ON "users"  ("unlock_token") `,
    );
    await queryRunner.query(
      `CREATE TABLE "account_linked_accounts" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "linked_account_id" bigint NOT NULL, "account_type" text NOT NULL DEFAULT 'testing', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_95cb0376b8d5b3231e595142456" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_686e0da31878d0e48875aee09c" ON "account_linked_accounts"  ("account_id", "linked_account_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "encrypted_configs" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "key" character varying(255) NOT NULL, "value" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6d34ec2aacf15d0b319ef003c89" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bb1ac88816aa82a159b6093129" ON "encrypted_configs"  ("account_id", "key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "accounts" ("id" BIGSERIAL NOT NULL, "uuid" character varying(255) NOT NULL DEFAULT gen_random_uuid()::text, "name" character varying(255) NOT NULL, "timezone" character varying(64) NOT NULL DEFAULT 'UTC', "locale" character varying(16) NOT NULL DEFAULT 'en-US', "archived_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_45705ce5c594e0b9f6158a4337" ON "accounts"  ("uuid") `,
    );
    await queryRunner.query(
      `CREATE TABLE "account_configs" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "key" character varying(255) NOT NULL, "value" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d4b78ee9273d0433faffece2862" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ccc9ba0c29fca6d5cce27a5813" ON "account_configs"  ("account_id", "key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "access_tokens" ("id" BIGSERIAL NOT NULL, "user_id" bigint NOT NULL, "sha256" text NOT NULL, "token" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_65140f59763ff994a0252488166" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2a2f2163c5814cbe702ad48892" ON "access_tokens"  ("sha256") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_17a709b8b6146c491e6615c29d7" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_linked_accounts" ADD CONSTRAINT "FK_63d1e250e253f757b037fa20859" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_linked_accounts" ADD CONSTRAINT "FK_feea6b1ab3eb6e38c81f617e7b7" FOREIGN KEY ("linked_account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "encrypted_configs" ADD CONSTRAINT "FK_2bb2ae7764c64801847829917be" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_configs" ADD CONSTRAINT "FK_6e97d137a6c7db7a509d31a2017" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "access_tokens" ADD CONSTRAINT "FK_09ee750a035b06e0c7f0704687e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "access_tokens" DROP CONSTRAINT "FK_09ee750a035b06e0c7f0704687e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_configs" DROP CONSTRAINT "FK_6e97d137a6c7db7a509d31a2017"`,
    );
    await queryRunner.query(
      `ALTER TABLE "encrypted_configs" DROP CONSTRAINT "FK_2bb2ae7764c64801847829917be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_linked_accounts" DROP CONSTRAINT "FK_feea6b1ab3eb6e38c81f617e7b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "account_linked_accounts" DROP CONSTRAINT "FK_63d1e250e253f757b037fa20859"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_17a709b8b6146c491e6615c29d7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a2f2163c5814cbe702ad48892"`,
    );
    await queryRunner.query(`DROP TABLE "access_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ccc9ba0c29fca6d5cce27a5813"`,
    );
    await queryRunner.query(`DROP TABLE "account_configs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_45705ce5c594e0b9f6158a4337"`,
    );
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb1ac88816aa82a159b6093129"`,
    );
    await queryRunner.query(`DROP TABLE "encrypted_configs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_686e0da31878d0e48875aee09c"`,
    );
    await queryRunner.query(`DROP TABLE "account_linked_accounts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b800fd597d3e239f367bb8852d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee6419219542371563e0592db5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_951b8f1dfc94ac1d0301a14b7e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17a709b8b6146c491e6615c29d"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
