import * as Ref from "@confect/core/Ref";
import { type GenericActionCtx } from "convex/server";
import { Effect, Layer, Match, Schema, ServiceMap } from "effect";
import type { SchemaError } from "effect/Schema";

const make =
  (runAction: GenericActionCtx<any>["runAction"]) =>
  <Action extends Ref.AnyAction>(
    action: Action,
    args: Ref.Args<Action>,
  ): Effect.Effect<Ref.Returns<Action>, SchemaError, never> =>
    Effect.gen(function* () {
      const functionSpec = Ref.getFunctionSpec(action);
      const functionName = Ref.getConvexFunctionName(action);

      return yield* (Match.value(functionSpec.functionProvenance).pipe(
        Match.tag("Confect", (confectFunctionSpec) =>
          Effect.gen(function* () {
            const encodedArgs = yield* Schema.encodeUnknownEffect(
              confectFunctionSpec.args,
            )(args);
            const encodedReturns = yield* Effect.promise(() =>
              runAction(functionName as any, encodedArgs),
            );
            return yield* Schema.decodeUnknownEffect(
              confectFunctionSpec.returns,
            )(encodedReturns);
          }),
        ),
        Match.tag("Convex", () =>
          Effect.promise(() => runAction(functionName as any, args as any)),
        ),
        Match.exhaustive,
      ) as Effect.Effect<Ref.Returns<Action>, SchemaError, never>);
    });

const actionRunnerService = ServiceMap.Service<
  "@confect/server/ActionRunner",
  ReturnType<typeof make>
>("@confect/server/ActionRunner");

export const ActionRunner = actionRunnerService;

export type ActionRunner = ServiceMap.Service.Identifier<typeof actionRunnerService>;

export const layer = (runAction: GenericActionCtx<any>["runAction"]) =>
  Layer.succeed(actionRunnerService)(make(runAction));
