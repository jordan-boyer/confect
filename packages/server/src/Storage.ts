import type {
  StorageActionWriter as ConvexStorageActionWriter,
  StorageReader as ConvexStorageReader,
  StorageWriter as ConvexStorageWriter,
} from "convex/server";
import type { GenericId } from "convex/values";
import { Effect, flow, Layer, Option, pipe, Schema, ServiceMap } from "effect";

const makeStorageReader = (storageReader: ConvexStorageReader) => ({
  getUrl: (storageId: GenericId<"_storage">) =>
    Effect.promise(() => storageReader.getUrl(storageId)).pipe(
      Effect.andThen(
        flow(
          Option.fromNullishOr,
          Option.match({
            onNone: () => Effect.fail(new BlobNotFoundError({ id: storageId })),
            onSome: (doc) =>
              pipe(
                doc,
                Schema.decodeUnknownEffect(Schema.URL),
                Effect.orDie,
              ),
          }),
        ),
      ),
    ),
});

const makeStorageWriter = (storageWriter: ConvexStorageWriter) => ({
  generateUploadUrl: () =>
    Effect.promise(() => storageWriter.generateUploadUrl()).pipe(
      Effect.andThen((url) =>
        pipe(url, Schema.decodeUnknownEffect(Schema.URL), Effect.orDie),
      ),
    ),
  delete: (storageId: GenericId<"_storage">) =>
    Effect.tryPromise({
      try: () => storageWriter.delete(storageId),
      catch: () => new BlobNotFoundError({ id: storageId }),
    }),
});

const makeStorageActionWriter = (
  storageActionWriter: ConvexStorageActionWriter,
) => ({
  get: (storageId: GenericId<"_storage">) =>
    Effect.promise(() => storageActionWriter.get(storageId)).pipe(
      Effect.andThen(
        flow(
          Option.fromNullishOr,
          Option.match({
            onNone: () => Effect.fail(new BlobNotFoundError({ id: storageId })),
            onSome: Effect.succeed,
          }),
        ),
      ),
    ),
  store: (blob: Blob, options?: { sha256?: string }) =>
    Effect.promise(() => storageActionWriter.store(blob, options)),
});

export class StorageReader extends ServiceMap.Service<
  StorageReader,
  ReturnType<typeof makeStorageReader>
>()("@confect/server/Storage/StorageReader") {
  static readonly layer = (storageReader: ConvexStorageReader) =>
    Layer.succeed(StorageReader)(makeStorageReader(storageReader));
}

export class StorageWriter extends ServiceMap.Service<
  StorageWriter,
  ReturnType<typeof makeStorageWriter>
>()("@confect/server/Storage/StorageWriter") {
  static readonly layer = (storageWriter: ConvexStorageWriter) =>
    Layer.succeed(StorageWriter)(makeStorageWriter(storageWriter));
}

export class StorageActionWriter extends ServiceMap.Service<
  StorageActionWriter,
  ReturnType<typeof makeStorageActionWriter>
>()("@confect/server/Storage/StorageActionWriter") {
  static readonly layer = (storageActionWriter: ConvexStorageActionWriter) =>
    Layer.succeed(StorageActionWriter)(
      makeStorageActionWriter(storageActionWriter),
    );
}

export class BlobNotFoundError extends Schema.TaggedErrorClass<BlobNotFoundError>()(
  "BlobNotFoundError",
  {
    id: Schema.String,
  },
) {
  get message(): string {
    return `File with ID '${this.id}' not found`;
  }
}
