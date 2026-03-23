import type { GenericDataModel, GenericQueryCtx } from "convex/server";
import { ServiceMap } from "effect";

export type QueryCtxId = "@confect/server/QueryCtx";

const queryCtx = ServiceMap.Service<
  QueryCtxId,
  GenericQueryCtx<GenericDataModel>
>("@confect/server/QueryCtx");

export const QueryCtx = <_DataModel extends GenericDataModel>() => queryCtx;

export type QueryCtx<_DataModel extends GenericDataModel = GenericDataModel> =
  QueryCtxId;
