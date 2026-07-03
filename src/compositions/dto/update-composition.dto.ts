import { PartialType } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { CreateCompositionDto } from "./create-composition.dto";

export class UpdateCompositionDto extends PartialType(CreateCompositionDto) {
  @IsUUID()
  id!: string;
}
