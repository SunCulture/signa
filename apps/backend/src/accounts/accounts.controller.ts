import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AdminGuard } from '../auth/guards/admin/admin.guard';
import { AccountHydrationGuard } from '../auth/guards/account-hydration/account-hydration.guard';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard';
import { CurrentAccount } from '../common/decorators/account.decorator';
import { Account } from './entities/account.entity';
import { AccountsService } from './accounts.service';
import { AccountPreferencesResponseDto } from './dto/account-preferences-response.dto';
import { AccountResponseDto } from './dto/account-response.dto';
import { UpdateAccountPreferencesDto } from './dto/update-account-preferences.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('account')
@UseGuards(JwtGuard, AccountHydrationGuard, AdminGuard)
@ApiTags('Account')
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOkResponse({ type: AccountResponseDto })
  show(@CurrentAccount() account: Account): AccountResponseDto {
    return this.accountsService.toAccountResponse(account);
  }

  @Get('preferences')
  @ApiOkResponse({ type: AccountPreferencesResponseDto })
  preferences(
    @CurrentAccount() account: Account,
  ): Promise<AccountPreferencesResponseDto> {
    return this.accountsService.getAccountPreferences(account.id);
  }

  @Patch()
  @ApiOkResponse({ type: AccountResponseDto })
  update(
    @CurrentAccount() account: Account,
    @Body() body: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.updateAccount(account.id, body);
  }

  @Patch('preferences')
  @ApiOkResponse({ type: AccountPreferencesResponseDto })
  updatePreferences(
    @CurrentAccount() account: Account,
    @Body() body: UpdateAccountPreferencesDto,
  ): Promise<AccountPreferencesResponseDto> {
    return this.accountsService.updateAccountPreferences(account.id, body);
  }

  @Delete()
  @ApiOkResponse({ type: AccountResponseDto })
  archive(
    @CurrentAccount() account: Account,
    @Req() request: AuthenticatedRequest,
  ): Promise<AccountResponseDto> {
    return this.accountsService.archiveAccount({
      accountId: account.id,
      userId: request.session!.userId,
    });
  }
}
