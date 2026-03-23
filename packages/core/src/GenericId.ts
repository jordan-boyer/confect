import type { GenericId as ConvexGenericId } from "convex/values";
import { Option, Schema, SchemaAST } from "effect";
import type { Schema as SchemaType } from "effect/Schema";

const ConvexId = Symbol.for("ConvexId");

export const GenericId = <TableName extends string>(
  tableName: TableName,
): SchemaType<ConvexGenericId<TableName>> =>
  Schema.String.pipe(
    Schema.annotate({ [ConvexId]: tableName } as any),
  ) as unknown as SchemaType<ConvexGenericId<TableName>>;

export type GenericId<TableName extends string> = ConvexGenericId<TableName>;

export const tableName = <TableName extends string>(
  ast: SchemaAST.AST,
): Option.Option<TableName> => {
  const resolved = SchemaAST.resolve(ast) as Record<PropertyKey, unknown> | undefined;
  const value =
    resolved && typeof resolved === "object"
      ? (resolved as Record<PropertyKey, unknown>)[ConvexId]
      : undefined;
  return value !== undefined && value !== null
    ? Option.some(value as TableName)
    : Option.none();
};
