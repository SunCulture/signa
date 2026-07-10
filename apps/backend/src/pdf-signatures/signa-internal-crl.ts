import { createSign } from 'node:crypto';
import * as asn1js from 'asn1js';
import { Certificate } from 'pkijs';

export type SignaInternalCrlInput = {
  issuer: Certificate;
  issuerPrivateKeyPem: string;
  nextUpdate: Date;
  thisUpdate: Date;
};

const sha256WithRsaEncryptionOid = '1.2.840.113549.1.1.11';

/**
 * Build a minimal X.509 v2 CRL for Signa-managed self-hosted certificates.
 * The CRL is intentionally empty: an empty, issuer-signed CRL means every
 * certificate absent from revokedCertificates is good at thisUpdate.
 */
export function buildSignaInternalCrl(input: SignaInternalCrlInput): Buffer {
  const signatureAlgorithm = buildSha256RsaAlgorithmIdentifier();
  const tbsCertList = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ value: 1 }),
      signatureAlgorithm,
      input.issuer.subject.toSchema(),
      new asn1js.GeneralizedTime({ valueDate: input.thisUpdate }),
      new asn1js.GeneralizedTime({ valueDate: input.nextUpdate }),
    ],
  });
  const tbsDer = Buffer.from(tbsCertList.toBER(false));
  const signature = createSign('RSA-SHA256')
    .update(tbsDer)
    .sign(input.issuerPrivateKeyPem);
  const certificateList = new asn1js.Sequence({
    value: [
      tbsCertList,
      signatureAlgorithm,
      new asn1js.BitString({ valueHex: toExactArrayBuffer(signature) }),
    ],
  });

  return Buffer.from(certificateList.toBER(false));
}

function toExactArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function buildSha256RsaAlgorithmIdentifier(): asn1js.Sequence {
  return new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: sha256WithRsaEncryptionOid }),
      new asn1js.Null(),
    ],
  });
}
