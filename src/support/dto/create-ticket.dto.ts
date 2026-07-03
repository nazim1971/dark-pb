import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { TicketCategory, TicketPriority } from "@prisma/client";

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;

  @IsEnum(TicketCategory)
  category: TicketCategory = TicketCategory.OTHER;

  @IsEnum(TicketPriority)
  priority: TicketPriority = TicketPriority.MEDIUM;
}
