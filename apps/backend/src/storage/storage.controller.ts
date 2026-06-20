import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { basename } from 'node:path';
import { StorageService } from './storage.service';

@ApiExcludeController()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('blobs/:token/:filename')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  @Header('X-Content-Type-Options', 'nosniff')
  async proxyBlob(
    @Param('token') token: string,
    @Res() response: Response,
  ): Promise<void> {
    const blob = await this.storageService.getBlobForSignedToken(token);
    const filePath = this.storageService.getBlobPath(blob);
    const filename = basename(this.storageService.getSafeDownloadName(blob));

    response.type(blob.contentType ?? 'application/octet-stream');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${filename.replaceAll('"', '\\"')}"`,
    );
    response.sendFile(filePath);
  }
}
