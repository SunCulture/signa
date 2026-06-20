import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModuleOptions } from '@bull-board/nestjs';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import basicAuth from 'express-basic-auth';

export function createBullBoardOptions(
  config: ConfigService,
): BullBoardModuleOptions {
  return {
    route: config.get<string>('BULL_BOARD_ROUTE', '/queues'),
    adapter: ExpressAdapter,
    middleware: createBullBoardMiddleware(config),
  };
}

function createBullBoardMiddleware(config: ConfigService) {
  if (!config.get<boolean>('BULL_BOARD_ENABLED', false)) {
    return (_request: Request, response: Response) => response.sendStatus(404);
  }

  return basicAuth({
    challenge: true,
    users: {
      [config.get<string>('BULL_BOARD_USER', 'admin')]: config.get<string>(
        'BULL_BOARD_PASS',
        'change-me',
      ),
    },
  }) as (request: Request, response: Response, next: NextFunction) => void;
}
