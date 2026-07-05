import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { SupportService } from "./support.service";

@ApiTags("Support")
@Controller("support")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Public()
  @Get("contact")
  @ApiOperation({ summary: "Get support contact details (email and WhatsApp)" })
  @ApiOkResponse({ description: "Support contact information returned" })
  getContact() {
    return this.supportService.getContactInfo();
  }
}
