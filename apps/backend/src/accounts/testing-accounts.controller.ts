import { Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthService } from '../auth/auth.service';
import { AuthResponseDto } from '../auth/dto/auth-response.dto';
import { AccountHydrationGuard } from '../auth/guards/account-hydration/account-hydration.guard';
import { AdminGuard } from '../auth/guards/admin/admin.guard';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard';
import { AccountsService } from './accounts.service';

@Controller('testing-account')
@UseGuards(JwtGuard, AccountHydrationGuard, AdminGuard)
@ApiTags('Testing Account')
@ApiBearerAuth()
export class TestingAccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @ApiOkResponse({ type: AuthResponseDto })
  async create(@Req() request: AuthenticatedRequest): Promise<AuthResponseDto> {
    const session = request.session!;
    const context = await this.accountsService.findOrCreateTestingUser({
      accountId: session.trueAccountId ?? session.accountId,
      userId: session.trueUserId ?? session.userId,
    });

    return this.authService.createAuthResponse(context.user, context.account, {
      isTestMode: true,
      productionAccountId: context.trueAccount.id,
      testingAccountId: context.account.id,
      trueAccountId: context.trueAccount.id,
      trueUserId: context.trueUser.id,
    });
  }

  @Delete()
  @ApiOkResponse({ type: AuthResponseDto })
  async destroy(
    @Req() request: AuthenticatedRequest,
  ): Promise<AuthResponseDto> {
    const session = request.session!;
    const context =
      await this.accountsService.findProductionUserForTestingSession({
        accountId: session.accountId,
        trueAccountId: session.trueAccountId,
        trueUserId: session.trueUserId,
      });
    const testingContext = await this.accountsService.getTestingAccountContext(
      context.account.id,
    );

    return this.authService.createAuthResponse(context.user, context.account, {
      isTestMode: false,
      productionAccountId: context.account.id,
      testingAccountId: testingContext.testingAccountId,
    });
  }
}
