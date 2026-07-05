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
import { RoyaltyQueryDto } from "../royalties/dto/royalty-query.dto";
import { royaltyFilterSchema } from "../royalties/schemas/royalties.zod";
import { StatementQueryDto } from "../statements/dto/statement-query.dto";
import { statementQuerySchema } from "../statements/schemas/statements.zod";
import { AdminService } from "./admin.service";
import { AdminActionDto } from "./dto/admin-action.dto";
import { AddIpiDto } from "./dto/add-ipi.dto";
import { AddIswcDto } from "./dto/add-iswc.dto";
import { AdminActivityQueryDto } from "./dto/admin-activity-query.dto";
import { AdminDashboardQueryDto } from "./dto/admin-dashboard-query.dto";
import { AdminKycQueryDto } from "./dto/admin-kyc-query.dto";
import { AdminReportQueryDto } from "./dto/admin-report-query.dto";
import { AdminSongsQueryDto } from "./dto/admin-songs-query.dto";
import { AdminUsersQueryDto } from "./dto/admin-users-query.dto";
import { EditWorkMetadataDto } from "./dto/edit-work-metadata.dto";
import { UpdateSongStatusDto } from "./dto/update-song-status.dto";
import { UpdateStatementStatusDto } from "./dto/update-statement-status.dto";
import {
  adminDashboardQuerySchema,
  adminKycQuerySchema,
  adminSongsQuerySchema,
  adminUsersQuerySchema,
  addIpiSchema,
  addIswcSchema,
  adminActionSchema,
  adminActivityQuerySchema,
  adminReportQuerySchema,
  editSongMetadataSchema,
  updateSongStatusSchema,
  updateStatementStatusSchema,
} from "./schemas/admin.zod";

@ApiTags("Admin")
@ApiBearerAuth()
@Roles("ADMIN")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard/stats")
  @ApiOperation({ summary: "Get dashboard statistics" })
  @ApiOkResponse({ description: "Dashboard statistics generated" })
  @UsePipes(new ZodValidationPipe(adminDashboardQuerySchema))
  async getDashboardStats(@Query() query: AdminDashboardQueryDto): Promise<unknown> {
    return this.adminService.getDashboardStats(query);
  }

  @Get("dashboard/analytics")
  @ApiOperation({ summary: "Get dashboard analytics" })
  @ApiOkResponse({ description: "Dashboard analytics generated" })
  @UsePipes(new ZodValidationPipe(adminDashboardQuerySchema))
  async getDashboardAnalytics(@Query() query: AdminDashboardQueryDto): Promise<unknown> {
    return this.adminService.getDashboardAnalytics(query);
  }

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

  @Patch("kyc/:id/verify")
  @ApiOperation({ summary: "Verify KYC" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AdminActionDto, required: false })
  @UsePipes(new ZodValidationPipe(adminActionSchema))
  async verifyKyc(
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

  @Patch("songs/:id/metadata")
  @ApiOperation({ summary: "Edit song metadata" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: EditWorkMetadataDto })
  @UsePipes(new ZodValidationPipe(editSongMetadataSchema))
  async editSongMetadata(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: EditWorkMetadataDto,
  ): Promise<unknown> {
    return this.adminService.editSongMetadata(user, id, dto);
  }

  @Patch("songs/:id/iswc")
  @ApiOperation({ summary: "Add ISWC to song" })
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

  @Get("users")
  @ApiOperation({ summary: "List users with filters, pagination and search" })
  @ApiOkResponse({ description: "Users fetched" })
  @UsePipes(new ZodValidationPipe(adminUsersQuerySchema))
  async getAllUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch("users/:id/activate")
  @ApiOperation({ summary: "Activate user" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AdminActionDto, required: false })
  @UsePipes(new ZodValidationPipe(adminActionSchema))
  async activateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.activateUser(user, id, dto);
  }

  @Patch("users/:id/suspend")
  @ApiOperation({ summary: "Suspend user" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AdminActionDto, required: false })
  @UsePipes(new ZodValidationPipe(adminActionSchema))
  async suspendUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AdminActionDto,
  ) {
    return this.adminService.suspendUser(user, id, dto);
  }

  @Get("kyc")
  @ApiOperation({ summary: "List KYC with filters, pagination and search" })
  @ApiOkResponse({ description: "KYC rows fetched" })
  @UsePipes(new ZodValidationPipe(adminKycQuerySchema))
  async listKyc(@Query() query: AdminKycQueryDto) {
    return this.adminService.listKyc(query);
  }

  @Get("songs")
  @ApiOperation({ summary: "List songs with filters, pagination and search" })
  @ApiOkResponse({ description: "Songs fetched" })
  @UsePipes(new ZodValidationPipe(adminSongsQuerySchema))
  async listSongs(@Query() query: AdminSongsQueryDto) {
    return this.adminService.listSongs(query);
  }

  @Patch("songs/:id/status")
  @ApiOperation({ summary: "Update song status" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateSongStatusDto })
  @UsePipes(new ZodValidationPipe(updateSongStatusSchema))
  async updateSongStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSongStatusDto,
  ) {
    return this.adminService.updateSongStatus(user, id, dto);
  }

  @Get("royalties")
  @ApiOperation({ summary: "List royalties with filters, pagination and search" })
  @ApiOkResponse({ description: "Royalties fetched" })
  @UsePipes(new ZodValidationPipe(royaltyFilterSchema))
  async listRoyalties(@CurrentUser() user: AuthenticatedUser, @Query() query: RoyaltyQueryDto) {
    return this.adminService.listRoyalties(user, query);
  }

  @Get("statements")
  @ApiOperation({ summary: "List statements with filters, pagination and search" })
  @ApiOkResponse({ description: "Statements fetched" })
  @UsePipes(new ZodValidationPipe(statementQuerySchema))
  async listStatements(@CurrentUser() user: AuthenticatedUser, @Query() query: StatementQueryDto) {
    return this.adminService.listStatements(user, query);
  }

  @Patch("statements/:id/status")
  @ApiOperation({ summary: "Update statement status" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateStatementStatusDto })
  @UsePipes(new ZodValidationPipe(updateStatementStatusSchema))
  async updateStatementStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatementStatusDto,
  ) {
    return this.adminService.updateStatementStatus(user, id, dto);
  }
}
