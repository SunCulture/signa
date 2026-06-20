import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin/admin.guard';
import { ApiTokenGuard } from '../auth/guards/api-token/api-token.guard';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

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

  @Get('users')
  @UseGuards(JwtGuard, UserHydrationGuard, AdminGuard)
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
  @UseGuards(JwtGuard, UserHydrationGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: UserResponseDto })
  createUser(
    @CurrentUser() user: User,
    @Body() body: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.createUser(user.accountId, body);
  }

  @Patch('users/:id')
  @UseGuards(JwtGuard, UserHydrationGuard, AdminGuard)
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
  @UseGuards(JwtGuard, UserHydrationGuard, AdminGuard)
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
