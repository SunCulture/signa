import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from './authenticated-request';
import { AuthService } from './auth.service';
import {
  ApiTokenResponseDto,
  ApiTokenRevealResponseDto,
  RevealApiTokenDto,
  RotateApiTokenDto,
  UpdateApiTokenPermissionsDto,
} from './dto/api-token-response.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtGuard } from './guards/jwt/jwt.guard';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() body: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() body: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(body);
  }

  @Get('api-token')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ApiTokenResponseDto })
  apiToken(@Req() request: AuthenticatedRequest): Promise<ApiTokenResponseDto> {
    return this.authService.getUserApiToken(request.session!.userId);
  }

  @Post('api-token/reveal')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ApiTokenRevealResponseDto })
  revealApiToken(
    @Req() request: AuthenticatedRequest,
    @Body() body: RevealApiTokenDto,
  ): Promise<ApiTokenRevealResponseDto> {
    return this.authService.revealUserApiToken(
      request.session!.userId,
      body.password,
    );
  }

  @Post('api-token/rotate')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ApiTokenRevealResponseDto })
  rotateApiToken(
    @Req() request: AuthenticatedRequest,
    @Body() body: RotateApiTokenDto,
  ): Promise<ApiTokenRevealResponseDto> {
    return this.authService.rotateUserApiToken(request.session!.userId, body);
  }

  @Patch('api-token/permissions')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: ApiTokenResponseDto })
  updateApiTokenPermissions(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateApiTokenPermissionsDto,
  ): Promise<ApiTokenResponseDto> {
    return this.authService.updateUserApiTokenPermissions(
      request.session!.userId,
      body,
    );
  }
}
