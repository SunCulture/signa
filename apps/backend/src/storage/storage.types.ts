export type UploadedBufferFile = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size: number;
};

export type CreateAttachmentInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
  name: string;
  recordType: string;
  recordId: string;
  metadata?: Record<string, unknown>;
};
