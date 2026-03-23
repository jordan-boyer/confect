import { HttpApi } from "@confect/server";
import * as HttpMiddleware from "effect/unstable/http/HttpMiddleware";
import { flow } from "effect";
import { Api, ApiLive } from "./http/path-prefix";

export default HttpApi.make({
  "/path-prefix/": {
    api: Api,
    apiLive: ApiLive,
    middleware: flow(HttpMiddleware.cors(), HttpMiddleware.logger),
  },
});
