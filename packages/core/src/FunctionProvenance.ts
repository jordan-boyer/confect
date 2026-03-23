import type { DefaultFunctionArgs } from "convex/server";
import { Data } from "effect";
import type { Top } from "effect/Schema";

export type FunctionProvenance = Data.TaggedEnum<{
  Confect: {
    args: Top;
    returns: Top;
  };
  Convex: {
    /** @internal */
    _args: DefaultFunctionArgs;
    /** @internal */
    _returns: any;
  };
}>;

export interface Confect<
  Args extends Top,
  Returns extends Top,
> {
  readonly _tag: "Confect";
  readonly args: Args;
  readonly returns: Returns;
}

export interface AnyConfect extends Confect<Top, Top> {}

export interface Convex<Args extends DefaultFunctionArgs, Returns> {
  readonly _tag: "Convex";
  readonly _args: Args;
  readonly _returns: Returns;
}

export interface AnyConvex extends Convex<DefaultFunctionArgs, any> {}

export const FunctionProvenance = Data.taggedEnum<FunctionProvenance>();

export const Confect = <
  Args extends Top,
  Returns extends Top,
>(
  args: Args,
  returns: Returns,
) =>
  FunctionProvenance.Confect({
    args,
    returns,
  });

export const Convex = <_Args extends DefaultFunctionArgs, _Returns>() =>
  FunctionProvenance.Convex(
    {} as {
      _args: _Args;
      _returns: _Returns;
    },
  );
