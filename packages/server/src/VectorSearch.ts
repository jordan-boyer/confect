import type {
  Expand,
  GenericActionCtx,
  NamedTableInfo,
  VectorIndexNames,
  VectorSearchQuery,
} from "convex/server";
import type { GenericId } from "convex/values";
import { Effect, Layer, ServiceMap } from "effect";
import type * as DataModel from "./DataModel";

type ConvexVectorSearch<DataModel_ extends DataModel.AnyWithProps> =
  GenericActionCtx<DataModel.ToConvex<DataModel_>>["vectorSearch"];

export const make =
  <DataModel_ extends DataModel.AnyWithProps>(
    vectorSearch: ConvexVectorSearch<DataModel_>,
  ) =>
  <
    TableName extends DataModel.TableNames<DataModel_>,
    IndexName extends VectorIndexNames<
      NamedTableInfo<DataModel.ToConvex<DataModel_>, TableName>
    >,
  >(
    tableName: TableName,
    indexName: IndexName,
    query: Expand<
      VectorSearchQuery<
        NamedTableInfo<DataModel.ToConvex<DataModel_>, TableName>,
        IndexName
      >
    >,
  ): Effect.Effect<Array<{ _id: GenericId<TableName>; _score: number }>> =>
    Effect.promise(() => vectorSearch(tableName, indexName, query));

export type VectorSearchId = "@confect/server/VectorSearch";

const vectorSearchService = ServiceMap.Service<
  VectorSearchId,
  ReturnType<typeof make<DataModel.AnyWithProps>>
>("@confect/server/VectorSearch");

export const VectorSearch = <DataModel_ extends DataModel.AnyWithProps>() =>
  vectorSearchService as unknown as ServiceMap.Service<
    VectorSearchId,
    ReturnType<typeof make<DataModel_>>
  >;

export type VectorSearch<
  _DataModel_ extends DataModel.AnyWithProps = DataModel.AnyWithProps,
> = VectorSearchId;

export const layer = <DataModel_ extends DataModel.AnyWithProps>(
  vectorSearch: ConvexVectorSearch<DataModel_>,
) => Layer.succeed(vectorSearchService)(make(vectorSearch));
