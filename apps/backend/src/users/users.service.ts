import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { hashPassword, verifyPassword } from '../auth/passwords';
import {
  throwDatabaseErrors,
  throwIfNotFound,
  throwIfUniqueConstraint,
} from '../common/utils/error';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findActiveUser(userId: string): Promise<User | null> {
    return this.users.findOne({
      where: {
        id: userId,
        archivedAt: IsNull(),
      },
      relations: {
        account: true,
      },
    });
  }

  findByEmailInAccount(options: {
    accountId: string;
    email: string;
  }): Promise<User | null> {
    return this.users.findOne({
      where: {
        accountId: options.accountId,
        email: options.email.toLowerCase(),
        archivedAt: IsNull(),
      },
    });
  }

  async listUsers(options: {
    accountId: string;
    status?: string;
  }): Promise<UserResponseDto[]> {
    const archivedAt = options.status === 'archived' ? Not(IsNull()) : IsNull();

    const users = await this.users.find({
      where: {
        accountId: options.accountId,
        archivedAt,
      },
      order: {
        id: 'DESC',
      },
    });

    return users.map((user) => this.toUserResponse(user));
  }

  async createUser(
    accountId: string,
    input: CreateUserDto,
  ): Promise<UserResponseDto> {
    const email = input.email.toLowerCase();
    const existingUser = await this.users.findOne({ where: { email } });

    if (existingUser && !existingUser.archivedAt) {
      throw new ConflictException({ error: 'Email already exists' });
    }

    const user = existingUser ?? this.users.create({ email });
    const password = input.password ?? randomBytes(16).toString('hex');

    this.users.merge(user, {
      accountId,
      email,
      firstName: input.first_name,
      lastName: input.last_name,
      role: this.normalizeRole(input.role),
      encryptedPassword: await hashPassword(password),
      archivedAt: null,
    });

    try {
      return this.toUserResponse(await this.users.save(user));
    } catch (error) {
      throwIfUniqueConstraint(error, 'Email already exists');
    }
  }

  async updateUser(options: {
    accountId: string;
    userId: string;
    currentUserId: string;
    input: UpdateUserDto;
  }): Promise<UserResponseDto> {
    const user = await this.findAccountUserOrFail(
      options.accountId,
      options.userId,
    );
    const input = options.input;

    if (input.email) {
      await this.ensureEmailAvailable(input.email, user.id);
      user.email = input.email.toLowerCase();
    }

    user.firstName = input.first_name ?? user.firstName;
    user.lastName = input.last_name ?? user.lastName;

    if (options.currentUserId !== user.id) {
      user.role = input.role ? this.normalizeRole(input.role) : user.role;
      user.otpRequiredForLogin =
        input.otp_required_for_login ?? user.otpRequiredForLogin;
    }

    if (input.password && options.currentUserId !== user.id) {
      user.encryptedPassword = await hashPassword(input.password);
    }

    try {
      return this.toUserResponse(await this.users.save(user));
    } catch (error) {
      throwIfUniqueConstraint(error, 'Email already exists');
    }
  }

  async updateProfile(options: {
    userId: string;
    input: UpdateProfileDto;
  }): Promise<UserResponseDto> {
    const user = await this.findUserOrFail(options.userId);
    const input = options.input;

    if (input.email) {
      await this.ensureEmailAvailable(input.email, user.id);
      user.email = input.email.toLowerCase();
    }

    user.firstName = input.first_name ?? user.firstName;
    user.lastName = input.last_name ?? user.lastName;

    try {
      return this.toUserResponse(await this.users.save(user));
    } catch (error) {
      throwIfUniqueConstraint(error, 'Email already exists');
    }
  }

  async updatePassword(options: {
    userId: string;
    input: UpdatePasswordDto;
  }): Promise<UserResponseDto> {
    const user = await this.findUserOrFail(options.userId);
    const input = options.input;

    if (input.password !== input.password_confirmation) {
      throw new UnprocessableEntityException({
        error: 'Password confirmation does not match',
      });
    }

    if (
      !(await verifyPassword(input.current_password, user.encryptedPassword))
    ) {
      throw new ForbiddenException({ error: 'Current password is incorrect' });
    }

    user.encryptedPassword = await hashPassword(input.password);

    try {
      return this.toUserResponse(await this.users.save(user));
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  async archiveUser(options: {
    accountId: string;
    userId: string;
    currentUserId: string;
  }): Promise<UserResponseDto> {
    if (options.userId === options.currentUserId) {
      throw new ForbiddenException({ error: 'Unable to remove current user' });
    }

    const user = await this.findAccountUserOrFail(
      options.accountId,
      options.userId,
    );
    user.archivedAt = new Date();

    try {
      return this.toUserResponse(await this.users.save(user));
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  private async ensureEmailAvailable(
    email: string,
    userId: string,
  ): Promise<void> {
    const existingUser = await this.users.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException({ error: 'Email already exists' });
    }
  }

  private async findAccountUserOrFail(
    accountId: string,
    userId: string,
  ): Promise<User> {
    try {
      return await this.users.findOneByOrFail({
        id: userId,
        accountId,
      });
    } catch (error) {
      throwIfNotFound(error, 'User not found');
    }
  }

  private async findUserOrFail(userId: string): Promise<User> {
    try {
      return await this.users.findOneByOrFail({ id: userId });
    } catch (error) {
      throwIfNotFound(error, 'User not found');
    }
  }

  private normalizeRole(role: string | undefined): string {
    return role === 'admin' ? role : 'admin';
  }

  toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      role: user.role,
      archived_at: user.archivedAt,
    };
  }
}
