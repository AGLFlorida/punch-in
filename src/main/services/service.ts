import type { PunchinDatabase } from "./data";

export interface ServiceInterface<T> {
  db: PunchinDatabase | null;
  getOne: (id: number) => T
  get: () => T[]
  set: (data: T[]) => boolean
}