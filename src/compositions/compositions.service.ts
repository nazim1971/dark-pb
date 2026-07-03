import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, PublishingStatus, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { CompositionActionDto } from "./dto/composition-action.dto";
import { CompositionQueryDto } from "./dto/composition-query.dto";
import { CreateCompositionDto } from "./dto/create-composition.dto";
import {
  NestedPublisherDto,
  NestedRecordingDto,
  NestedWriterDto,
  UpsertCompositionRelationsDto,
} from "./dto/upsert-composition-relations.dto";
import { UpdateCompositionDto } from "./dto/update-composition.dto";

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class CompositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createComposition(
    user: AuthenticatedUser,
    dto: CreateCompositionDto,
  ): Promise<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>> {
    await this.assertKycApproved(user.userId);

    const status = dto.status ?? PublishingStatus.DRAFT;
    if (status !== PublishingStatus.DRAFT && status !== PublishingStatus.SUBMITTED) {
      throw new BadRequestException("New compositions can only start as DRAFT or SUBMITTED");
    }

    return this.prisma.runInTransaction(async (tx) => {
      const composition = await tx.composition.create({
        data: {
          ownerId: user.userId,
          songTitle: dto.songTitle.trim(),
          alternativeTitle: dto.alternativeTitle?.trim(),
          language: dto.language?.trim(),
          genre: dto.genre?.trim(),
          spotifyUrl: dto.spotifyUrl,
          appleMusicUrl: dto.appleMusicUrl,
          youtubeUrl: dto.youtubeUrl,
          iswc: dto.iswc?.trim(),
          isrc: dto.isrc?.trim(),
          releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
          version: dto.version?.trim(),
          status,
        },
      });

      if (dto.lyrics && dto.lyrics.trim().length > 0) {
        await tx.lyrics.create({
          data: {
            compositionId: composition.id,
            body: dto.lyrics.trim(),
            language: dto.language?.trim(),
            version: dto.version?.trim(),
          },
        });
      }

      return tx.composition.findUniqueOrThrow({
        where: { id: composition.id },
        include: { lyrics: true },
      });
    });
  }

  async updateComposition(
    user: AuthenticatedUser,
    dto: UpdateCompositionDto,
  ): Promise<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>> {
    const existing = await this.prisma.composition.findUnique({
      where: { id: dto.id },
      include: { lyrics: true },
    });

    if (!existing) {
      throw new NotFoundException("Composition not found");
    }

    this.assertCanModify(user, existing.ownerId, existing.status);

    return this.prisma.runInTransaction(async (tx) => {
      await tx.composition.update({
        where: { id: dto.id },
        data: {
          songTitle: dto.songTitle?.trim(),
          alternativeTitle: dto.alternativeTitle?.trim(),
          language: dto.language?.trim(),
          genre: dto.genre?.trim(),
          spotifyUrl: dto.spotifyUrl,
          appleMusicUrl: dto.appleMusicUrl,
          youtubeUrl: dto.youtubeUrl,
          iswc: dto.iswc?.trim(),
          isrc: dto.isrc?.trim(),
          releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
          version: dto.version?.trim(),
        },
      });

      if (dto.lyrics !== undefined) {
        if (dto.lyrics.trim().length === 0) {
          await tx.lyrics.deleteMany({
            where: { compositionId: dto.id },
          });
        } else {
          const existingLyrics = await tx.lyrics.findUnique({
            where: { compositionId: dto.id },
          });

          if (existingLyrics) {
            await tx.lyrics.update({
              where: { compositionId: dto.id },
              data: {
                body: dto.lyrics.trim(),
                language: dto.language?.trim() ?? existingLyrics.language ?? undefined,
                version: dto.version?.trim() ?? existingLyrics.version ?? undefined,
              },
            });
          } else {
            await tx.lyrics.create({
              data: {
                compositionId: dto.id,
                body: dto.lyrics.trim(),
                language: dto.language?.trim(),
                version: dto.version?.trim(),
              },
            });
          }
        }
      }

      return tx.composition.findUniqueOrThrow({
        where: { id: dto.id },
        include: { lyrics: true },
      });
    });
  }

  async submitForReview(
    user: AuthenticatedUser,
    compositionId: string,
    _: CompositionActionDto,
  ): Promise<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>> {
    const composition = await this.getOwnedComposition(user, compositionId);

    if (composition.status !== PublishingStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT compositions can be submitted");
    }

    await this.assertKycApproved(user.userId);

    return this.prisma.composition.update({
      where: { id: compositionId },
      data: { status: PublishingStatus.SUBMITTED },
      include: { lyrics: true },
    });
  }

  async revertToDraft(
    user: AuthenticatedUser,
    compositionId: string,
  ): Promise<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>> {
    const composition = await this.getOwnedComposition(user, compositionId);

    if (composition.status === PublishingStatus.PUBLISHED) {
      throw new BadRequestException("Published compositions cannot be reverted to draft");
    }

    return this.prisma.composition.update({
      where: { id: compositionId },
      data: { status: PublishingStatus.DRAFT },
      include: { lyrics: true },
    });
  }

  async approveComposition(
    adminUser: AuthenticatedUser,
    compositionId: string,
    _: CompositionActionDto,
  ): Promise<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>> {
    this.assertAdmin(adminUser);

    const composition = await this.prisma.composition.findUnique({
      where: { id: compositionId },
    });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    if (
      composition.status !== PublishingStatus.SUBMITTED &&
      composition.status !== PublishingStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException("Only submitted compositions can be approved");
    }

    return this.prisma.composition.update({
      where: { id: compositionId },
      data: { status: PublishingStatus.PUBLISHED },
      include: { lyrics: true },
    });
  }

  async rejectComposition(
    adminUser: AuthenticatedUser,
    compositionId: string,
    _: CompositionActionDto,
  ): Promise<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>> {
    this.assertAdmin(adminUser);

    const composition = await this.prisma.composition.findUnique({
      where: { id: compositionId },
    });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    if (
      composition.status !== PublishingStatus.SUBMITTED &&
      composition.status !== PublishingStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException("Only submitted compositions can be rejected");
    }

    return this.prisma.composition.update({
      where: { id: compositionId },
      data: { status: PublishingStatus.REJECTED },
      include: { lyrics: true },
    });
  }

  async getById(
    user: AuthenticatedUser,
    compositionId: string,
  ): Promise<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>> {
    const composition = await this.prisma.composition.findUnique({
      where: { id: compositionId },
      include: { lyrics: true },
    });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    if (user.role !== Role.ADMIN && composition.ownerId !== user.userId) {
      throw new ForbiddenException("You can only access your own compositions");
    }

    return composition;
  }

  async list(
    user: AuthenticatedUser,
    query: CompositionQueryDto,
  ): Promise<PaginatedResponse<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CompositionWhereInput = {
      ...(user.role === Role.ADMIN ? {} : { ownerId: user.userId }),
      ...(query.songTitle
        ? {
            songTitle: {
              contains: query.songTitle,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.language
        ? {
            language: {
              equals: query.language,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.genre
        ? {
            genre: {
              equals: query.genre,
              mode: "insensitive",
            },
          }
        : {}),
      ...(query.iswc ? { iswc: query.iswc } : {}),
      ...(query.isrc ? { isrc: query.isrc } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.composition.findMany({
        where,
        include: { lyrics: true },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.composition.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async upsertRelations(
    user: AuthenticatedUser,
    compositionId: string,
    dto: UpsertCompositionRelationsDto,
  ): Promise<
    Prisma.CompositionGetPayload<{
      include: {
        lyrics: true;
        writers: { include: { writer: true } };
        recordings: { include: { recording: true } };
        publishers: { include: { publisher: true } };
      };
    }>
  > {
    const composition = await this.prisma.composition.findUnique({
      where: { id: compositionId },
      select: {
        id: true,
        ownerId: true,
        status: true,
      },
    });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    this.assertCanModify(user, composition.ownerId, composition.status);
    this.assertShareTotals(dto.writers, dto.publishers);

    return this.prisma.runInTransaction(async (tx) => {
      const writerIds = await this.upsertWriterRelations(tx, compositionId, dto.writers);
      const recordingIds = await this.upsertRecordingRelations(tx, compositionId, dto.recordings);
      const publisherIds = await this.upsertPublisherRelations(tx, compositionId, dto.publishers);

      await tx.compositionWriter.updateMany({
        where: {
          compositionId,
          ...(writerIds.length > 0 ? { writerId: { notIn: writerIds } } : {}),
        },
        data: {
          deletedAt: new Date(),
        },
      });

      await tx.compositionRecording.updateMany({
        where: {
          compositionId,
          ...(recordingIds.length > 0 ? { recordingId: { notIn: recordingIds } } : {}),
        },
        data: {
          deletedAt: new Date(),
        },
      });

      await tx.compositionPublisher.updateMany({
        where: {
          compositionId,
          ...(publisherIds.length > 0 ? { publisherId: { notIn: publisherIds } } : {}),
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return tx.composition.findUniqueOrThrow({
        where: { id: compositionId },
        include: {
          lyrics: true,
          writers: {
            where: { deletedAt: null },
            include: { writer: true },
          },
          recordings: {
            where: { deletedAt: null },
            include: { recording: true },
          },
          publishers: {
            where: { deletedAt: null },
            include: { publisher: true },
          },
        },
      });
    });
  }

  private async upsertWriterRelations(
    tx: Prisma.TransactionClient,
    compositionId: string,
    writers: NestedWriterDto[],
  ): Promise<string[]> {
    const writerIds: string[] = [];

    for (const writerInput of writers) {
      const writer = await this.resolveOrCreateWriter(tx, writerInput);
      writerIds.push(writer.id);

      await tx.compositionWriter.upsert({
        where: {
          compositionId_writerId: {
            compositionId,
            writerId: writer.id,
          },
        },
        update: {
          controlledPublisher: writerInput.publisher?.trim(),
          writerShare: writerInput.writerShare,
          deletedAt: null,
        },
        create: {
          compositionId,
          writerId: writer.id,
          controlledPublisher: writerInput.publisher?.trim(),
          writerShare: writerInput.writerShare,
        },
      });
    }

    return writerIds;
  }

  private async upsertRecordingRelations(
    tx: Prisma.TransactionClient,
    compositionId: string,
    recordings: NestedRecordingDto[],
  ): Promise<string[]> {
    const recordingIds: string[] = [];

    for (const recordingInput of recordings) {
      const recording = await this.resolveOrCreateRecording(tx, recordingInput);
      recordingIds.push(recording.id);

      await tx.compositionRecording.upsert({
        where: {
          compositionId_recordingId: {
            compositionId,
            recordingId: recording.id,
          },
        },
        update: {
          deletedAt: null,
        },
        create: {
          compositionId,
          recordingId: recording.id,
        },
      });
    }

    return recordingIds;
  }

  private async upsertPublisherRelations(
    tx: Prisma.TransactionClient,
    compositionId: string,
    publishers: NestedPublisherDto[],
  ): Promise<string[]> {
    const publisherIds: string[] = [];

    for (const publisherInput of publishers) {
      const publisher = await this.resolveOrCreatePublisher(tx, publisherInput);
      publisherIds.push(publisher.id);

      await tx.compositionPublisher.upsert({
        where: {
          compositionId_publisherId: {
            compositionId,
            publisherId: publisher.id,
          },
        },
        update: {
          territory: publisherInput.territory?.trim(),
          sharePercentage: publisherInput.share,
          agreementFrom: publisherInput.agreementFrom
            ? new Date(publisherInput.agreementFrom)
            : null,
          agreementTo: publisherInput.agreementTo ? new Date(publisherInput.agreementTo) : null,
          deletedAt: null,
        },
        create: {
          compositionId,
          publisherId: publisher.id,
          territory: publisherInput.territory?.trim(),
          sharePercentage: publisherInput.share,
          agreementFrom: publisherInput.agreementFrom
            ? new Date(publisherInput.agreementFrom)
            : undefined,
          agreementTo: publisherInput.agreementTo
            ? new Date(publisherInput.agreementTo)
            : undefined,
        },
      });
    }

    return publisherIds;
  }

  private async resolveOrCreateWriter(
    tx: Prisma.TransactionClient,
    writerInput: NestedWriterDto,
  ): Promise<Prisma.WriterGetPayload<{ select: { id: true } }>> {
    if (writerInput.id) {
      return tx.writer.update({
        where: { id: writerInput.id },
        data: {
          legalName: writerInput.legalName.trim(),
          stageName: writerInput.stageName?.trim(),
          ipiNumber: writerInput.ipiNumber?.trim(),
          pro: writerInput.pro?.trim(),
          role: writerInput.role,
          country: writerInput.country?.trim(),
          deletedAt: null,
        },
        select: { id: true },
      });
    }

    if (writerInput.ipiNumber) {
      const existing = await tx.writer.findUnique({
        where: { ipiNumber: writerInput.ipiNumber.trim() },
        select: { id: true },
      });

      if (existing) {
        await tx.writer.update({
          where: { id: existing.id },
          data: {
            legalName: writerInput.legalName.trim(),
            stageName: writerInput.stageName?.trim(),
            pro: writerInput.pro?.trim(),
            role: writerInput.role,
            country: writerInput.country?.trim(),
            deletedAt: null,
          },
        });

        return existing;
      }
    }

    return tx.writer.create({
      data: {
        legalName: writerInput.legalName.trim(),
        stageName: writerInput.stageName?.trim(),
        ipiNumber: writerInput.ipiNumber?.trim(),
        pro: writerInput.pro?.trim(),
        role: writerInput.role,
        country: writerInput.country?.trim(),
      },
      select: { id: true },
    });
  }

  private async resolveOrCreateRecording(
    tx: Prisma.TransactionClient,
    recordingInput: NestedRecordingDto,
  ): Promise<Prisma.RecordingGetPayload<{ select: { id: true } }>> {
    if (recordingInput.id) {
      return tx.recording.update({
        where: { id: recordingInput.id },
        data: {
          isrc: recordingInput.isrc?.trim(),
          artist: recordingInput.artist.trim(),
          spotifyLink: recordingInput.spotifyLink,
          durationSecond: recordingInput.duration,
          releaseDate: recordingInput.release ? new Date(recordingInput.release) : null,
          version: recordingInput.version?.trim(),
          label: recordingInput.label?.trim(),
          deletedAt: null,
        },
        select: { id: true },
      });
    }

    if (recordingInput.isrc) {
      const existing = await tx.recording.findUnique({
        where: { isrc: recordingInput.isrc.trim() },
        select: { id: true },
      });

      if (existing) {
        await tx.recording.update({
          where: { id: existing.id },
          data: {
            artist: recordingInput.artist.trim(),
            spotifyLink: recordingInput.spotifyLink,
            durationSecond: recordingInput.duration,
            releaseDate: recordingInput.release ? new Date(recordingInput.release) : null,
            version: recordingInput.version?.trim(),
            label: recordingInput.label?.trim(),
            deletedAt: null,
          },
        });

        return existing;
      }
    }

    return tx.recording.create({
      data: {
        isrc: recordingInput.isrc?.trim(),
        artist: recordingInput.artist.trim(),
        spotifyLink: recordingInput.spotifyLink,
        durationSecond: recordingInput.duration,
        releaseDate: recordingInput.release ? new Date(recordingInput.release) : undefined,
        version: recordingInput.version?.trim(),
        label: recordingInput.label?.trim(),
      },
      select: { id: true },
    });
  }

  private async resolveOrCreatePublisher(
    tx: Prisma.TransactionClient,
    publisherInput: NestedPublisherDto,
  ): Promise<Prisma.PublisherGetPayload<{ select: { id: true } }>> {
    if (publisherInput.id) {
      return tx.publisher.update({
        where: { id: publisherInput.id },
        data: {
          publisherName: publisherInput.publisherName.trim(),
          ipi: publisherInput.ipi?.trim(),
          territory: publisherInput.territory?.trim(),
          deletedAt: null,
        },
        select: { id: true },
      });
    }

    if (publisherInput.ipi) {
      const existing = await tx.publisher.findUnique({
        where: { ipi: publisherInput.ipi.trim() },
        select: { id: true },
      });

      if (existing) {
        await tx.publisher.update({
          where: { id: existing.id },
          data: {
            publisherName: publisherInput.publisherName.trim(),
            territory: publisherInput.territory?.trim(),
            deletedAt: null,
          },
        });

        return existing;
      }
    }

    return tx.publisher.create({
      data: {
        publisherName: publisherInput.publisherName.trim(),
        ipi: publisherInput.ipi?.trim(),
        territory: publisherInput.territory?.trim(),
      },
      select: { id: true },
    });
  }

  private assertShareTotals(writers: NestedWriterDto[], publishers: NestedPublisherDto[]): void {
    const writerShareTotal = writers.reduce((sum, writer) => sum + writer.writerShare, 0);
    if (writerShareTotal > 100) {
      throw new BadRequestException("Total writer share cannot exceed 100%");
    }

    const publisherShareTotal = publishers.reduce((sum, publisher) => sum + publisher.share, 0);
    if (publisherShareTotal > 100) {
      throw new BadRequestException("Total publisher share cannot exceed 100%");
    }
  }

  private async assertKycApproved(userId: string): Promise<void> {
    const kyc = await this.prisma.kYC.findFirst({
      where: {
        userId,
        status: "APPROVED",
      },
    });

    if (!kyc) {
      throw new ForbiddenException(
        "KYC approval is required before creating/submitting compositions",
      );
    }
  }

  private assertCanModify(
    user: AuthenticatedUser,
    ownerId: string,
    status: PublishingStatus,
  ): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (ownerId !== user.userId) {
      throw new ForbiddenException("You can only modify your own compositions");
    }

    if (status === PublishingStatus.PUBLISHED) {
      throw new BadRequestException("Published compositions cannot be modified");
    }
  }

  private async getOwnedComposition(
    user: AuthenticatedUser,
    compositionId: string,
  ): Promise<Prisma.CompositionGetPayload<{ include: { lyrics: true } }>> {
    const composition = await this.prisma.composition.findUnique({
      where: { id: compositionId },
      include: { lyrics: true },
    });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    if (composition.ownerId !== user.userId && user.role !== Role.ADMIN) {
      throw new ForbiddenException("You can only perform this action on your own compositions");
    }

    return composition;
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException("Admin role is required for this action");
    }
  }
}
