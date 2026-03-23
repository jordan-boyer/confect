import * as SystemFields from "@confect/core/SystemFields";
import { Effect, Function, Schema } from "effect";
import type { ReadonlyRecord } from "effect/Record";
import type * as DataModel from "./DataModel";
import type { ReadonlyValue } from "./SchemaToValidator";
import type * as Table from "./Table";

type RowFields<
  DataModel_ extends DataModel.AnyWithProps,
  TableName extends DataModel.TableNames<DataModel_>,
> = Table.TableSchema<DataModel.TableWithName<DataModel_, TableName>>;

export type WithoutSystemFields<Doc> = Omit<Doc, "_creationTime" | "_id">;

export type Any = any;
/** Looser than `ReadonlyValue`-only so `Schema.Struct` `Encoded` index signatures assign. */
export type AnyEncoded = ReadonlyRecord<string, ReadonlyValue | unknown>;

export const decode = Function.dual<
  <
    DataModel_ extends DataModel.AnyWithProps,
    TableName extends DataModel.TableNames<DataModel_>,
  >(
    tableName: TableName,
    tableSchema: RowFields<DataModel_, TableName>,
  ) => (
    self: DataModel.TableInfoWithName_<DataModel_, TableName>["convexDocument"],
  ) => Effect.Effect<
    DataModel.TableInfoWithName_<DataModel_, TableName>["document"],
    DocumentDecodeError,
    never
  >,
  <
    DataModel_ extends DataModel.AnyWithProps,
    TableName extends DataModel.TableNames<DataModel_>,
  >(
    self: DataModel.TableInfoWithName_<DataModel_, TableName>["convexDocument"],
    tableName: TableName,
    tableSchema: RowFields<DataModel_, TableName>,
  ) => Effect.Effect<
    DataModel.TableInfoWithName_<DataModel_, TableName>["document"],
    DocumentDecodeError,
    never
  >
>(
  3,
  <
    DataModel_ extends DataModel.AnyWithProps,
    TableName extends DataModel.TableNames<DataModel_>,
  >(
    self: DataModel.TableInfoWithName_<DataModel_, TableName>["convexDocument"],
    tableName: TableName,
    tableSchema: RowFields<DataModel_, TableName>,
  ): Effect.Effect<
    DataModel.TableInfoWithName_<DataModel_, TableName>["document"],
    DocumentDecodeError,
    never
  > =>
    Effect.gen(function* () {
      const TableSchemaWithSystemFields = SystemFields.extendWithSystemFields(
        tableName,
        tableSchema,
      );

      const encodedDoc =
        self as (typeof TableSchemaWithSystemFields)["Encoded"];

      const decodedDoc = yield* Schema.decodeUnknownEffect(
        TableSchemaWithSystemFields,
      )(encodedDoc).pipe(
        Effect.catchTag("SchemaError", (e) =>
          Effect.fail(
            new DocumentDecodeError({
              tableName,
              id: String((encodedDoc as { readonly _id?: unknown })._id),
              parseError: e.message,
            }),
          ),
        ),
      ) as Effect.Effect<
        DataModel.TableInfoWithName_<DataModel_, TableName>["document"],
        DocumentDecodeError,
        never
      >;

      return decodedDoc;
    }),
);

export const encode = Function.dual<
  <
    DataModel_ extends DataModel.AnyWithProps,
    TableName extends DataModel.TableNames<DataModel_>,
  >(
    tableName: TableName,
    tableSchema: RowFields<DataModel_, TableName>,
  ) => (
    self: DataModel.TableInfoWithName_<DataModel_, TableName>["document"],
  ) => Effect.Effect<
    DataModel.TableInfoWithName_<DataModel_, TableName>["encodedDocument"],
    DocumentEncodeError,
    never
  >,
  <
    DataModel_ extends DataModel.AnyWithProps,
    TableName extends DataModel.TableNames<DataModel_>,
  >(
    self: DataModel.TableInfoWithName_<DataModel_, TableName>["document"],
    tableName: TableName,
    tableSchema: RowFields<DataModel_, TableName>,
  ) => Effect.Effect<
    DataModel.TableInfoWithName_<DataModel_, TableName>["encodedDocument"],
    DocumentEncodeError,
    never
  >
>(
  3,
  <
    DataModel_ extends DataModel.AnyWithProps,
    TableName extends DataModel.TableNames<DataModel_>,
  >(
    self: DataModel.TableInfoWithName_<DataModel_, TableName>["document"],
    tableName: TableName,
    tableSchema: RowFields<DataModel_, TableName>,
  ): Effect.Effect<
    DataModel.TableInfoWithName_<DataModel_, TableName>["encodedDocument"],
    DocumentEncodeError,
    never
  > =>
    Effect.gen(function* () {
      type TableSchemaWithSystemFields = SystemFields.ExtendWithSystemFields<
        TableName,
        RowFields<DataModel_, TableName>
      >;

      const decodedDoc = self as TableSchemaWithSystemFields["Type"];

      const encodedDoc = yield* Schema.encodeUnknownEffect(tableSchema)(
        decodedDoc,
      ).pipe(
        Effect.catchTag("SchemaError", (e) =>
          Effect.fail(
            new DocumentEncodeError({
              tableName,
              id: String((decodedDoc as { readonly _id?: unknown })._id),
              parseError: e.message,
            }),
          ),
        ),
      ) as Effect.Effect<
        DataModel.TableInfoWithName_<DataModel_, TableName>["encodedDocument"],
        DocumentEncodeError,
        never
      >;

      return encodedDoc;
    }),
);

export class DocumentDecodeError extends Schema.TaggedErrorClass<DocumentDecodeError>()(
  "DocumentDecodeError",
  {
    tableName: Schema.String,
    id: Schema.String,
    parseError: Schema.String,
  },
) {
  get message(): string {
    return documentErrorMessage({
      id: this.id,
      tableName: this.tableName,
      message: `could not be decoded:\n\n${this.parseError}`,
    });
  }
}

export class DocumentEncodeError extends Schema.TaggedErrorClass<DocumentEncodeError>()(
  "DocumentEncodeError",
  {
    tableName: Schema.String,
    id: Schema.String,
    parseError: Schema.String,
  },
) {
  get message(): string {
    return documentErrorMessage({
      id: this.id,
      tableName: this.tableName,
      message: `could not be encoded:\n\n${this.parseError}`,
    });
  }
}

export const documentErrorMessage = ({
  id,
  tableName,
  message,
}: {
  id: string;
  tableName: string;
  message: string;
}) => `Document with ID '${id}' in table '${tableName}' ${message}`;
