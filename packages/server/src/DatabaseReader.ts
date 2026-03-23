import type { GenericDatabaseReader } from "convex/server";
import { Array, Layer, ServiceMap } from "effect";
import type { BaseDatabaseReader } from "@confect/core/Types";
import * as DatabaseSchema from "./DatabaseSchema";
import type * as DataModel from "./DataModel";
import * as QueryInitializer from "./QueryInitializer";
import * as Table from "./Table";

export const make = <DatabaseSchema_ extends DatabaseSchema.AnyWithProps>(
  databaseSchema: DatabaseSchema_,
  convexDatabaseReader: GenericDatabaseReader<
    DataModel.ToConvex<DataModel.FromSchema<DatabaseSchema_>>
  >,
) => {
  type Tables = DatabaseSchema.Tables<DatabaseSchema_>;
  type IncludedTables = DatabaseSchema.IncludeSystemTables<Tables>;
  const extendedTables = DatabaseSchema.extendWithSystemTables(
    databaseSchema.tables as Table.TablesRecord<Tables>,
  );

  return {
    table: <const TableName extends Table.Name<IncludedTables>>(
      tableName: TableName,
    ) => {
      const table = Object.values(extendedTables).find(
        (def) => def.name === tableName,
      ) as Table.WithName<IncludedTables, TableName>;

      const baseDatabaseReader: BaseDatabaseReader<any> = Array.some(
        Object.values(Table.systemTables),
        (systemTableDef) => systemTableDef.name === tableName,
      )
        ? ({
            get: convexDatabaseReader.system.get,
            query: convexDatabaseReader.system.query,
          } as BaseDatabaseReader<
            DataModel.ToConvex<DataModel.FromTables<Table.SystemTables>>
          >)
        : ({
            get: convexDatabaseReader.get,
            query: convexDatabaseReader.query,
          } as BaseDatabaseReader<
            DataModel.ToConvex<DataModel.FromSchema<DatabaseSchema_>>
          >);

      return QueryInitializer.make<IncludedTables, TableName>(
        tableName,
        baseDatabaseReader,
        table,
      );
    },
  };
};

/** String literal used in Effect `R` (must match `yield*` / ServiceMap). */
export type DatabaseReaderId = "@confect/server/DatabaseReader";

const databaseReaderService = ServiceMap.Service<
  DatabaseReaderId,
  ReturnType<typeof make<DatabaseSchema.AnyWithProps>>
>("@confect/server/DatabaseReader");

export const DatabaseReader = <
  DatabaseSchema_ extends DatabaseSchema.AnyWithProps,
>() =>
  databaseReaderService as unknown as ServiceMap.Service<
    DatabaseReaderId,
    ReturnType<typeof make<DatabaseSchema_>>
  >;

/** Effect context requirement for `yield*` (identifier only; matches QueryRunner pattern). */
export type DatabaseReader<
  _DatabaseSchema_ extends DatabaseSchema.AnyWithProps = DatabaseSchema.AnyWithProps,
> = DatabaseReaderId;

export const layer = <DatabaseSchema_ extends DatabaseSchema.AnyWithProps>(
  databaseSchema: DatabaseSchema_,
  convexDatabaseReader: GenericDatabaseReader<
    DataModel.ToConvex<DataModel.FromSchema<DatabaseSchema_>>
  >,
) =>
  Layer.succeed(databaseReaderService)(
    make(databaseSchema, convexDatabaseReader),
  );
