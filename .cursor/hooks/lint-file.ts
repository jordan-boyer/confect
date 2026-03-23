/**
 * After-file-edit hook: run ESLint --fix on supported paths.
 *
 * Same `ChildProcessSpawner` + `ChildProcess.make` pattern as `format-file.ts`.
 *
 * @see https://cursor.com/docs/agent/hooks#afterfileedit
 */
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, Schema, String } from "effect";
import * as ChildProcess from "effect/unstable/process/ChildProcess";
import {
  ChildProcessSpawner,
  ExitCode,
} from "effect/unstable/process/ChildProcessSpawner";
import { readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AfterFileEditInput = Schema.Struct({
  file_path: Schema.String,
});

/**
 * File extensions that ESLint supports in this project
 *
 * @see eslint.config.mjs
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
  ".md",
  ".mdx",
]);

const isSupportedFileType = (filePath: string) =>
  SUPPORTED_EXTENSIONS.has(String.toLowerCase(extname(filePath)));

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ESLINT_BIN = resolve(REPO_ROOT, "node_modules/.bin/eslint");

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
      ESLINT_BIN,
      ["--fix", "--cache", "--cache-strategy", "content", input.file_path],
      REPO_ROOT,
    );

    // https://eslint.org/docs/latest/use/command-line-interface#exit-codes
    if (exitCode === ExitCode(2)) {
      return yield* Effect.die(
        new Error(
          "ESLint encountered a configuration problem or internal error",
        ),
      );
    }

    yield* Console.log("{}");
  }
});

NodeRuntime.runMain(
  program.pipe(
    Effect.tapError((error) => Console.error(String(error))),
    Effect.provide(NodeServices.layer),
  ) as Effect.Effect<void, never, never>,
);
