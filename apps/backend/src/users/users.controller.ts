import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiTokenGuard } from '../auth/guards/api-token/api-token.guard';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { AuthorizationAction } from '../authorization/authorization-actions';
import { CheckPolicies } from '../authorization/check-policies.decorator';
import { PoliciesGuard } from '../authorization/policies.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { ImportUsersResponseDto } from './dto/import-users-response.dto';
import {
  MfaCodeDto,
  MfaSetupResponseDto,
  MfaStatusResponseDto,
} from './dto/mfa.dto';
import { ProfileAssetResponseDto } from './dto/profile-asset-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import type { UploadedBufferFile } from '../storage/storage.types';

type CurrentUserResponse = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

@Controller()
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('user')
  @UseGuards(ApiTokenGuard, UserHydrationGuard)
  @ApiSecurity('X-Auth-Token')
  show(@CurrentUser() user: User): CurrentUserResponse {
    return {
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
    };
  }

  @Get('profile')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  showProfile(@CurrentUser() user: User): UserResponseDto {
    return this.usersService.toUserResponse(user);
  }

  @Patch('profile')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  updateProfile(
    @CurrentUser() user: User,
    @Body() body: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile({
      userId: user.id,
      input: body,
    });
  }

  @Patch('profile/password')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  updatePassword(
    @CurrentUser() user: User,
    @Body() body: UpdatePasswordDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updatePassword({
      userId: user.id,
      input: body,
    });
  }

  @Get('profile/signature')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileAssetResponseDto })
  getSignature(
    @CurrentUser() user: User,
  ): Promise<ProfileAssetResponseDto | null> {
    return this.usersService.getProfileAsset(user.id, 'signature');
  }

  @Post('profile/signature')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: ProfileAssetResponseDto })
  uploadSignature(
    @CurrentUser() user: User,
    @UploadedFile() file: UploadedBufferFile,
  ): Promise<ProfileAssetResponseDto> {
    return this.usersService.uploadProfileAsset({
      userId: user.id,
      key: 'signature',
      file,
    });
  }

  @Delete('profile/signature')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileAssetResponseDto })
  deleteSignature(@CurrentUser() user: User): Promise<null> {
    return this.usersService.deleteProfileAsset(user.id, 'signature');
  }

  @Get('profile/initials')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileAssetResponseDto })
  getInitials(
    @CurrentUser() user: User,
  ): Promise<ProfileAssetResponseDto | null> {
    return this.usersService.getProfileAsset(user.id, 'initials');
  }

  @Post('profile/initials')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: ProfileAssetResponseDto })
  uploadInitials(
    @CurrentUser() user: User,
    @UploadedFile() file: UploadedBufferFile,
  ): Promise<ProfileAssetResponseDto> {
    return this.usersService.uploadProfileAsset({
      userId: user.id,
      key: 'initials',
      file,
    });
  }

  @Delete('profile/initials')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileAssetResponseDto })
  deleteInitials(@CurrentUser() user: User): Promise<null> {
    return this.usersService.deleteProfileAsset(user.id, 'initials');
  }

  @Get('profile/mfa')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MfaStatusResponseDto })
  getMfaStatus(@CurrentUser() user: User): Promise<MfaStatusResponseDto> {
    return this.usersService.getMfaStatus(user.id);
  }

  @Post('profile/mfa/setup')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: MfaSetupResponseDto })
  startMfaSetup(@CurrentUser() user: User): Promise<MfaSetupResponseDto> {
    return this.usersService.startMfaSetup(user.id);
  }

  @Post('profile/mfa')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MfaStatusResponseDto })
  enableMfa(
    @CurrentUser() user: User,
    @Body() body: MfaCodeDto,
  ): Promise<MfaStatusResponseDto> {
    return this.usersService.enableMfa({
      userId: user.id,
      otpAttempt: body.otp_attempt,
    });
  }

  @Delete('profile/mfa')
  @UseGuards(JwtGuard, UserHydrationGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MfaStatusResponseDto })
  disableMfa(
    @CurrentUser() user: User,
    @Body() body: MfaCodeDto,
  ): Promise<MfaStatusResponseDto> {
    return this.usersService.disableMfa({
      userId: user.id,
      otpAttempt: body.otp_attempt,
    });
  }

  @Get('users')
  @UseGuards(JwtGuard, UserHydrationGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(AuthorizationAction.Manage, 'User'))
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'archived'] })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  listUsers(
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ): Promise<UserResponseDto[]> {
    return this.usersService.listUsers({
      accountId: user.accountId,
      status,
    });
  }

  @Post('users')
  @UseGuards(JwtGuard, UserHydrationGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(AuthorizationAction.Manage, 'User'))
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: UserResponseDto })
  createUser(
    @CurrentUser() user: User,
    @Body() body: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.createUser(user.accountId, body);
  }

  @Post('users/import')
  @UseGuards(JwtGuard, UserHydrationGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(AuthorizationAction.Manage, 'User'))
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: ImportUsersResponseDto })
  importUsers(
    @CurrentUser() user: User,
    @Body() body: ImportUsersDto,
  ): Promise<ImportUsersResponseDto> {
    return this.usersService.importUsers(user.accountId, body);
  }

  @Patch('users/:id')
  @UseGuards(JwtGuard, UserHydrationGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(AuthorizationAction.Manage, 'User'))
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  updateUser(
    @CurrentUser() currentUser: User,
    @Param('id') userId: string,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser({
      accountId: currentUser.accountId,
      userId,
      currentUserId: currentUser.id,
      input: body,
    });
  }

  @Delete('users/:id')
  @UseGuards(JwtGuard, UserHydrationGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can(AuthorizationAction.Manage, 'User'))
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  archiveUser(
    @CurrentUser() currentUser: User,
    @Param('id') userId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.archiveUser({
      accountId: currentUser.accountId,
      userId,
      currentUserId: currentUser.id,
    });
  }
}
