import { v4 as uuidv4 } from 'uuid';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('pdf_trust_roots')
@Index(['accountId', 'fingerprintSha256'], { unique: true })
export class PdfTrustRoot {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = uuidv4();

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'certificate_der_base64', type: 'text' })
  certificateDerBase64!: string;

  @Column({ name: 'fingerprint_sha256', type: 'varchar', length: 64 })
  fingerprintSha256!: string;

  @Column({ type: 'text' })
  subject!: string;

  @Column({ type: 'text' })
  issuer!: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 128 })
  serialNumber!: string;

  @Column({ name: 'valid_from', type: Date })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: Date })
  validTo!: Date;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
