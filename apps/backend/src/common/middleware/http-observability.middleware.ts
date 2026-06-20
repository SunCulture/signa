import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { RuntimeObservabilityService } from '../../health/runtime-observability.service';

export function httpObservabilityMiddleware(
  observability: RuntimeObservabilityService,
) {
  return (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ): void => {
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      observability.recordHttpRequest(
        getRouteLabel(request),
        response.statusCode,
        durationMs,
      );
    });

    next();
  };
}

function getRouteLabel(request: AuthenticatedRequest): string {
  return `${request.method} ${request.originalUrl.split('?')[0]}`;
}
