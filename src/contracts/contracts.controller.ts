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
import { AttachContractCompositionsDto } from "./dto/attach-contract-compositions.dto";
import { ContractActionDto } from "./dto/contract-action.dto";
import { ContractQueryDto } from "./dto/contract-query.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import {
  attachContractCompositionsSchema,
  contractActionSchema,
  contractQuerySchema,
  createContractSchema,
  updateContractSchema,
} from "./schemas/contracts.zod";
import { ContractsService } from "./contracts.service";

@ApiTags("Contracts")
@ApiBearerAuth()
@Controller("contracts")
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @ApiOperation({ summary: "Create contract" })
  @ApiBody({ type: CreateContractDto })
  @ApiOkResponse({ description: "Contract created" })
  @UsePipes(new ZodValidationPipe(createContractSchema))
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContractDto) {
    return this.contractsService.create(user, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update contract" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateContractDto })
  @ApiOkResponse({ description: "Contract updated" })
  @UsePipes(new ZodValidationPipe(updateContractSchema.omit({ id: true })))
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.update(user, id, dto);
  }

  @Post(":id/approve")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Approve contract (admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: ContractActionDto, required: false })
  @ApiOkResponse({ description: "Contract approved" })
  @UsePipes(new ZodValidationPipe(contractActionSchema))
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() action: ContractActionDto,
  ) {
    return this.contractsService.approve(user, id, action);
  }

  @Patch(":id/compositions")
  @ApiOperation({ summary: "Attach contract to compositions" })
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: AttachContractCompositionsDto })
  @ApiOkResponse({ description: "Contract compositions attached" })
  @UsePipes(new ZodValidationPipe(attachContractCompositionsSchema))
  async attachToCompositions(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: AttachContractCompositionsDto,
  ) {
    return this.contractsService.attachToCompositions(user, id, dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get contract by id" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Contract fetched" })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.contractsService.getById(user, id);
  }

  @Get()
  @ApiOperation({ summary: "List contracts with filters and pagination" })
  @ApiOkResponse({ description: "Contracts fetched" })
  @UsePipes(new ZodValidationPipe(contractQuerySchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ContractQueryDto) {
    return this.contractsService.list(user, query);
  }
}
