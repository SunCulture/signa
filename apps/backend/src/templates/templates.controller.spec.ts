import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';
import request from 'supertest';
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { configureBodyParsers } from '../common/http/body-parser';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

describe('TemplatesController uploads', () => {
  let app: INestApplication;
  const createTemplateFromDocx = jest.fn().mockResolvedValue({ id: '10' });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: { createTemplateFromDocx },
        },
      ],
    })
      .overrideGuard(ApiOrJwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserHydrationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const nestApp = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    configureBodyParsers(nestApp, 10 * 1024 * 1024);
    nestApp.setGlobalPrefix('api');
    await nestApp.init();
    app = nestApp;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createTemplateFromDocx.mockClear();
  });

  it('accepts a 700 KB DOCX as multipart form data', async () => {
    const docx = Buffer.alloc(700 * 1024);

    docx.write('PK');

    await request(app.getHttpServer() as Server)
      .post('/api/templates/docx')
      .field('name', 'Contract')
      .attach('documents', docx, {
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: 'contract.docx',
      })
      .expect(201);

    expect(createTemplateFromDocx).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ name: 'Contract' }),
      expect.objectContaining({
        documents: [
          expect.objectContaining({
            originalname: 'contract.docx',
            size: docx.byteLength,
          }),
        ],
      }),
    );
  });

  it('retains large JSON support for existing API clients', async () => {
    const file = Buffer.alloc(700 * 1024).toString('base64');

    await request(app.getHttpServer() as Server)
      .post('/api/templates/docx')
      .send({
        documents: [{ file, name: 'contract.docx' }],
        name: 'Contract',
      })
      .expect(201);

    expect(createTemplateFromDocx).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        documents: [expect.objectContaining({ name: 'contract.docx' })],
      }),
      undefined,
    );
  });
});
