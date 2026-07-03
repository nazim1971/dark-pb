import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
  StreamableFile,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { AdminService } from "./admin.service";
import { AdminActionDto } from "./dto/admin-action.dto";
import { AddIpiDto } from "./dto/add-ipi.dto";
import { AddIswcDto } from "./dto/add-iswc.dto";
import { AdminActivityQueryDto } from "./dto/admin-activity-query.dto";
import { AdminReportQueryDto } from "./dto/admin-report-query.dto";
import { EditWorkMetadataDto } from "./dto/edit-work-metadata.dto";
import {
  addIpiSchema,
  addIswcSchema,
  adminActionSchema,
  adminActivityQuerySchema,
  adminReportQuerySchema,
  editWorkMetadataSchema,
} from "./schemas/admin.zod";

@ApiTags("Admin")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch("kyc/:id/approve")
  @ApiOperation({ summary: "Approve KYC" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AdminActionDto, required: false })
  @UsePipes(new ZodValidationPipe(adminActionSchema))
  async approveKyc(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AdminActionDto,
  ): Promise<unknown> {
    return this.adminService.approveKyc(user, id, dto);
  }

  @Patch("kyc/:id/reject")
  @ApiOperation({ summary: "Reject KYC" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AdminActionDto, required: false })
  @UsePipes(new ZodValidationPipe(adminActionSchema))
  async rejectKyc(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AdminActionDto,
  ): Promise<unknown> {
    return this.adminService.rejectKyc(user, id, dto);
  }

  @Patch("works/:id/approve")
  @ApiOperation({ summary: "Approve work" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AdminActionDto, required: false })
  @UsePipes(new ZodValidationPipe(adminActionSchema))
  async approveWork(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AdminActionDto,
  ): Promise<unknown> {
    return this.adminService.approveWork(user, id, dto);
  }

  @Patch("works/:id/reject")
  @ApiOperation({ summary: "Reject work" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AdminActionDto, required: false })
  @UsePipes(new ZodValidationPipe(adminActionSchema))
  async rejectWork(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AdminActionDto,
  ): Promise<unknown> {
    return this.adminService.rejectWork(user, id, dto);
  }

  @Patch("works/:id/metadata")
  @ApiOperation({ summary: "Edit work metadata" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: EditWorkMetadataDto })
  @UsePipes(new ZodValidationPipe(editWorkMetadataSchema))
  async editWorkMetadata(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: EditWorkMetadataDto,
  ): Promise<unknown> {
    return this.adminService.editWorkMetadata(user, id, dto);
  }

  @Patch("works/:id/iswc")
  @ApiOperation({ summary: "Add ISWC to work" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AddIswcDto })
  @UsePipes(new ZodValidationPipe(addIswcSchema))
  async addIswc(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AddIswcDto,
  ): Promise<unknown> {
    return this.adminService.addIswc(user, id, dto);
  }

  @Patch("writers/:id/ipi")
  @ApiOperation({ summary: "Add IPI to writer" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AddIpiDto })
  @UsePipes(new ZodValidationPipe(addIpiSchema))
  async addWriterIpi(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AddIpiDto,
  ): Promise<unknown> {
    return this.adminService.addWriterIpi(user, id, dto);
  }

  @Patch("publishers/:id/ipi")
  @ApiOperation({ summary: "Add IPI to publisher" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AddIpiDto })
  @UsePipes(new ZodValidationPipe(addIpiSchema))
  async addPublisherIpi(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AddIpiDto,
  ): Promise<unknown> {
    return this.adminService.addPublisherIpi(user, id, dto);
  }

  @Get("reports/dashboard")
  @ApiOperation({ summary: "Get admin dashboard report" })
  @ApiOkResponse({ description: "Admin dashboard report generated" })
  @UsePipes(new ZodValidationPipe(adminReportQuerySchema))
  async getDashboardReport(@Query() query: AdminReportQueryDto): Promise<unknown> {
    return this.adminService.getDashboardReport(query);
  }

  @Get("reports/activity")
  @ApiOperation({ summary: "Get admin activity log" })
  @ApiOkResponse({ description: "Admin activity fetched" })
  @UsePipes(new ZodValidationPipe(adminActivityQuerySchema))
  async getActivity(@Query() query: AdminActivityQueryDto): Promise<unknown> {
    return this.adminService.getActivity(query);
  }

  @Get("reports/export")
  @ApiOperation({ summary: "Export admin report as CSV or CWR" })
  @ApiOkResponse({ description: "Admin report exported" })
  @UsePipes(new ZodValidationPipe(adminReportQuerySchema))
  async exportDashboardReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const artifact = await this.adminService.exportDashboardReport(user, query);
    response.setHeader("Content-Type", artifact.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename=\"${artifact.fileName}\"`);
    return new StreamableFile(artifact.buffer);
  }
}
