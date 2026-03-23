import { Effect, FileSystem, Layer, Path, Ref, Schema, ServiceMap } from "effect";
import { ConvexDirectory } from "./ConvexDirectory";

export class ConfectDirectory extends ServiceMap.Service<
  ConfectDirectory,
  {
    readonly get: Effect.Effect<string, ConfectDirectoryNotFoundError, never>;
  }
>()("@confect/cli/services/ConfectDirectory") {}

export const ConfectDirectoryLive = Layer.effect(ConfectDirectory)(
  Effect.gen(function* () {
    const confectDirectory = yield* findConfectDirectory;
    const ref = yield* Ref.make(confectDirectory);
    return { get: Ref.get(ref) };
  }),
);

export class ConfectDirectoryNotFoundError extends Schema.TaggedErrorClass<ConfectDirectoryNotFoundError>()(
  "ConfectDirectoryNotFoundError",
  {},
) {
  get message(): string {
    return "Could not find Confect directory";
  }
}

export const findConfectDirectory = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const convexDirectory = yield* (yield* ConvexDirectory).get;

  const confectDirectory = path.join(path.dirname(convexDirectory), "confect");

  if (yield* fs.exists(confectDirectory)) {
    return confectDirectory;
  } else {
    return yield* new ConfectDirectoryNotFoundError({});
  }
});
