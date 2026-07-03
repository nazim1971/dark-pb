import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { Prisma, PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private static queryEventHandlerRegistered = false;
  private readonly logger = new Logger(PrismaService.name);
  private readonly client: PrismaClient;
  private readonly delegateCache = new Map<string, unknown>();

  constructor() {
    this.client = new PrismaClient({
      log: PrismaService.resolveLogConfig(),
    });

    this.registerQueryLogger();
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  // async enableShutdownHooks(app: INestApplication): Promise<void> {
  //   (this.client.$on as unknown as (eventType: string, callback: () => Promise<void>) => void)(
  //     "beforeExit",
  //     async () => {
  //       await app.close();
  //     },
  //   );
  // }

  get user(): PrismaClient["user"] {
    return this.getDelegate("user", "User");
  }

  get company(): PrismaClient["company"] {
    return this.getDelegate("company", "Company");
  }

  get kYC(): PrismaClient["kYC"] {
    return this.getDelegate("kYC", "KYC");
  }

  get composition(): PrismaClient["composition"] {
    return this.getDelegate("composition", "Composition");
  }

  get writer(): PrismaClient["writer"] {
    return this.getDelegate("writer", "Writer");
  }

  get recording(): PrismaClient["recording"] {
    return this.getDelegate("recording", "Recording");
  }

  get publisher(): PrismaClient["publisher"] {
    return this.getDelegate("publisher", "Publisher");
  }

  get lyrics(): PrismaClient["lyrics"] {
    return this.getDelegate("lyrics", "Lyrics");
  }

  get contract(): PrismaClient["contract"] {
    return this.getDelegate("contract", "Contract");
  }

  get royalty(): PrismaClient["royalty"] {
    return this.getDelegate("royalty", "Royalty");
  }

  get statement(): PrismaClient["statement"] {
    return this.getDelegate("statement", "Statement");
  }

  get conflict(): PrismaClient["conflict"] {
    return this.getDelegate("conflict", "Conflict");
  }

  get ticket(): PrismaClient["ticket"] {
    return this.getDelegate("ticket", "Ticket");
  }

  get ticketReply(): PrismaClient["ticketReply"] {
    return this.getDelegate("ticketReply", "TicketReply");
  }

  get notification(): PrismaClient["notification"] {
    return this.getDelegate("notification", "Notification");
  }

  get auditLog(): PrismaClient["auditLog"] {
    return this.getDelegate("auditLog", "AuditLog");
  }

  get compositionWriter(): PrismaClient["compositionWriter"] {
    return this.getDelegate("compositionWriter", "CompositionWriter");
  }

  get compositionPublisher(): PrismaClient["compositionPublisher"] {
    return this.getDelegate("compositionPublisher", "CompositionPublisher");
  }

  get compositionRecording(): PrismaClient["compositionRecording"] {
    return this.getDelegate("compositionRecording", "CompositionRecording");
  }

  get contractComposition(): PrismaClient["contractComposition"] {
    return this.getDelegate("contractComposition", "ContractComposition");
  }

  get statementRoyalty(): PrismaClient["statementRoyalty"] {
    return this.getDelegate("statementRoyalty", "StatementRoyalty");
  }

  get session(): PrismaClient["session"] {
    return this.getDelegate("session", "Session");
  }

  $transaction<P extends Prisma.PrismaPromise<unknown>[]>(
    arg: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<{ [K in keyof P]: Awaited<P[K]> }>;
  $transaction<R>(
    fn: (prisma: Prisma.TransactionClient) => Promise<R>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<R>;
  $transaction(
    arg: Prisma.PrismaPromise<unknown>[] | ((prisma: Prisma.TransactionClient) => Promise<unknown>),
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<unknown> {
    return (this.client.$transaction as typeof this.client.$transaction)(
      arg as never,
      options as never,
    );
  }

  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T> {
    return this.client.$queryRaw<T>(query);
  }

  $executeRaw(query: Prisma.Sql): Promise<number> {
    return this.client.$executeRaw(query);
  }

  async runInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.client.$transaction((tx) => operation(tx), options);
  }

  async runBatchInTransaction<T>(operations: Prisma.PrismaPromise<T>[]): Promise<T[]> {
    return this.client.$transaction(operations);
  }

  private registerQueryLogger(): void {
    if (PrismaService.queryEventHandlerRegistered || !PrismaService.isQueryLoggingEnabled()) {
      return;
    }

    (
      this.client.$on as unknown as (
        eventType: string,
        callback: (event: Prisma.QueryEvent) => void,
      ) => void
    )("query", (event: Prisma.QueryEvent) => {
      this.logger.debug(`[${event.duration}ms] ${event.query} | params=${event.params}`);
    });

    PrismaService.queryEventHandlerRegistered = true;
  }

  private getDelegate<TDelegate>(
    delegateName: DelegateName,
    modelName: SoftDeleteModelName,
  ): TDelegate {
    const cachedDelegate = this.delegateCache.get(delegateName);
    if (cachedDelegate) {
      return cachedDelegate as TDelegate;
    }

    const delegate = this.client[delegateName] as unknown as Record<string, unknown>;
    const wrappedDelegate = new Proxy(delegate, {
      get: (target, property, receiver) => {
        const originalValue = Reflect.get(target, property, receiver);

        if (typeof property !== "string" || typeof originalValue !== "function") {
          return originalValue;
        }

        if (!SOFT_DELETE_MODELS.has(modelName)) {
          return originalValue.bind(target);
        }

        return this.wrapDelegateMethod(target, property, originalValue as DelegateMethod);
      },
    });

    this.delegateCache.set(delegateName, wrappedDelegate);
    return wrappedDelegate as TDelegate;
  }

  private withNotDeletedFilter(where: unknown): Record<string, unknown> {
    if (!where || typeof where !== "object") {
      return { deletedAt: null };
    }

    const currentWhere = where as Record<string, unknown>;
    return {
      AND: [currentWhere, { deletedAt: null }],
    };
  }

  private static resolveLogConfig(): Prisma.LogDefinition[] {
    const baseLogs: Prisma.LogDefinition[] = [
      { emit: "stdout", level: "warn" },
      { emit: "stdout", level: "error" },
    ];

    if (!PrismaService.isQueryLoggingEnabled()) {
      return baseLogs;
    }

    return [...baseLogs, { emit: "event", level: "query" }];
  }

  private static isQueryLoggingEnabled(): boolean {
    return process.env.PRISMA_LOG_QUERIES === "true" || process.env.NODE_ENV === "development";
  }

  private wrapDelegateMethod(
    target: Record<string, unknown>,
    methodName: string,
    method: DelegateMethod,
  ) {
    if (methodName === "findUnique") {
      return (args?: QueryArgs) =>
        (target.findFirst as DelegateMethod).call(target, this.mergeWhereArgs(args));
    }

    if (methodName === "findUniqueOrThrow") {
      return (args?: QueryArgs) =>
        (target.findFirstOrThrow as DelegateMethod).call(target, this.mergeWhereArgs(args));
    }

    if (READ_ACTIONS.has(methodName)) {
      return (args?: QueryArgs) => method.call(target, this.mergeWhereArgs(args));
    }

    if (methodName === "delete") {
      return (args: MutationArgs) =>
        (target.update as DelegateMethod).call(target, {
          ...args,
          data: {
            ...(args?.data ?? {}),
            deletedAt: new Date(),
          },
        });
    }

    if (methodName === "deleteMany") {
      return (args?: MutationArgs) =>
        (target.updateMany as DelegateMethod).call(target, {
          ...args,
          where: this.withNotDeletedFilter(args?.where),
          data: {
            ...(args?.data ?? {}),
            deletedAt: new Date(),
          },
        });
    }

    if (methodName === "updateMany") {
      return (args?: MutationArgs) =>
        method.call(target, {
          ...args,
          where: this.withNotDeletedFilter(args?.where),
        });
    }

    return method.bind(target);
  }

  private mergeWhereArgs(args?: QueryArgs): QueryArgs {
    return {
      ...(args ?? {}),
      where: this.withNotDeletedFilter(args?.where),
    };
  }
}

type DelegateName =
  | "user"
  | "company"
  | "kYC"
  | "composition"
  | "writer"
  | "recording"
  | "publisher"
  | "lyrics"
  | "contract"
  | "royalty"
  | "statement"
  | "conflict"
  | "ticket"
  | "ticketReply"
  | "notification"
  | "auditLog"
  | "compositionWriter"
  | "compositionPublisher"
  | "compositionRecording"
  | "contractComposition"
  | "statementRoyalty"
  | "session";

type SoftDeleteModelName =
  | "User"
  | "Company"
  | "KYC"
  | "Composition"
  | "Writer"
  | "Recording"
  | "Publisher"
  | "Lyrics"
  | "Contract"
  | "Royalty"
  | "Statement"
  | "Conflict"
  | "Ticket"
  | "TicketReply"
  | "Notification"
  | "AuditLog"
  | "CompositionWriter"
  | "CompositionPublisher"
  | "CompositionRecording"
  | "ContractComposition"
  | "StatementRoyalty"
  | "Session";

type QueryArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

type MutationArgs = QueryArgs;

type DelegateMethod = (...args: unknown[]) => unknown;

const SOFT_DELETE_MODELS = new Set<SoftDeleteModelName>([
  "User",
  "Company",
  "KYC",
  "Composition",
  "Writer",
  "Recording",
  "Publisher",
  "Lyrics",
  "Contract",
  "Royalty",
  "Statement",
  "Conflict",
  "Ticket",
  "TicketReply",
  "Notification",
  "AuditLog",
  "CompositionWriter",
  "CompositionPublisher",
  "CompositionRecording",
  "ContractComposition",
  "StatementRoyalty",
  "Session",
]);

const READ_ACTIONS = new Set<string>([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
