import { NodeFileSystem } from "@effect/platform-node";
import {
  Array,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Ref,
  Schema,
  ServiceMap,
} from "effect";

export class ProjectRoot extends ServiceMap.Service<
  ProjectRoot,
  {
    readonly get: Effect.Effect<string, ProjectRootNotFoundError, never>;
  }
>()("@confect/cli/services/ProjectRoot") {}

export const ProjectRootLive = Layer.effect(ProjectRoot)(
  Effect.gen(function* () {
    const projectRoot = yield* findProjectRoot;
    const ref = yield* Ref.make(projectRoot);
    return { get: Ref.get(ref) };
  }),
).pipe(Layer.provide(NodeFileSystem.layer));

export const findProjectRoot = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const startDir = path.resolve(".");
  const root = path.parse(startDir).root;

  const directories = Array.unfold(startDir, (dir) =>
    dir === root
      ? Option.none()
      : Option.some([dir, path.dirname(dir)] as const),
  );

  const projectRoot = yield* Effect.findFirst(directories, (dir) =>
    fs.exists(path.join(dir, "package.json")),
  );

  return yield* Option.match(projectRoot, {
    onNone: () => Effect.fail(new ProjectRootNotFoundError({})),
    onSome: Effect.succeed,
  });
});

export class ProjectRootNotFoundError extends Schema.TaggedErrorClass<ProjectRootNotFoundError>()(
  "ProjectRootNotFoundError",
  {},
) {
  get message(): string {
    return "Could not find project root (no 'package.json' found)";
  }
}
