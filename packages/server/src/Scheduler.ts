import type {
  OptionalRestArgs,
  SchedulableFunctionReference,
  Scheduler as ConvexScheduler,
} from "convex/server";
import { DateTime, Duration, Effect, Layer, ServiceMap } from "effect";

const make = (scheduler: ConvexScheduler) => ({
  runAfter: <FuncRef extends SchedulableFunctionReference>(
    delay: Duration.Duration,
    functionReference: FuncRef,
    ...args: OptionalRestArgs<FuncRef>
  ) => {
    const delayMs = Duration.toMillis(delay);

    return Effect.promise(() =>
      scheduler.runAfter(delayMs, functionReference, ...args),
    );
  },
  runAt: <FuncRef extends SchedulableFunctionReference>(
    dateTime: DateTime.DateTime,
    functionReference: FuncRef,
    ...args: OptionalRestArgs<FuncRef>
  ) => {
    const timestamp = DateTime.toEpochMillis(dateTime);

    return Effect.promise(() =>
      scheduler.runAt(timestamp, functionReference, ...args),
    );
  },
});

const schedulerService = ServiceMap.Service<
  "@confect/server/Scheduler",
  ReturnType<typeof make>
>("@confect/server/Scheduler");

export const Scheduler = schedulerService;

export type Scheduler = ServiceMap.Service.Identifier<typeof schedulerService>;

export const layer = (scheduler: ConvexScheduler) =>
  Layer.succeed(schedulerService)(make(scheduler));
