import { IsOptional, IsString, MaxLength } from "class-validator";

export class TicketReplyDto {
  @IsString()
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  internalNote?: string;
}
