import * as asn1js from 'asn1js';
import forge from 'node-forge';
import { Certificate, CertificateRevocationList } from 'pkijs';
import { generateSignaDefaultCertificate } from './pdf-signature-certificate';
import { buildSignaInternalCrl } from './signa-internal-crl';
import { toArrayBuffer } from './pdf-cms-utils';

describe('buildSignaInternalCrl', () => {
  it('creates a verifiable empty CRL signed by the Signa Sub-CA', async () => {
    const stored = generateSignaDefaultCertificate();
    const p12 = forge.pkcs12.pkcs12FromAsn1(
      forge.asn1.fromDer(
        forge.util.createBuffer(
          Buffer.from(stored.data, 'base64').toString('binary'),
        ),
      ),
      false,
      '',
    );
    const certs =
      p12.getBags({ bagType: forge.pki.oids.certBag })[
        forge.pki.oids.certBag
      ] ?? [];
    const [signerCert, issuerCert] = certs.map((bag) => bag.cert);

    if (!signerCert || !issuerCert || !stored.internal_revocation) {
      throw new Error('Expected generated Signa certificate chain');
    }

    const issuer = toPkijsCertificate(issuerCert);
    const signer = toPkijsCertificate(signerCert);
    const crl = parseCrl(
      buildSignaInternalCrl({
        issuer,
        issuerPrivateKeyPem:
          stored.internal_revocation.crl_issuer_private_key_pem,
        nextUpdate: new Date('2026-07-11T00:00:00.000Z'),
        thisUpdate: new Date('2026-07-04T00:00:00.000Z'),
      }),
    );

    await expect(crl.verify({ issuerCertificate: issuer })).resolves.toBe(true);
    expect(crl.revokedCertificates ?? []).toHaveLength(0);
    expect(
      crl.revokedCertificates?.some(
        (certificate) =>
          certificate.userCertificate.valueBlock.toString() ===
          signer.serialNumber.valueBlock.toString(),
      ) ?? false,
    ).toBe(false);
  });
});

function toPkijsCertificate(certificate: forge.pki.Certificate): Certificate {
  const der = Buffer.from(
    forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes(),
    'binary',
  );
  const asn1 = asn1js.fromBER(toArrayBuffer(der));

  if (asn1.offset === -1) {
    throw new Error('Certificate could not be parsed');
  }

  return new Certificate({ schema: asn1.result });
}

function parseCrl(data: Buffer): CertificateRevocationList {
  const asn1 = asn1js.fromBER(toArrayBuffer(data));

  if (asn1.offset === -1) {
    throw new Error('CRL could not be parsed');
  }

  return new CertificateRevocationList({ schema: asn1.result });
}
