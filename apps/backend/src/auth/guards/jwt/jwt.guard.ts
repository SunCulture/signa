import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from '../../authenticated-request';
import { WebSessionJwtPayload } from '../../web-session';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.getBearerToken(request);

    if (!token) {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<WebSessionJwtPayload>(token);
      request.session = {
        userId: payload.userId,
        accountId: payload.accountId,
        role: payload.role,
      };
    } catch {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }

    return true;
  }

  private getBearerToken(request: AuthenticatedRequest): string | null {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    return authorization.slice('Bearer '.length);
  }
}
