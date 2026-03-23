import { NodeFileSystem } from "@effect/platform-node";
import { Command } from "effect/unstable/cli";
import { Layer } from "effect";
import { codegen } from "./confect/codegen";
import { dev } from "./confect/dev";
import { ConfectDirectoryLive } from "./services/ConfectDirectory";
import { ConvexDirectoryLive } from "./services/ConvexDirectory";
import { ProjectRootLive } from "./services/ProjectRoot";

const CliLayer = ConfectDirectoryLive.pipe(
  Layer.provideMerge(ConvexDirectoryLive),
  Layer.provideMerge(ProjectRootLive),
  Layer.provideMerge(NodeFileSystem.layer),
);

export const confect = Command.make("confect").pipe(
  Command.withDescription("Generate and sync Confect files with Convex"),
  Command.withSubcommands([codegen, dev]),
  Command.provide(CliLayer),
);
