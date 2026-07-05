import { PartialType } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { CreateSongDto, SongWriterSplitDto } from "./create-song.dto";

export class UpdateSongDto extends PartialType(CreateSongDto) {
  @IsUUID()
  id!: string;

  @IsOptional()
  writers?: SongWriterSplitDto[];
}
