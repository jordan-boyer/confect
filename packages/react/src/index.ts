import { Ref } from "@confect/core";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { Match, Schema } from "effect";
import type { Decoder, Encoder } from "effect/Schema";

export const useQuery = <Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: Ref.Args<Query>,
): Ref.Returns<Query> | undefined => {
  const functionSpec = Ref.getFunctionSpec(ref);
  const functionName = Ref.getConvexFunctionName(ref);

  const encodedArgs = Match.value(functionSpec.functionProvenance).pipe(
    Match.tag("Confect", (confect) =>
      Schema.encodeSync(confect.args as Encoder<unknown>)(args),
    ),
    Match.tag("Convex", () => args),
    Match.exhaustive,
  );

  const encodedReturnsOrUndefined = useConvexQuery(
    functionName as any,
    encodedArgs,
  );

  if (encodedReturnsOrUndefined === undefined) {
    return undefined;
  }

  return Match.value(functionSpec.functionProvenance).pipe(
    Match.tag("Confect", (confect) =>
      Schema.decodeUnknownSync(confect.returns as Decoder<unknown>)(
        encodedReturnsOrUndefined,
      ),
    ),
    Match.tag("Convex", () => encodedReturnsOrUndefined),
    Match.exhaustive,
  ) as Ref.Returns<Query>;
};

export const useMutation = <Mutation extends Ref.AnyPublicMutation>(
  ref: Mutation,
) => {
  const functionSpec = Ref.getFunctionSpec(ref);
  const functionName = Ref.getConvexFunctionName(ref);
  const actualMutation = useConvexMutation(functionName as any);

  return (args: Ref.Args<Mutation>): Promise<Ref.Returns<Mutation>> =>
    Match.value(functionSpec.functionProvenance).pipe(
      Match.tag("Confect", (confect) => {
        const encodedArgs = Schema.encodeSync(confect.args as Encoder<unknown>)(
          args,
        );
        return actualMutation(encodedArgs).then(
          (result) =>
            Schema.decodeUnknownSync(confect.returns as Decoder<unknown>)(
              result,
            ) as Ref.Returns<Mutation>,
        );
      }),
      Match.tag("Convex", () => actualMutation(args as any)),
      Match.exhaustive,
    ) as Promise<Ref.Returns<Mutation>>;
};

export const useAction = <Action extends Ref.AnyPublicAction>(ref: Action) => {
  const functionSpec = Ref.getFunctionSpec(ref);
  const functionName = Ref.getConvexFunctionName(ref);
  const actualAction = useConvexAction(functionName as any);

  return (args: Ref.Args<Action>): Promise<Ref.Returns<Action>> =>
    Match.value(functionSpec.functionProvenance).pipe(
      Match.tag("Confect", (confect) => {
        const encodedArgs = Schema.encodeSync(confect.args as Encoder<unknown>)(
          args,
        );
        return actualAction(encodedArgs).then(
          (result) =>
            Schema.decodeUnknownSync(confect.returns as Decoder<unknown>)(
              result,
            ) as Ref.Returns<Action>,
        );
      }),
      Match.tag("Convex", () => actualAction(args as any)),
      Match.exhaustive,
    ) as Promise<Ref.Returns<Action>>;
};
