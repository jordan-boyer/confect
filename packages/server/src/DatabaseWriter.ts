import type {
  BetterOmit,
  DocumentByName,
  Expand,
  GenericDatabaseWriter,
  WithoutSystemFields as ConvexWithoutSystemFields,
} from "convex/server";
import type { GenericId } from "convex/values";
import { Effect, Layer, pipe, Record, ServiceMap } from "effect";
import type * as DatabaseSchema from "./DatabaseSchema";
import type * as DataModel from "./DataModel";
import type { DocumentByName as DocumentByName_ } from "./DataModel";
import * as Document from "./Document";
import * as QueryInitializer from "./QueryInitializer";
import type * as Table from "./Table";

export const make = <DatabaseSchema_ extends DatabaseSchema.AnyWithProps>(
  databaseSchema: DatabaseSchema_,
  convexDatabaseWriter: GenericDatabaseWriter<
    DataModel.ToConvex<DataModel.FromSchema<DatabaseSchema_>>
  >,
) => {
  type DataModel_ = DataModel.FromSchema<DatabaseSchema_>;
  const tables = databaseSchema.tables as Record<string, Table.AnyWithProps>;

  const table = <const TableName extends DataModel.TableNames<DataModel_>>(
    tableName: TableName,
  ) => {
    const tableDef = tables[tableName]!;
    const insert = (
      document: Document.WithoutSystemFields<
        DocumentByName_<DataModel_, TableName>
      >,
    ) =>
      Effect.gen(function* () {
        const encodedDocument = yield* Document.encode(
          document,
          tableName,
          tableDef.Fields,
        );

        const id = yield* Effect.promise(() =>
          convexDatabaseWriter.insert(
            tableName,
            encodedDocument as ConvexWithoutSystemFields<
              DocumentByName<DataModel.ToConvex<DataModel_>, TableName>
            >,
          ),
        );

        return id;
      });

    const patch = (
      id: GenericId<TableName>,
      patchedValues: Partial<
        Document.WithoutSystemFields<DocumentByName_<DataModel_, TableName>>
      >,
    ) =>
      Effect.gen(function* () {
        const originalDecodedDoc = yield* QueryInitializer.getById(
          tableName,
          convexDatabaseWriter as any,
          tableDef,
        )(id);

        const updatedEncodedDoc = yield* pipe(
          patchedValues,
          Record.reduce(originalDecodedDoc, (acc, value, key) =>
            value === undefined
              ? Record.remove(acc, key)
              : Record.set(acc, key, value),
          ),
          Document.encode(tableName, tableDef.Fields),
        );

        yield* Effect.promise(() =>
          convexDatabaseWriter.replace(
            id,
            updatedEncodedDoc as Expand<
              BetterOmit<
                DocumentByName<DataModel.ToConvex<DataModel_>, TableName>,
                "_creationTime" | "_id"
              >
            >,
          ),
        );
      });

    const replace = (
      id: GenericId<TableName>,
      value: Document.WithoutSystemFields<DocumentByName_<DataModel_, TableName>>,
    ) =>
      Effect.gen(function* () {
        const updatedEncodedDoc = yield* Document.encode(
          value,
          tableName,
          tableDef.Fields,
        );

        yield* Effect.promise(() =>
          convexDatabaseWriter.replace(
            id,
            updatedEncodedDoc as Expand<
              BetterOmit<
                DocumentByName<DataModel.ToConvex<DataModel_>, TableName>,
                "_creationTime" | "_id"
              >
            >,
          ),
        );
      });

    const delete_ = (id: GenericId<TableName>) =>
      Effect.promise(() => convexDatabaseWriter.delete(id));

    return {
      insert,
      patch,
      replace,
      delete: delete_,
    };
  };

  return {
    table,
  };
};

export type DatabaseWriterId = "@confect/server/DatabaseWriter";

const databaseWriterService = ServiceMap.Service<
  DatabaseWriterId,
  ReturnType<typeof make<DatabaseSchema.AnyWithProps>>
>("@confect/server/DatabaseWriter");

export const DatabaseWriter = <
  DatabaseSchema_ extends DatabaseSchema.AnyWithProps,
>() =>
  databaseWriterService as unknown as ServiceMap.Service<
    DatabaseWriterId,
    ReturnType<typeof make<DatabaseSchema_>>
  >;

export type DatabaseWriter<
  _DatabaseSchema_ extends DatabaseSchema.AnyWithProps = DatabaseSchema.AnyWithProps,
> = DatabaseWriterId;

export const layer = <DatabaseSchema_ extends DatabaseSchema.AnyWithProps>(
  databaseSchema: DatabaseSchema_,
  convexDatabaseWriter: GenericDatabaseWriter<
    DataModel.ToConvex<DataModel.FromSchema<DatabaseSchema_>>
  >,
) =>
  Layer.succeed(databaseWriterService)(
    make(databaseSchema, convexDatabaseWriter),
  );
