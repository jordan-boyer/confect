import {
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  pipe,
  Ref,
  Schema,
  ServiceMap,
} from "effect";
import { ProjectRoot } from "./ProjectRoot";

export class ConvexDirectory extends ServiceMap.Service<
  ConvexDirectory,
  {
    readonly get: Effect.Effect<string, ConvexDirectoryNotFoundError, never>;
  }
>()("@confect/cli/services/ConvexDirectory") {}

export const ConvexDirectoryLive = Layer.effect(ConvexDirectory)(
  Effect.gen(function* () {
    const convexDirectory = yield* findConvexDirectory;
    const ref = yield* Ref.make(convexDirectory);
    return { get: Ref.get(ref) };
  }),
);

export class ConvexDirectoryNotFoundError extends Schema.TaggedErrorClass<ConvexDirectoryNotFoundError>()(
  "ConvexDirectoryNotFoundError",
  {},
) {
  get message(): string {
    return "Could not find Convex directory";
  }
}

/**
 * Schema for `convex.json` configuration file.
 * @see https://docs.convex.dev/production/project-configuration
 */
const ConvexJsonFromString = Schema.fromJsonString(
  Schema.Struct({
    functions: Schema.optional(Schema.String),
  }),
);

const findConvexDirectory = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const projectRoot = yield* (yield* ProjectRoot).get;

  const defaultPath = path.join(projectRoot, "convex");

  const convexJsonPath = path.join(projectRoot, "convex.json");

  const hasConvexJson = yield* fs.exists(convexJsonPath);
  const convexDirectory = hasConvexJson
    ? yield* fs.readFileString(convexJsonPath).pipe(
        Effect.flatMap((raw) =>
          Schema.decodeUnknownEffect(ConvexJsonFromString)(raw),
        ),
        Effect.map((config) =>
          pipe(
            Option.fromUndefinedOr(config.functions),
            Option.map((functionsDir) => path.join(projectRoot, functionsDir)),
            Option.getOrElse(() => defaultPath),
          ),
        ),
      )
    : defaultPath;

  if (yield* fs.exists(convexDirectory)) {
    return convexDirectory;
  } else {
    return yield* new ConvexDirectoryNotFoundError({});
  }
});
