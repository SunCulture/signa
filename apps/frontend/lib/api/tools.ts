import { authenticatedApiFetch } from "./auth"

export type VerifyPdfResponse = {
  checksum_status: "verified" | "not_found"
  signatures: Array<{
    verification_result: string[]
    signer_name: string | null
    signing_reason: string | null
    signing_time: string | null
    signature_type: string | null
  }>
}

export async function verifyPdfFile(file: File): Promise<VerifyPdfResponse> {
  return authenticatedApiFetch<VerifyPdfResponse>("/tools/verify", {
    body: JSON.stringify({ file: await fileToBase64(file) }),
    method: "POST",
  })
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener("load", () => resolve(String(reader.result)))
    reader.addEventListener("error", () => reject(reader.error))
    reader.readAsDataURL(file)
  })

  return dataUrl.split(",").at(1) ?? ""
}
