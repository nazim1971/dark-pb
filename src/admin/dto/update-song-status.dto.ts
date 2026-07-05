import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { SongStatus } from "@prisma/client";

export class UpdateSongStatusDto {
  @IsEnum(SongStatus)
  status!: SongStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
