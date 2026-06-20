import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { User } from '../users/entities/user.entity';
import { ListSubmittersQueryDto } from './dto/list-submitters-query.dto';
import {
  SubmitterResponseDto,
  SubmittersListResponseDto,
} from './dto/submitter-response.dto';
import { UpdateSubmitterDto } from './dto/update-submitter.dto';
import { SubmittersService } from './submitters.service';

@Controller('submitters')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Submitters')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class SubmittersController {
  constructor(private readonly submittersService: SubmittersService) {}

  @Get()
  @ApiQuery({ name: 'submission_id', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'slug', required: false })
  @ApiQuery({ name: 'completed_after', required: false })
  @ApiQuery({ name: 'completed_before', required: false })
  @ApiQuery({ name: 'external_id', required: false })
  @ApiQuery({ name: 'application_key', required: false })
  @ApiQuery({ name: 'template_id', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false })
  @ApiQuery({ name: 'before', required: false })
  @ApiQuery({ name: 'include', required: false })
  @ApiOkResponse({ type: SubmittersListResponseDto })
  listSubmitters(
    @CurrentUser() user: User,
    @Query() query: ListSubmittersQueryDto,
  ): Promise<SubmittersListResponseDto> {
    return this.submittersService.listSubmitters(user, query);
  }

  @Get(':id')
  @ApiQuery({ name: 'include', required: false })
  @ApiOkResponse({ type: SubmitterResponseDto })
  getSubmitter(
    @CurrentUser() user: User,
    @Param('id') submitterId: string,
    @Query('include') include?: string,
  ): Promise<SubmitterResponseDto> {
    return this.submittersService.getSubmitter(user, submitterId, include);
  }

  @Put(':id')
  @ApiQuery({ name: 'include', required: false })
  @ApiOkResponse({ type: SubmitterResponseDto })
  updateSubmitter(
    @CurrentUser() user: User,
    @Param('id') submitterId: string,
    @Body() body: UpdateSubmitterDto,
    @Query('include') include?: string,
  ): Promise<SubmitterResponseDto> {
    return this.submittersService.updateSubmitter(
      user,
      submitterId,
      body,
      include,
    );
  }
}
