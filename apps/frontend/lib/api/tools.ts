import { authenticatedApiFetch } from "./auth";

export type VerifyPdfResponse = {
  checksum_status: "verified" | "not_found";
  cryptographic_verification: boolean;
  sha256: string;
  signatures: Array<{
    byte_range_sha256: string | null;
    byte_range_valid: boolean;
    pades_compliant_sub_filter: boolean;
    verification_result: string[];
    signer_name: string | null;
    signing_reason: string | null;
    signing_time: string | null;
    signature_type: string | null;
  }>;
};

export async function verifyPdfFile(file: File): Promise<VerifyPdfResponse> {
  const formData = new FormData();
  formData.set("file", file, file.name);

  return authenticatedApiFetch<VerifyPdfResponse>("/tools/verify", {
    body: formData,
    method: "POST",
  });
}
