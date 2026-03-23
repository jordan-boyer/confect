import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { ServiceMap } from "effect";

export type ActionCtxId = "@confect/server/ActionCtx";

const actionCtx = ServiceMap.Service<
  ActionCtxId,
  GenericActionCtx<GenericDataModel>
>("@confect/server/ActionCtx");

export const ActionCtx = <_DataModel extends GenericDataModel>() => actionCtx;

export type ActionCtx<
  _DataModel extends GenericDataModel = GenericDataModel,
> = ActionCtxId;
