import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';
import type { I18nValidationError } from 'nestjs-i18n';
import { buildSafeRequestLog } from '../utils/log-redaction';
import type { RequestWithId } from '../middleware/request-id.middleware';

type ErrorResponseBody = {
  error?: string;
  i18n_args?: Record<string, unknown>;
  i18n_key?: string;
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
    const message = getErrorMessage(exception, host);
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

function getErrorMessage(exception: unknown, host: ArgumentsHost): string {
  if (exception instanceof I18nValidationException) {
    return getI18nValidationMessage(exception, host);
  }

  if (exception instanceof HttpException) {
    return getHttpExceptionMessage(exception, host);
  }

  if (exception instanceof Error) {
    return exception.message || 'Internal server error';
  }

  if (typeof exception === 'string') {
    return exception;
  }

  return 'Internal server error';
}

function getHttpExceptionMessage(
  exception: HttpException,
  host: ArgumentsHost,
): string {
  const body = exception.getResponse();

  if (typeof body === 'string') {
    return body;
  }

  if (!isErrorResponseBody(body)) {
    return exception.message;
  }

  const i18nMessage = translateHttpExceptionBody(body, host);

  if (i18nMessage) {
    return i18nMessage;
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

function getI18nValidationMessage(
  exception: I18nValidationException,
  host: ArgumentsHost,
): string {
  const i18n = I18nContext.current(host) ?? I18nContext.current();
  const messages = flattenValidationMessages(exception.errors, i18n);

  return messages.length > 0
    ? messages.join(', ')
    : (i18n?.translate('validation.messages.failed') ?? 'Validation failed');
}

function translateHttpExceptionBody(
  body: ErrorResponseBody,
  host: ArgumentsHost,
): string | null {
  if (!body.i18n_key) {
    return null;
  }

  const i18n = I18nContext.current(host) ?? I18nContext.current();

  if (!i18n) {
    return body.error ?? body.message?.toString() ?? body.i18n_key;
  }

  return i18n.translate(body.i18n_key, {
    args: body.i18n_args,
    defaultValue: body.error ?? body.message?.toString() ?? body.i18n_key,
    lang: i18n.lang,
  });
}

function flattenValidationMessages(
  errors: I18nValidationError[],
  i18n?: I18nContext,
): string[] {
  return errors.flatMap((error) => {
    const constraints = Object.entries(error.constraints ?? {});
    const ownMessages = constraints.map(([constraint, message]) =>
      translateValidationConstraint({
        constraint,
        error,
        i18n,
        message,
      }),
    );
    const childMessages = flattenValidationMessages(error.children ?? [], i18n);

    return [...ownMessages, ...childMessages];
  });
}

function translateValidationConstraint(input: {
  constraint: string;
  error: I18nValidationError;
  i18n?: I18nContext;
  message: string;
}): string {
  if (!input.i18n) {
    return input.message;
  }

  const translated = input.i18n.translate(
    `validation.constraints.${input.constraint}`,
    {
      args: {
        property: input.error.property,
        value: input.error.value as unknown,
      },
      defaultValue: input.message,
      lang: input.i18n.lang,
    },
  );

  return typeof translated === 'string' ? translated : input.message;
}
