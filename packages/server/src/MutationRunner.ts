import * as Ref from "@confect/core/Ref";
import { type GenericMutationCtx } from "convex/server";
import { Effect, Layer, Match, Schema, ServiceMap } from "effect";
import type { SchemaError } from "effect/Schema";

const make =
  (runMutation: GenericMutationCtx<any>["runMutation"]) =>
  <Mutation extends Ref.AnyMutation>(
    mutation: Mutation,
    args: Ref.Args<Mutation>,
  ): Effect.Effect<Ref.Returns<Mutation>, SchemaError, never> =>
    Effect.gen(function* () {
      const functionSpec = Ref.getFunctionSpec(mutation);
      const functionName = Ref.getConvexFunctionName(mutation);

      return yield* (Match.value(functionSpec.functionProvenance).pipe(
        Match.tag("Confect", (confectFunctionSpec) =>
          Effect.gen(function* () {
            const encodedArgs = yield* Schema.encodeUnknownEffect(
              confectFunctionSpec.args,
            )(args);
            const encodedReturns = yield* Effect.promise(() =>
              runMutation(functionName as any, encodedArgs),
            );
            return yield* Schema.decodeUnknownEffect(
              confectFunctionSpec.returns,
            )(encodedReturns);
          }),
        ),
        Match.tag("Convex", () =>
          Effect.promise(() => runMutation(functionName as any, args as any)),
        ),
        Match.exhaustive,
      ) as Effect.Effect<Ref.Returns<Mutation>, SchemaError, never>);
    });

const mutationRunnerService = ServiceMap.Service<
  "@confect/server/MutationRunner",
  ReturnType<typeof make>
>("@confect/server/MutationRunner");

export const MutationRunner = mutationRunnerService;

export type MutationRunner =
  ServiceMap.Service.Identifier<typeof mutationRunnerService>;

export const layer = (runMutation: GenericMutationCtx<any>["runMutation"]) =>
  Layer.succeed(mutationRunnerService)(make(runMutation));

export class MutationRollback extends Schema.TaggedErrorClass<MutationRollback>()(
  "MutationRollback",
  {
    mutationName: Schema.String,
    error: Schema.Unknown,
  },
) {
  /* v8 ignore start */
  get message(): string {
    return `Mutation ${this.mutationName} failed and was rolled back.\n\n${String(this.error)}`;
  }
  /* v8 ignore stop */
}
