import { Controller } from "@nestjs/common";
import { RecordingsService } from "./recordings.service";

@Controller("recordings")
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}
}
