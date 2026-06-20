import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781822050522 implements MigrationInterface {
    name = 'AutoMigration1781822050522'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "active_storage_blobs" ("id" BIGSERIAL NOT NULL, "key" character varying(255) NOT NULL, "filename" character varying(255) NOT NULL, "content_type" character varying(255), "metadata" text, "service_name" character varying(255) NOT NULL, "byte_size" bigint NOT NULL, "checksum" character varying(255), "uuid" character varying(255) NOT NULL DEFAULT gen_random_uuid()::text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_30370b7ae2ba8cec606104844d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_39961cf206ab5bf357824934bc" ON "active_storage_blobs"  ("key") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e127dd99b4aa6d9bc28fad2a69" ON "active_storage_blobs"  ("uuid") `);
        await queryRunner.query(`CREATE TABLE "active_storage_attachments" ("id" BIGSERIAL NOT NULL, "name" character varying(255) NOT NULL, "record_type" character varying(255) NOT NULL, "record_id" bigint NOT NULL, "blob_id" bigint NOT NULL, "uuid" character varying(255) NOT NULL DEFAULT gen_random_uuid()::text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d4699256ae1ecba483a344672a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b423450914bedbfe86ef03d0b0" ON "active_storage_attachments"  ("uuid") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c39411d8691e8fcda9aa0e2a0" ON "active_storage_attachments"  ("record_type", "record_id", "name", "blob_id") `);
        await queryRunner.query(`CREATE TABLE "template_folders" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "author_id" bigint NOT NULL, "parent_folder_id" bigint, "name" character varying(255) NOT NULL, "archived_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_43f232191ef5cde8d59ff12f8d1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_34137fd586874af5c24c6e515b" ON "template_folders"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f6811112873195a1572e572814" ON "template_folders"  ("author_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c9fb2115687eb2dd7df5c6169f" ON "template_folders"  ("parent_folder_id") `);
        await queryRunner.query(`CREATE TABLE "template_sharings" ("id" BIGSERIAL NOT NULL, "ability" character varying(255) NOT NULL, "account_id" bigint NOT NULL, "template_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0a4804eb0b296913fd7165efb4a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_661d5883eccb047f3e38d05bcf" ON "template_sharings"  ("account_id", "template_id") `);
        await queryRunner.query(`CREATE TABLE "template_versions" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "author_id" bigint NOT NULL, "template_id" bigint NOT NULL, "data" text NOT NULL, "sha1" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cfc439255ca2725f4102c554d41" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3989ca2826352df5fd3cc466f5" ON "template_versions"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2f117afe4028eba6ebada5a270" ON "template_versions"  ("author_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_444c7f06952f124cf4efebd952" ON "template_versions"  ("template_id", "sha1") `);
        await queryRunner.query(`CREATE TABLE "templates" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL, "author_id" bigint NOT NULL, "folder_id" bigint NOT NULL, "external_id" character varying(255), "fields" text NOT NULL, "name" character varying(255) NOT NULL, "preferences" text NOT NULL, "schema" text NOT NULL, "shared_link" boolean NOT NULL DEFAULT false, "slug" character varying(255) NOT NULL DEFAULT gen_random_uuid()::text, "source" text NOT NULL DEFAULT 'native', "submitters" text NOT NULL, "variables_schema" text, "archived_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_515948649ce0bbbe391de702ae5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_444e01e8e550ba2eccbcbbf4e0" ON "templates"  ("account_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2cffdbaaa167588f466e900e6d" ON "templates"  ("author_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_26e364a3ec19910215163bcb78" ON "templates"  ("folder_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3018abaeed86cd64ba1a9d144" ON "templates"  ("external_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_996873c57c54937eba59605def" ON "templates"  ("slug") `);
        await queryRunner.query(`CREATE TABLE "template_accesses" ("id" BIGSERIAL NOT NULL, "template_id" bigint NOT NULL, "user_id" bigint NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_842a680244dfe371aba585f964e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_397d6b0d494b1f40a4ef6a77db" ON "template_accesses"  ("template_id", "user_id") `);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "uuid" SET DEFAULT gen_random_uuid()::text`);
        await queryRunner.query(`ALTER TABLE "active_storage_attachments" ADD CONSTRAINT "FK_54a6b694c78e6782d1912426e5e" FOREIGN KEY ("blob_id") REFERENCES "active_storage_blobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_folders" ADD CONSTRAINT "FK_34137fd586874af5c24c6e515bc" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_folders" ADD CONSTRAINT "FK_f6811112873195a1572e5728144" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_folders" ADD CONSTRAINT "FK_c9fb2115687eb2dd7df5c6169ff" FOREIGN KEY ("parent_folder_id") REFERENCES "template_folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_sharings" ADD CONSTRAINT "FK_c98426b8b9f40ab9f8ab0c7d2a3" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_versions" ADD CONSTRAINT "FK_3989ca2826352df5fd3cc466f5f" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_versions" ADD CONSTRAINT "FK_2f117afe4028eba6ebada5a270b" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_versions" ADD CONSTRAINT "FK_d747f429f90a051a017094521b0" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "templates" ADD CONSTRAINT "FK_444e01e8e550ba2eccbcbbf4e07" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "templates" ADD CONSTRAINT "FK_2cffdbaaa167588f466e900e6df" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "templates" ADD CONSTRAINT "FK_26e364a3ec19910215163bcb78a" FOREIGN KEY ("folder_id") REFERENCES "template_folders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "template_accesses" ADD CONSTRAINT "FK_5c5b7ceac0920027456c61e1f76" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "template_accesses" DROP CONSTRAINT "FK_5c5b7ceac0920027456c61e1f76"`);
        await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_26e364a3ec19910215163bcb78a"`);
        await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_2cffdbaaa167588f466e900e6df"`);
        await queryRunner.query(`ALTER TABLE "templates" DROP CONSTRAINT "FK_444e01e8e550ba2eccbcbbf4e07"`);
        await queryRunner.query(`ALTER TABLE "template_versions" DROP CONSTRAINT "FK_d747f429f90a051a017094521b0"`);
        await queryRunner.query(`ALTER TABLE "template_versions" DROP CONSTRAINT "FK_2f117afe4028eba6ebada5a270b"`);
        await queryRunner.query(`ALTER TABLE "template_versions" DROP CONSTRAINT "FK_3989ca2826352df5fd3cc466f5f"`);
        await queryRunner.query(`ALTER TABLE "template_sharings" DROP CONSTRAINT "FK_c98426b8b9f40ab9f8ab0c7d2a3"`);
        await queryRunner.query(`ALTER TABLE "template_folders" DROP CONSTRAINT "FK_c9fb2115687eb2dd7df5c6169ff"`);
        await queryRunner.query(`ALTER TABLE "template_folders" DROP CONSTRAINT "FK_f6811112873195a1572e5728144"`);
        await queryRunner.query(`ALTER TABLE "template_folders" DROP CONSTRAINT "FK_34137fd586874af5c24c6e515bc"`);
        await queryRunner.query(`ALTER TABLE "active_storage_attachments" DROP CONSTRAINT "FK_54a6b694c78e6782d1912426e5e"`);
        await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "uuid" SET DEFAULT (gen_random_uuid())`);
        await queryRunner.query(`DROP INDEX "public"."IDX_397d6b0d494b1f40a4ef6a77db"`);
        await queryRunner.query(`DROP TABLE "template_accesses"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_996873c57c54937eba59605def"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3018abaeed86cd64ba1a9d144"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_26e364a3ec19910215163bcb78"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2cffdbaaa167588f466e900e6d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_444e01e8e550ba2eccbcbbf4e0"`);
        await queryRunner.query(`DROP TABLE "templates"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_444c7f06952f124cf4efebd952"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f117afe4028eba6ebada5a270"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3989ca2826352df5fd3cc466f5"`);
        await queryRunner.query(`DROP TABLE "template_versions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_661d5883eccb047f3e38d05bcf"`);
        await queryRunner.query(`DROP TABLE "template_sharings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c9fb2115687eb2dd7df5c6169f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f6811112873195a1572e572814"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_34137fd586874af5c24c6e515b"`);
        await queryRunner.query(`DROP TABLE "template_folders"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0c39411d8691e8fcda9aa0e2a0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b423450914bedbfe86ef03d0b0"`);
        await queryRunner.query(`DROP TABLE "active_storage_attachments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e127dd99b4aa6d9bc28fad2a69"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_39961cf206ab5bf357824934bc"`);
        await queryRunner.query(`DROP TABLE "active_storage_blobs"`);
    }

}
