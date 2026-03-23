import { HashSet, Schema } from "effect";
import * as GroupPath from "./GroupPath";

export const GroupPathsSchema = Schema.HashSet(GroupPath.GroupPath).pipe(
  Schema.brand("@confect/cli/GroupPaths"),
);

export type GroupPaths = typeof GroupPathsSchema.Type;

export const makeGroupPaths = (set: HashSet.HashSet<GroupPath.GroupPath>): GroupPaths =>
  set as GroupPaths;
