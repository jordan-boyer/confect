import type * as HttpApiDef from "effect/unstable/httpapi/HttpApi";
import * as HttpApiScalar from "effect/unstable/httpapi/HttpApiScalar";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import type { HttpMiddleware } from "effect/unstable/http/HttpMiddleware";
import {
  type HttpRouter as ConvexHttpRouter,
  type GenericActionCtx,
  type GenericDataModel,
  httpActionGeneric,
  httpRouter,
  ROUTABLE_HTTP_METHODS,
  type RouteSpecWithPathPrefix,
} from "convex/server";
import { Array, ConfigProvider, Layer, Record, pipe } from "effect";
import * as ActionCtx from "./ActionCtx";
import * as ActionRunner from "./ActionRunner";
import * as Auth from "./Auth";
import * as ConvexConfigProvider from "./ConvexConfigProvider";
import * as MutationRunner from "./MutationRunner";
import * as QueryRunner from "./QueryRunner";
import * as Scheduler from "./Scheduler";
import { StorageActionWriter, StorageReader, StorageWriter } from "./Storage";

type ApiLiveRequirements<DataModel extends GenericDataModel> =
  | QueryRunner.QueryRunner
  | MutationRunner.MutationRunner
  | ActionRunner.ActionRunner
  | Scheduler.Scheduler
  | Auth.Auth
  | StorageReader
  | StorageWriter
  | StorageActionWriter
  | GenericActionCtx<DataModel>;

type Middleware = HttpMiddleware;

const makeHandler =
  <DataModel extends GenericDataModel>({
    pathPrefix,
    api,
    apiLive,
    middleware,
    scalar,
  }: {
    pathPrefix: RoutePath;
    api: HttpApiDef.AnyWithProps;
    apiLive: Layer.Layer<unknown, never, ApiLiveRequirements<DataModel>>;
    middleware?: Middleware;
    scalar?: HttpApiScalar.ScalarConfig;
  }) =>
  (ctx: GenericActionCtx<DataModel>, request: Request): Promise<Response> => {
    const ApiLive = apiLive.pipe(
      Layer.provide(
        Layer.mergeAll(
          QueryRunner.layer(ctx.runQuery),
          MutationRunner.layer(ctx.runMutation),
          ActionRunner.layer(ctx.runAction),
          Scheduler.layer(ctx.scheduler),
          Auth.layer(ctx.auth),
          StorageReader.layer(ctx.storage),
          StorageWriter.layer(ctx.storage),
          StorageActionWriter.layer(ctx.storage),
          Layer.succeed(ActionCtx.ActionCtx<DataModel>())(
            ctx as unknown as GenericActionCtx<GenericDataModel>,
          ),
        ),
      ),
    );

    const ApiDocsLive = HttpApiScalar.layer(api, {
      path: `${pathPrefix}docs`,
      scalar: {
        baseServerURL: `${process.env["CONVEX_SITE_URL"]}${pathPrefix}`,
        ...scalar,
      },
    }).pipe(Layer.provide(ApiLive));

    const EnvLive = Layer.mergeAll(
      ApiLive,
      ApiDocsLive,
      ConfigProvider.layer(ConvexConfigProvider.make()),
    );

    const { handler } = HttpRouter.toWebHandler(EnvLive as any, {
      ...(middleware ? { middleware } : {}),
    }) as unknown as {
      readonly handler: (request: Request) => Promise<Response>;
    };

    return handler(request);
  };

const makeHttpAction = <DataModel extends GenericDataModel>({
  pathPrefix,
  api,
  apiLive,
  middleware,
  scalar,
}: {
  pathPrefix: RoutePath;
  api: HttpApiDef.AnyWithProps;
  apiLive: Layer.Layer<unknown, never, ApiLiveRequirements<DataModel>>;
  middleware?: Middleware;
  scalar?: HttpApiScalar.ScalarConfig;
}) =>
  httpActionGeneric(
    makeHandler<DataModel>({
      pathPrefix,
      api,
      apiLive,
      ...(middleware ? { middleware } : {}),
      ...(scalar ? { scalar } : {}),
    }) as unknown as (
      ctx: GenericActionCtx<GenericDataModel>,
      request: Request,
    ) => Promise<Response>,
  );

export type HttpApi_ = {
  api: HttpApiDef.AnyWithProps;
  apiLive: Layer.Layer<unknown, never, ApiLiveRequirements<GenericDataModel>>;
  middleware?: Middleware;
  scalar?: HttpApiScalar.ScalarConfig;
};

export type RoutePath = "/" | `/${string}/`;

const mountEffectHttpApi =
  <DataModel extends GenericDataModel>({
    pathPrefix,
    api,
    apiLive,
    middleware,
    scalar,
  }: {
    pathPrefix: RoutePath;
    api: HttpApiDef.AnyWithProps;
    apiLive: Layer.Layer<unknown, never, ApiLiveRequirements<DataModel>>;
    middleware?: Middleware;
    scalar?: HttpApiScalar.ScalarConfig;
  }) =>
  (convexHttpRouter: ConvexHttpRouter): ConvexHttpRouter => {
    const handler = makeHttpAction<DataModel>({
      pathPrefix,
      api,
      apiLive,
      ...(middleware ? { middleware } : {}),
      ...(scalar ? { scalar } : {}),
    });

    Array.forEach(ROUTABLE_HTTP_METHODS, (method) => {
      const routeSpec: RouteSpecWithPathPrefix = {
        pathPrefix,
        method,
        handler,
      };
      convexHttpRouter.route(routeSpec);
    });

    return convexHttpRouter;
  };

type HttpApis = Partial<Record<RoutePath, HttpApi_>>;

export const make = (httpApis: HttpApis): ConvexHttpRouter => {
  applyMonkeyPatches();

  return pipe(
    httpApis as Record<RoutePath, HttpApi_>,
    Record.toEntries,
    Array.reduce(
      httpRouter(),
      (convexHttpRouter, [pathPrefix, { api, apiLive, middleware, scalar }]) =>
        mountEffectHttpApi({
          pathPrefix: pathPrefix as RoutePath,
          api,
          apiLive,
          ...(middleware ? { middleware } : {}),
          ...(scalar ? { scalar } : {}),
        })(convexHttpRouter),
    ),
  );
};

const applyMonkeyPatches = () => {
  // These are necessary until the Convex runtime supports these APIs. See https://discord.com/channels/1019350475847499849/1281364098419785760

  // eslint-disable-next-line no-global-assign
  URL = class extends URL {
    override get username() {
      return "";
    }
    override get password() {
      return "";
    }
  };

  Object.defineProperty(Request.prototype, "signal", {
    get: () => new AbortSignal(),
  });
};
