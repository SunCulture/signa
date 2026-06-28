import {
  Controller,
  MessageEvent,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { from, mergeMap, Observable } from 'rxjs';
import type { WebSessionJwtPayload } from '../auth/web-session';
import { UsersService } from '../users/users.service';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly realtime: RealtimeService,
    private readonly usersService: UsersService,
  ) {}

  @Sse('stream')
  stream(
    @Query('token') token?: string,
    @Query('template_id') templateId?: string,
    @Query('submission_id') submissionId?: string,
    @Query('webhook_url_id') webhookUrlId?: string,
    @Query('scope') scope?: string,
  ): Observable<MessageEvent> {
    return from(this.authenticate(token)).pipe(
      mergeMap((user) =>
        this.realtime.stream(user.accountId, {
          scope,
          submissionId,
          templateId,
          webhookUrlId,
        }),
      ),
    );
  }

  private async authenticate(token?: string) {
    if (!token) {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<WebSessionJwtPayload>(token);
      const user = await this.usersService.findActiveUser(payload.userId);

      if (!user || user.accountId !== payload.accountId) {
        throw new Error('Invalid realtime token');
      }

      return user;
    } catch {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }
  }
}
