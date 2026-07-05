import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Role, SongStatus } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { buildPaginatedItemsResponse } from "../common/helpers/response.helper";
import { PrismaService } from "../prisma/prisma.service";
import { buildPagination, buildSearchContainsFilter } from "../prisma/query-helpers";
import { CreateSongDto } from "./dto/create-song.dto";
import { SongQueryDto } from "./dto/song-query.dto";
import { UpdateSongDto } from "./dto/update-song.dto";

@Injectable()
export class SongsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateSongDto) {
    this.assertSpotifyUrlForReleased(dto.released, dto.spotifyUrl);
    this.assertSplitTotal(dto.writers);

    return this.prisma.runInTransaction(async (tx) => {
      const writerIds = dto.writers.map((writer) => writer.writerId);
      await this.assertWritersExist(tx, writerIds);

      const composition = await tx.composition.create({
        data: {
          ownerId: user.userId,
          dlrpId: await this.generateDlrpId(tx),
          released: dto.released,
          spotifyUrl: dto.spotifyUrl,
          songTitle: dto.songTitle.trim(),
          alternativeTitle: dto.alternativeTitle?.trim(),
          artistName: dto.artistName?.trim(),
          language: dto.language?.trim(),
          ipiNumber: dto.ipiNumber?.trim(),
          isrc: dto.isrc?.trim(),
          duration: dto.duration,
          releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
          songStatus: dto.status ?? SongStatus.SUBMITTED,
        },
      });

      if (dto.lyrics && dto.lyrics.trim().length > 0) {
        await tx.lyrics.create({
          data: {
            compositionId: composition.id,
            body: dto.lyrics.trim(),
            language: dto.language?.trim(),
          },
        });
      }

      for (const writer of dto.writers) {
        await tx.compositionWriter.create({
          data: {
            compositionId: composition.id,
            writerId: writer.writerId,
            writerShare: writer.splitPercentage,
          },
        });
      }

      return this.findSongOrThrow(tx, composition.id);
    });
  }

  async list(user: AuthenticatedUser, query: SongQueryDto) {
    const pagination = buildPagination(query);

    const where: Prisma.CompositionWhereInput = {
      ...(user.role === Role.ADMIN ? {} : { ownerId: user.userId }),
      ...(user.role === Role.ADMIN && query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.released !== undefined ? { released: query.released } : {}),
      ...(query.status ? { songStatus: query.status } : {}),
      ...(query.language
        ? {
            language: {
              equals: query.language,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.artistName
        ? {
            artistName: {
              contains: query.artistName,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.writerId
        ? {
            writers: {
              some: {
                writerId: query.writerId,
              },
            },
          }
        : {}),
      ...buildSearchContainsFilter(
        ["songTitle", "alternativeTitle", "artistName", "isrc", "dlrpId"],
        query.q,
      ),
    };

    const [items, total] = await Promise.all([
      this.prisma.composition.findMany({
        where,
        include: this.songInclude(),
        orderBy: { updatedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.composition.count({ where }),
    ]);

    return buildPaginatedItemsResponse(items, pagination.page, pagination.limit, total);
  }

  async getById(user: AuthenticatedUser, id: string) {
    const song = await this.prisma.composition.findUnique({
      where: { id },
      include: this.songInclude(),
    });

    if (!song) {
      throw new NotFoundException("Song not found");
    }

    this.assertCanAccessSong(user, song.ownerId);
    return song;
  }

  async update(user: AuthenticatedUser, dto: UpdateSongDto) {
    const existing = await this.prisma.composition.findUnique({ where: { id: dto.id } });
    if (!existing) {
      throw new NotFoundException("Song not found");
    }

    this.assertCanAccessSong(user, existing.ownerId);
    this.assertSpotifyUrlForReleased(
      dto.released ?? existing.released,
      dto.spotifyUrl ?? existing.spotifyUrl ?? undefined,
    );

    if (dto.writers) {
      this.assertSplitTotal(dto.writers);
    }

    return this.prisma.runInTransaction(async (tx) => {
      await tx.composition.update({
        where: { id: dto.id },
        data: {
          released: dto.released,
          spotifyUrl: dto.spotifyUrl,
          songTitle: dto.songTitle?.trim(),
          alternativeTitle: dto.alternativeTitle?.trim(),
          artistName: dto.artistName?.trim(),
          language: dto.language?.trim(),
          ipiNumber: dto.ipiNumber?.trim(),
          isrc: dto.isrc?.trim(),
          duration: dto.duration,
          releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
          songStatus: dto.status,
        },
      });

      if (dto.lyrics !== undefined) {
        if (dto.lyrics.trim().length === 0) {
          await tx.lyrics.deleteMany({
            where: { compositionId: dto.id },
          });
        } else {
          const lyrics = await tx.lyrics.findUnique({
            where: { compositionId: dto.id },
          });

          if (lyrics) {
            await tx.lyrics.update({
              where: { compositionId: dto.id },
              data: {
                body: dto.lyrics.trim(),
                language: dto.language?.trim() ?? lyrics.language ?? undefined,
              },
            });
          } else {
            await tx.lyrics.create({
              data: {
                compositionId: dto.id,
                body: dto.lyrics.trim(),
                language: dto.language?.trim(),
              },
            });
          }
        }
      }

      if (dto.writers) {
        const writerIds = dto.writers.map((writer) => writer.writerId);
        await this.assertWritersExist(tx, writerIds);

        for (const writer of dto.writers) {
          await tx.compositionWriter.upsert({
            where: {
              compositionId_writerId: {
                compositionId: dto.id,
                writerId: writer.writerId,
              },
            },
            update: {
              writerShare: writer.splitPercentage,
              deletedAt: null,
            },
            create: {
              compositionId: dto.id,
              writerId: writer.writerId,
              writerShare: writer.splitPercentage,
            },
          });
        }

        await tx.compositionWriter.updateMany({
          where: {
            compositionId: dto.id,
            writerId: {
              notIn: writerIds,
            },
          },
          data: {
            deletedAt: new Date(),
          },
        });
      }

      return this.findSongOrThrow(tx, dto.id);
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const song = await this.prisma.composition.findUnique({ where: { id } });
    if (!song) {
      throw new NotFoundException("Song not found");
    }

    this.assertCanAccessSong(user, song.ownerId);
    return this.prisma.composition.delete({ where: { id } });
  }

  private async findSongOrThrow(tx: Prisma.TransactionClient, id: string) {
    return tx.composition.findUniqueOrThrow({
      where: { id },
      include: this.songInclude(),
    });
  }

  private songInclude(): Prisma.CompositionInclude {
    return {
      lyrics: true,
      owner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      writers: {
        where: { deletedAt: null },
        include: {
          writer: true,
        },
      },
    };
  }

  private assertCanAccessSong(user: AuthenticatedUser, ownerId: string): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (ownerId !== user.userId) {
      throw new ForbiddenException("You can only access your own songs");
    }
  }

  private assertSpotifyUrlForReleased(released: boolean, spotifyUrl?: string): void {
    if (released && !spotifyUrl) {
      throw new BadRequestException("Spotify URL is required when Released is true");
    }
  }

  private assertSplitTotal(writers: Array<{ splitPercentage: number }>): void {
    const total = writers.reduce((sum, writer) => sum + writer.splitPercentage, 0);
    if (total !== 100) {
      throw new BadRequestException("Total split percentage must equal exactly 100%");
    }
  }

  private async assertWritersExist(
    tx: Prisma.TransactionClient,
    writerIds: string[],
  ): Promise<void> {
    const uniqueWriterIds = [...new Set(writerIds)];
    if (uniqueWriterIds.length !== writerIds.length) {
      throw new BadRequestException("Writer list contains duplicates");
    }

    const count = await tx.writer.count({
      where: {
        id: {
          in: writerIds,
        },
      },
    });

    if (count !== writerIds.length) {
      throw new BadRequestException("One or more writers are invalid");
    }
  }

  private async generateDlrpId(tx: Prisma.TransactionClient): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `DLRP-${Date.now()}-${Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0")}`;

      const exists = await tx.composition.findFirst({
        where: {
          dlrpId: candidate,
        },
        select: { id: true },
      });

      if (!exists) {
        return candidate;
      }
    }

    throw new BadRequestException("Unable to generate a unique DLRP ID");
  }
}
