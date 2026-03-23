import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as OpenApi from "effect/unstable/httpapi/OpenApi";
import { Effect, Layer, Schema } from "effect";
import refs from "../_generated/refs";
import { QueryRunner } from "../_generated/services";
import { Notes } from "../tables/Notes";

const notesGroup = HttpApiGroup.make("notes")
  .add(
    HttpApiEndpoint.get("getFirst", "/get-first", {
      success: Schema.Option(Notes.Doc),
    }).annotate(
      OpenApi.Description,
      "Get the first note, if there is one.",
    ),
  )
  .annotate(OpenApi.Title, "Notes")
  .annotate(OpenApi.Description, "Operations on notes.");

export const Api = HttpApi.make("Api")
  .annotate(OpenApi.Title, "Confect Example")
  .annotate(
    OpenApi.Description,
    `
An example API built with Confect and powered by [Scalar](https://github.com/scalar/scalar). 

# Learn More

See Scalar's documentation on [markdown support](https://github.com/scalar/scalar/blob/main/documentation/markdown.md) and [OpenAPI spec extensions](https://github.com/scalar/scalar/blob/main/documentation/openapi.md).
	`,
  )
  .add(notesGroup)
  .prefix("/path-prefix");

const ApiGroupLive = HttpApiBuilder.group(Api, "notes", (handlers) =>
  handlers.handle("getFirst", () =>
    Effect.gen(function* () {
      const runQuery = yield* QueryRunner;

      const firstNote = yield* runQuery(
        refs.public.notesAndRandom.notes.getFirst,
        {},
      );

      return firstNote;
    }).pipe(Effect.orDie),
  ),
);

/** Satisfies `HttpApi.make` typing; Convex provides remaining services at runtime. */
export const ApiLive = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(ApiGroupLive),
) as Layer.Layer<unknown, never, never>;
