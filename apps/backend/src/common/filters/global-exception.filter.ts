import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { buildSafeRequestLog } from '../utils/log-redaction';
import type { RequestWithId } from '../middleware/request-id.middleware';

type ErrorResponseBody = {
  error?: string;
  message?: string | string[];
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name, {
    timestamp: true,
  });

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithId>();
    const status = getHttpStatus(exception);
    const message = getErrorMessage(exception);
    const requestId = request.requestId ?? 'unknown';

    this.logException({
      exception,
      message,
      request,
      requestId,
      status,
    });

    response.status(status).json({
      statusCode: status,
      error: message,
      message,
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private logException(options: {
    exception: unknown;
    message: string;
    request: Request;
    requestId: string;
    status: number;
  }): void {
    const safeRequest = buildSafeRequestLog(options.request);

    this.logger.error({
      requestId: options.requestId,
      method: options.request.method,
      path: options.request.url,
      statusCode: options.status,
      message: options.message,
      body: safeRequest.body,
      query: safeRequest.query,
      params: safeRequest.params,
      ip: options.request.ip,
      stack:
        options.exception instanceof Error
          ? options.exception.stack
          : undefined,
    });
  }
}

function getHttpStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function getErrorMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    return getHttpExceptionMessage(exception);
  }

  if (exception instanceof Error) {
    return exception.message || 'Internal server error';
  }

  if (typeof exception === 'string') {
    return exception;
  }

  return 'Internal server error';
}

function getHttpExceptionMessage(exception: HttpException): string {
  const body = exception.getResponse();

  if (typeof body === 'string') {
    return body;
  }

  if (!isErrorResponseBody(body)) {
    return exception.message;
  }

  if (body.error) {
    return body.error;
  }

  if (Array.isArray(body.message)) {
    return body.message.join(', ');
  }

  return body.message ?? exception.message;
}

function isErrorResponseBody(value: unknown): value is ErrorResponseBody {
  return typeof value === 'object' && value !== null;
}
