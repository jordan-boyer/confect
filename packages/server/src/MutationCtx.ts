import type { GenericDataModel, GenericMutationCtx } from "convex/server";
import { ServiceMap } from "effect";

export type MutationCtxId = "@confect/server/MutationCtx";

const mutationCtx = ServiceMap.Service<
  MutationCtxId,
  GenericMutationCtx<GenericDataModel>
>("@confect/server/MutationCtx");

export const MutationCtx = <_DataModel extends GenericDataModel>() =>
  mutationCtx;

export type MutationCtx<
  _DataModel extends GenericDataModel = GenericDataModel,
> = MutationCtxId;
