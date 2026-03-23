import type { GroupSpec, Spec } from "@confect/core";
import { HashSet, Option, pipe, Record, Schema } from "effect";
import * as FunctionPath from "./FunctionPath";
import * as GroupPath from "./GroupPath";
import { makeGroupPaths, type GroupPaths as GroupPathsSet } from "./GroupPaths";

export const FunctionPathsSchema = Schema.HashSet(FunctionPath.FunctionPath).pipe(
  Schema.brand("@confect/cli/FunctionPaths"),
);

export type FunctionPaths = typeof FunctionPathsSchema.Type;

const wrap = (set: HashSet.HashSet<FunctionPath.FunctionPath>): FunctionPaths =>
  set as FunctionPaths;

export const make = (spec: Spec.AnyWithProps): FunctionPaths =>
  makeHelper(spec.groups, Option.none(), wrap(HashSet.empty()));

const makeHelper = (
  groups: {
    [key: string]: GroupSpec.AnyWithProps;
  },
  currentGroupPath: Option.Option<GroupPath.GroupPath>,
  apiPaths: FunctionPaths,
): FunctionPaths =>
  Record.reduce(groups, apiPaths, (acc, group, groupName) => {
    const groupPath = Option.match(currentGroupPath, {
      onNone: () => GroupPath.make([groupName]),
      onSome: (path) => GroupPath.append(path, groupName),
    });

    const accWithFunctions = Record.reduce(
      group.functions,
      acc,
      (acc_, _fn, functionName) =>
        wrap(
          HashSet.add(
            acc_,
            new FunctionPath.FunctionPath({
              groupPath,
              name: functionName,
            }),
          ),
        ),
    );

    return makeHelper(group.groups, Option.some(groupPath), accWithFunctions);
  });

export const groupPaths = (
  functionPaths: FunctionPaths,
): GroupPathsSet =>
  pipe(
    functionPaths,
    HashSet.map(FunctionPath.groupPath),
    makeGroupPaths,
  );

export const diff = (
  previousFunctions: FunctionPaths,
  currentFunctions: FunctionPaths,
): {
  functionsAdded: FunctionPaths;
  functionsRemoved: FunctionPaths;
  groupsRemoved: GroupPathsSet;
  groupsAdded: GroupPathsSet;
  groupsChanged: GroupPathsSet;
} => {
  const currentGroups = groupPaths(currentFunctions);
  const previousGroups = groupPaths(previousFunctions);

  const groupsAdded = makeGroupPaths(
    HashSet.difference(currentGroups, previousGroups),
  );
  const groupsRemoved = makeGroupPaths(
    HashSet.difference(previousGroups, currentGroups),
  );

  const functionsAdded = wrap(
    HashSet.difference(currentFunctions, previousFunctions),
  );
  const existingGroupsToWhichFunctionsWereAdded = makeGroupPaths(
    HashSet.intersection(currentGroups, groupPaths(functionsAdded)),
  );

  const functionsRemoved = wrap(
    HashSet.difference(previousFunctions, currentFunctions),
  );
  const existingGroupsToWhichFunctionsWereRemoved = makeGroupPaths(
    HashSet.intersection(previousGroups, groupPaths(functionsRemoved)),
  );

  const groupsChanged = pipe(
    existingGroupsToWhichFunctionsWereAdded,
    HashSet.union(existingGroupsToWhichFunctionsWereRemoved),
    HashSet.difference(HashSet.union(groupsAdded, groupsRemoved)),
    makeGroupPaths,
  );

  return {
    functionsAdded,
    functionsRemoved,
    groupsRemoved,
    groupsAdded,
    groupsChanged,
  };
};
