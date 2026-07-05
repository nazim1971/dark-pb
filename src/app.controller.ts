import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "./auth/decorators/public.decorator";

interface HomeResponse {
  success: true;
  message: string;
}

@Controller()
export class AppController {
  @Public()
  @SkipThrottle()
  @Get()
  home(): HomeResponse {
    return {
      success: true,
      message: "Dark Lab Records API Running",
    };
  }
}
