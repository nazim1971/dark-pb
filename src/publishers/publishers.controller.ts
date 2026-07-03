import { Controller } from "@nestjs/common";
import { PublishersService } from "./publishers.service";

@Controller("publishers")
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}
}
