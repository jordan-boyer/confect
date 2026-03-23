import * as Ref from "@confect/core/Ref";
import { type GenericQueryCtx } from "convex/server";
import { Effect, Layer, Match, Schema, ServiceMap } from "effect";
import type { SchemaError } from "effect/Schema";

const make =
  (runQuery: GenericQueryCtx<any>["runQuery"]) =>
  <Query extends Ref.AnyQuery>(
    query: Query,
    args: Ref.Args<Query>,
  ): Effect.Effect<Ref.Returns<Query>, SchemaError, never> =>
    Effect.gen(function* () {
      const functionSpec = Ref.getFunctionSpec(query);
      const functionName = Ref.getConvexFunctionName(query);

      return yield* (Match.value(functionSpec.functionProvenance).pipe(
        Match.tag("Confect", (confectFunctionSpec) =>
          Effect.gen(function* () {
            const encodedArgs = yield* Schema.encodeUnknownEffect(
              confectFunctionSpec.args,
            )(args);
            const encodedReturns = yield* Effect.promise(() =>
              runQuery(functionName as any, encodedArgs),
            );
            return yield* Schema.decodeUnknownEffect(
              confectFunctionSpec.returns,
            )(encodedReturns);
          }),
        ),
        Match.tag("Convex", () =>
          Effect.promise(() => runQuery(functionName as any, args as any)),
        ),
        Match.exhaustive,
      ) as Effect.Effect<Ref.Returns<Query>, SchemaError, never>);
    });

const queryRunnerService = ServiceMap.Service<
  "@confect/server/QueryRunner",
  ReturnType<typeof make>
>("@confect/server/QueryRunner");

export const QueryRunner = queryRunnerService;

export type QueryRunner = ServiceMap.Service.Identifier<typeof queryRunnerService>;

export const layer = (runQuery: GenericQueryCtx<any>["runQuery"]) =>
  Layer.succeed(queryRunnerService)(make(runQuery));
