/**
 * After-file-edit hook: run Prettier on supported paths.
 *
 * Uses `ChildProcess` + `ChildProcessSpawner` from `effect/unstable/process`
 * with `@effect/platform-node`'s `NodeServices.layer` — the same pattern as
 * Confect node actions (e.g. `email.impl.ts`), not raw `node:child_process`.
 *
 * @see https://cursor.com/docs/agent/hooks#afterfileedit
 */
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import {
  ChildProcessSpawner,
  ExitCode,
} from "effect/unstable/process/ChildProcessSpawner";
import { Console, Effect, Schema, String } from "effect";
import { readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AfterFileEditInput = Schema.Struct({
  file_path: Schema.String,
});

/**
 * File extensions that Prettier supports
 *
 * @see https://prettier.io/docs/en/options.html
 */
const SUPPORTED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".json",
  ".jsonc",
  ".json5",
  ".yaml",
  ".yml",
  ".toml",
  ".html",
  ".htm",
  ".vue",
  ".css",
  ".scss",
  ".less",
  ".md",
  ".mdx",
  ".graphql",
  ".gql",
  ".hbs",
]);

const isSupportedFileType = (filePath: string) =>
  SUPPORTED_EXTENSIONS.has(String.toLowerCase(extname(filePath)));

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PRETTIER_BIN = resolve(REPO_ROOT, "node_modules/.bin/prettier");

const runCommandExitCode = (
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
) =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner;
    return yield* spawner.exitCode(
      ChildProcess.make(command, args, {
        cwd,
        stdin: "ignore",
        stdout: "ignore",
        stderr: "inherit",
      }),
    );
  });

const program = Effect.gen(function* () {
  const jsonString = readFileSync(0, "utf-8");
  const input = yield* Schema.decodeUnknownEffect(AfterFileEditInput)(
    JSON.parse(jsonString),
  );

  if (isSupportedFileType(input.file_path)) {
    const exitCode = yield* runCommandExitCode(
      PRETTIER_BIN,
      ["--write", input.file_path],
      REPO_ROOT,
    );

    if (exitCode === ExitCode(0)) {
      yield* Console.log("{}");
    }
  }
});

NodeRuntime.runMain(
  program.pipe(
    Effect.tapError((error) => Console.error(String(error))),
    Effect.provide(NodeServices.layer),
  ) as Effect.Effect<void, never, never>,
);
