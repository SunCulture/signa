import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PdfRevocationEvidenceType = 'crl' | 'ocsp';
export type PdfRevocationEvidenceStatus =
  | 'good'
  | 'revoked'
  | 'unavailable'
  | 'unknown';

@Entity('pdf_revocation_evidence')
@Index('IDX_pdf_revocation_evidence_lookup', [
  'accountId',
  'certificateSha256',
  'evidenceType',
  'checkedAt',
])
export class PdfRevocationEvidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ name: 'certificate_sha256', type: 'varchar', length: 64 })
  certificateSha256!: string;

  @Column({ name: 'issuer_hash', type: 'varchar', length: 128 })
  issuerHash!: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 128 })
  serialNumber!: string;

  @Column({ name: 'evidence_type', type: 'varchar', length: 16 })
  evidenceType!: PdfRevocationEvidenceType;

  @Column({ type: 'varchar', length: 32 })
  status!: PdfRevocationEvidenceStatus;

  @Column({ type: 'text', nullable: true })
  url!: string | null;

  @Column({ name: 'data_base64', type: 'text', nullable: true })
  dataBase64!: string | null;

  @Column({ name: 'this_update', type: Date, nullable: true })
  thisUpdate!: Date | null;

  @Column({ name: 'next_update', type: Date, nullable: true })
  nextUpdate!: Date | null;

  @Column({ name: 'checked_at', type: Date })
  checkedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
