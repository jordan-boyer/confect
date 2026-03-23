import type {
  Expand,
  IdField,
  SystemFields as NonIdSystemFields,
} from "convex/server";
import { Schema } from "effect";
import type { GenericId as ConvexGenericId } from "convex/values";
import type { Schema as SchemaType } from "effect/Schema";
import * as GenericId from "./GenericId";

type SystemFieldsSchema<TableName extends string> = Schema.Struct<{
  readonly _id: SchemaType<ConvexGenericId<TableName>>;
  readonly _creationTime: typeof Schema.Number;
}>;

/**
 * Produces a schema for Convex system fields.
 */
export const SystemFields = <TableName extends string>(
  tableName: TableName,
): SystemFieldsSchema<TableName> =>
  Schema.Struct({
    _id: GenericId.GenericId(tableName),
    _creationTime: Schema.Number,
  });

/**
 * Extend a table schema with Convex system fields.
 */
export const extendWithSystemFields = <
  TableName extends string,
  TableSchema extends Schema.Struct<Schema.Struct.Fields>,
>(
  tableName: TableName,
  schema: TableSchema,
): ExtendWithSystemFields<TableName, TableSchema> =>
  Schema.Struct({
    ...SystemFields(tableName).fields,
    ...schema.fields,
  }) as unknown as ExtendWithSystemFields<TableName, TableSchema>;

/**
 * Extend a table schema with Convex system fields at the type level.
 */
export type ExtendWithSystemFields<
  TableName extends string,
  TableSchema extends Schema.Struct<Schema.Struct.Fields>,
> = Schema.Struct<
  SystemFieldsSchema<TableName>["fields"] & TableSchema["fields"]
>;

export type WithSystemFields<TableName extends string, Document> = Expand<
  Readonly<IdField<TableName>> & Readonly<NonIdSystemFields> & Document
>;
