import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { TicketQueryDto } from "./dto/ticket-query.dto";
import { TicketReplyDto } from "./dto/ticket-reply.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import {
  createTicketSchema,
  ticketQuerySchema,
  ticketReplySchema,
  ticketStatusSchema,
} from "./schemas/support.zod";
import { SupportService } from "./support.service";

@ApiTags("Support")
@ApiBearerAuth()
@Controller("support")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post("tickets")
  @ApiOperation({ summary: "Create support ticket" })
  @ApiBody({ type: CreateTicketDto })
  @ApiOkResponse({ description: "Support ticket created" })
  @UsePipes(new ZodValidationPipe(createTicketSchema))
  async createTicket(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(user, dto);
  }

  @Get("tickets")
  @ApiOperation({ summary: "List support tickets" })
  @ApiOkResponse({ description: "Support tickets fetched" })
  @UsePipes(new ZodValidationPipe(ticketQuerySchema))
  async listTickets(@CurrentUser() user: AuthenticatedUser, @Query() query: TicketQueryDto) {
    return this.supportService.listTickets(user, query);
  }

  @Get("tickets/:id")
  @ApiOperation({ summary: "Get support ticket details" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Support ticket fetched" })
  async getTicketById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.supportService.getTicketById(user, id);
  }

  @Post("tickets/:id/replies")
  @ApiOperation({ summary: "Reply to support ticket" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: TicketReplyDto })
  @ApiOkResponse({ description: "Ticket reply added" })
  @UsePipes(new ZodValidationPipe(ticketReplySchema))
  async addReply(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: TicketReplyDto,
  ) {
    return this.supportService.addReply(user, id, dto);
  }

  @Patch("tickets/:id/status")
  @Roles("ADMIN", "SONGWRITER", "COMPOSER", "ARTIST", "PUBLISHER", "RECORD_LABEL")
  @ApiOperation({ summary: "Update ticket status" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateTicketStatusDto })
  @ApiOkResponse({ description: "Ticket status updated" })
  @UsePipes(new ZodValidationPipe(ticketStatusSchema))
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.supportService.updateStatus(user, id, dto);
  }

  @Get("tickets/:id/history")
  @ApiOperation({ summary: "Get ticket history timeline" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Ticket history fetched" })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.supportService.getTicketHistory(user, id);
  }
}
