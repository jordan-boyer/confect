import type { Expand } from "convex/server";
import { Schema } from "effect";
import { describe, expect, expectTypeOf, test } from "vitest";
import { GenericId } from "../src/GenericId";
import * as SystemFields from "../src/SystemFields";

describe("extendWithSystemFields", () => {
  test("extends a struct with system fields", () => {
    const NoteSchema = Schema.Struct({
      content: Schema.String,
    });

    const ExtendedNoteSchema = SystemFields.extendWithSystemFields(
      "notes",
      NoteSchema,
    );

    const Expected = Schema.Struct({
      content: Schema.String,
      _id: GenericId("notes"),
      _creationTime: Schema.Number,
    });

    type Expected = typeof Expected;

    const Actual = ExtendedNoteSchema;
    type Actual = typeof Actual;

    const extendedNote = {
      content: "Hello, world!",
      _id: "abc123" as GenericId<"notes">,
      _creationTime: 1234567890,
    };

    expect(() =>
      Schema.decodeUnknownSync(Actual as any)(extendedNote),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(Expected as any)(extendedNote),
    ).not.toThrow();

    expectTypeOf<Expand<Actual["Encoded"]>>().toEqualTypeOf<
      Expected["Encoded"]
    >();
    expectTypeOf<Expand<Actual["Type"]>>().toEqualTypeOf<Expected["Type"]>();
  });

});
