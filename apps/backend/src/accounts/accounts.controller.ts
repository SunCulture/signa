import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AdminGuard } from '../auth/guards/admin/admin.guard';
import { AccountHydrationGuard } from '../auth/guards/account-hydration/account-hydration.guard';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard';
import { CurrentAccount } from '../common/decorators/account.decorator';
import type { UploadedBufferFile } from '../storage/storage.types';
import { Account } from './entities/account.entity';
import { AccountsService } from './accounts.service';
import {
  AccountLogoResponseDto,
  SigningCertificateListResponseDto,
  SigningCertificateResponseDto,
} from './dto/account-branding.dto';
import {
  AccountEmailIntegrationConnectResponseDto,
  AccountEmailIntegrationListResponseDto,
  AccountEmailIntegrationResponseDto,
  CompleteAccountEmailIntegrationDto,
} from './dto/account-integration.dto';
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

  @Get('logo')
  @ApiOkResponse({ type: AccountLogoResponseDto })
  logo(
    @CurrentAccount() account: Account,
  ): Promise<AccountLogoResponseDto | null> {
    return this.accountsService.getAccountLogo(account.id);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: AccountLogoResponseDto })
  uploadLogo(
    @CurrentAccount() account: Account,
    @UploadedFile() file: UploadedBufferFile,
  ): Promise<AccountLogoResponseDto> {
    return this.accountsService.uploadAccountLogo(account.id, file);
  }

  @Delete('logo')
  @ApiOkResponse({ type: AccountLogoResponseDto })
  deleteLogo(
    @CurrentAccount() account: Account,
  ): Promise<AccountLogoResponseDto | null> {
    return this.accountsService.deleteAccountLogo(account.id);
  }

  @Get('signing-certificates')
  @ApiOkResponse({ type: SigningCertificateListResponseDto })
  signingCertificates(
    @CurrentAccount() account: Account,
  ): Promise<SigningCertificateListResponseDto> {
    return this.accountsService.listSigningCertificates(account.id);
  }

  @Post('signing-certificates')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: SigningCertificateResponseDto })
  uploadSigningCertificate(
    @CurrentAccount() account: Account,
    @Body('name') name: string | undefined,
    @UploadedFile() file: UploadedBufferFile,
  ): Promise<SigningCertificateResponseDto> {
    return this.accountsService.uploadSigningCertificate(
      account.id,
      name,
      file,
    );
  }

  @Patch('signing-certificates/default')
  @ApiOkResponse({ type: SigningCertificateResponseDto })
  makeDefaultSigningCertificate(
    @CurrentAccount() account: Account,
    @Body('name') name: string,
  ): Promise<SigningCertificateResponseDto> {
    return this.accountsService.makeDefaultSigningCertificate(account.id, name);
  }

  @Delete('signing-certificates')
  @ApiOkResponse({ type: SigningCertificateResponseDto })
  deleteSigningCertificate(
    @CurrentAccount() account: Account,
    @Body('name') name: string,
  ): Promise<SigningCertificateResponseDto> {
    return this.accountsService.deleteSigningCertificate(account.id, name);
  }

  @Get('integrations')
  @ApiOkResponse({ type: AccountEmailIntegrationListResponseDto })
  integrations(
    @CurrentAccount() account: Account,
  ): Promise<AccountEmailIntegrationListResponseDto> {
    return this.accountsService.listEmailIntegrations(account.id);
  }

  @Post('integrations/:provider/connect')
  @ApiOkResponse({ type: AccountEmailIntegrationConnectResponseDto })
  connectIntegration(
    @CurrentAccount() account: Account,
    @Param('provider') provider: string,
  ): Promise<AccountEmailIntegrationConnectResponseDto> {
    return this.accountsService.startEmailIntegrationConnect(
      account.id,
      provider,
    );
  }

  @Post('integrations/:provider/callback')
  @ApiOkResponse({ type: AccountEmailIntegrationResponseDto })
  completeIntegration(
    @CurrentAccount() account: Account,
    @Param('provider') provider: string,
    @Body() body: CompleteAccountEmailIntegrationDto,
  ): Promise<AccountEmailIntegrationResponseDto> {
    return this.accountsService.completeEmailIntegrationConnect(
      account.id,
      provider,
      body.code,
    );
  }

  @Delete('integrations/:provider')
  @ApiOkResponse({ type: AccountEmailIntegrationResponseDto })
  disconnectIntegration(
    @CurrentAccount() account: Account,
    @Param('provider') provider: string,
  ): Promise<AccountEmailIntegrationResponseDto> {
    return this.accountsService.disconnectEmailIntegration(
      account.id,
      provider,
    );
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
