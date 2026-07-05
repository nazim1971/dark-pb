import { PartialType } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { CreateWriterDto } from "./create-writer.dto";

export class UpdateWriterDto extends PartialType(CreateWriterDto) {
  @IsUUID()
  id!: string;
}
