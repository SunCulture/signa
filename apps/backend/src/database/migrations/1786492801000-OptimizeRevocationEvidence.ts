import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeRevocationEvidence1786492801000 implements MigrationInterface {
  name = 'OptimizeRevocationEvidence1786492801000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_26b53c6f1a8890229f00e4f65a"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pdf_revocation_evidence_lookup" ON "pdf_revocation_evidence" ("account_id", "certificate_sha256", "evidence_type", "checked_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_pdf_revocation_evidence_lookup"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26b53c6f1a8890229f00e4f65a" ON "pdf_revocation_evidence" ("account_id", "certificate_sha256", "evidence_type")`,
    );
  }
}
