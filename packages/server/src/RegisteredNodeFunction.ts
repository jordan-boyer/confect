import type * as FunctionSpec from "@confect/core/FunctionSpec";
import {
  layer as nodeServicesLayer,
  type NodeServices,
} from "@effect/platform-node/NodeServices";
import {
  actionGeneric,
  type DefaultFunctionArgs,
  internalActionGeneric,
} from "convex/server";
import type { Effect } from "effect";
import { Layer, Match } from "effect";
import type { Codec } from "effect/Schema";
import type * as Api from "./Api";
import type * as DatabaseSchema from "./DatabaseSchema";
import type * as Handler from "./Handler";
import * as RegisteredFunction from "./RegisteredFunction";
import type * as RegistryItem from "./RegistryItem";

export const make = <Api_ extends Api.AnyWithPropsWithRuntime<"Node">>(
  api: Api_,
  { functionSpec, handler }: RegistryItem.AnyWithProps,
): RegisteredFunction.Any =>
  Match.value(functionSpec.functionProvenance).pipe(
    Match.tag("Convex", () => handler as RegisteredFunction.Any),
    Match.tag("Confect", () => {
      const { functionVisibility, functionProvenance } =
        functionSpec as FunctionSpec.AnyConfect;

      const genericFunction = Match.value(functionVisibility).pipe(
        Match.when("public", () => actionGeneric),
        Match.when("internal", () => internalActionGeneric),
        Match.exhaustive,
      );

      return genericFunction(
        nodeActionFunction(api.databaseSchema, {
          args: functionProvenance.args as Codec<
            unknown,
            DefaultFunctionArgs
          >,
          returns: functionProvenance.returns as Codec<unknown, unknown>,
          handler: handler as Handler.AnyConfectProvenance,
        }),
      );
    }),
    Match.exhaustive,
  );

const nodeActionFunction = <
  DatabaseSchema_ extends DatabaseSchema.AnyWithProps,
  Args,
  ConvexArgs extends DefaultFunctionArgs,
  Returns,
  ConvexReturns,
  E,
>(
  databaseSchema: DatabaseSchema_,
  {
    args,
    returns,
    handler,
  }: {
    args: Codec<Args, ConvexArgs>;
    returns: Codec<Returns, ConvexReturns>;
    handler: (
      a: Args,
    ) => Effect.Effect<
      Returns,
      E,
      | RegisteredFunction.ActionServices<DatabaseSchema_>
      | NodeServices
    >;
  },
) =>
  RegisteredFunction.actionFunctionBase({
    args,
    returns,
    handler,
    createLayer: (ctx) =>
      Layer.mergeAll(
        RegisteredFunction.actionLayer(databaseSchema, ctx),
        nodeServicesLayer,
      ),
  });
