import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Account } from '../accounts/entities/account.entity';
import { throwIfUniqueConstraint } from '../common/utils/error';
import { User } from '../users/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessToken } from './entities/access-token.entity';
import { hashPassword, verifyPassword } from './passwords';
import { TenantContext } from './tenant-context';
import { WebSessionJwtPayload } from './web-session';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AccessToken)
    private readonly accessTokens: Repository<AccessToken>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  hashApiToken(apiToken: string): string {
    return createHash('sha256').update(apiToken).digest('hex');
  }

  async resolveApiToken(apiToken: string): Promise<TenantContext | null> {
    const accessToken = await this.accessTokens.findOne({
      where: {
        sha256: this.hashApiToken(apiToken),
      },
      relations: {
        user: {
          account: true,
        },
      },
    });

    if (
      !accessToken?.user ||
      accessToken.user.archivedAt ||
      accessToken.user.account.archivedAt
    ) {
      return null;
    }

    return {
      accountId: accessToken.user.accountId,
      userId: accessToken.userId,
      accessTokenId: accessToken.id,
    };
  }

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    const email = input.email.toLowerCase();
    const existingUser = await this.dataSource.getRepository(User).findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({ error: 'Email already exists' });
    }

    try {
      const { account, user } = await this.dataSource.transaction(
        async (manager) => {
          const accountRepository = manager.getRepository(Account);
          const userRepository = manager.getRepository(User);

          const account = accountRepository.create({
            name: input.account_name,
            timezone: input.timezone ?? 'UTC',
            locale: input.locale ?? 'en-US',
          });
          const savedAccount = await accountRepository.save(account);

          const user = userRepository.create({
            accountId: savedAccount.id,
            email,
            firstName: input.first_name,
            lastName: input.last_name,
            role: 'admin',
            encryptedPassword: await hashPassword(input.password),
          });
          const savedUser = await userRepository.save(user);

          return { account: savedAccount, user: savedUser };
        },
      );

      return this.createAuthResponse(user, account);
    } catch (error) {
      throwIfUniqueConstraint(error, 'Email already exists');
    }
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { email: input.email.toLowerCase() },
      relations: { account: true },
    });

    if (
      !user ||
      user.archivedAt ||
      user.account.archivedAt ||
      !(await verifyPassword(input.password, user.encryptedPassword))
    ) {
      throw new UnauthorizedException({ error: 'Invalid email or password' });
    }

    return this.createAuthResponse(user, user.account);
  }

  private createAuthResponse(user: User, account: Account): AuthResponseDto {
    const payload: WebSessionJwtPayload = {
      sub: user.id,
      userId: user.id,
      accountId: user.accountId,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        role: user.role,
      },
      account: {
        id: account.id,
        name: account.name,
        timezone: account.timezone,
        locale: account.locale,
      },
    };
  }
}
