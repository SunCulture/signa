import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccountHydrationGuard } from '../auth/guards/account-hydration/account-hydration.guard';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard';
import { CurrentAccount } from '../common/decorators/account.decorator';
import { Account } from './entities/account.entity';
import { AccountsService } from './accounts.service';
import {
  AccountCustomFieldResponseDto,
  UpdateAccountCustomFieldsDto,
} from './dto/account-custom-fields.dto';

@Controller('account_custom_fields')
@UseGuards(JwtGuard, AccountHydrationGuard)
@ApiTags('Account Custom Fields')
@ApiBearerAuth()
export class AccountCustomFieldsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({
    description:
      'Returns the account custom field library used by the template editor Save as custom field action.',
    summary: 'List account custom fields',
  })
  @ApiOkResponse({ type: AccountCustomFieldResponseDto })
  async list(
    @CurrentAccount() account: Account,
  ): Promise<AccountCustomFieldResponseDto> {
    return {
      value: await this.accountsService.getTemplateCustomFields(account.id),
    };
  }

  @Post()
  @ApiOperation({
    description:
      'Replaces the account custom field library with the supplied normalized field definitions.',
    summary: 'Save account custom fields',
  })
  @ApiOkResponse({ type: AccountCustomFieldResponseDto, isArray: true })
  save(
    @CurrentAccount() account: Account,
    @Body() body: UpdateAccountCustomFieldsDto,
  ): Promise<Record<string, unknown>[]> {
    return this.accountsService.updateTemplateCustomFields(
      account.id,
      body.value,
    );
  }
}
