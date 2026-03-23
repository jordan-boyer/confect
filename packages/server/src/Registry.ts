import { Ref, ServiceMap } from "effect";
import type * as RegistryItem from "./RegistryItem";

export interface RegistryItems {
  readonly [key: string]: RegistryItem.AnyWithProps | RegistryItems;
}

export const Registry = ServiceMap.Reference<Ref.Ref<RegistryItems>>(
  "@confect/server/Registry",
  {
    defaultValue: () => Ref.makeUnsafe<RegistryItems>({}),
  },
);
