import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../auth.service';
import { AuthenticatedRequest } from '../../authenticated-request';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiToken = this.getApiToken(request);

    if (!apiToken) {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }

    const tenant = await this.authService.resolveApiToken(apiToken);

    if (!tenant) {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }

    request.tenant = tenant;
    return true;
  }

  private getApiToken(request: AuthenticatedRequest): string | null {
    const headerValue = request.headers['x-auth-token'];

    if (Array.isArray(headerValue)) {
      return headerValue[0] ?? null;
    }

    return headerValue ?? null;
  }
}
