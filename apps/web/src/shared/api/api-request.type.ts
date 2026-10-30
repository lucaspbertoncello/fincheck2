import type { z } from 'zod';

export namespace ApiRequest {
  export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  // A query value as the screen writes it: the text booleans of the contract ('true') are plain
  // booleans here, and the client turns them back into text.
  type LooseBoolean<T> = [T] extends ['true' | 'false' | undefined] ? boolean | undefined : T;

  export type QueryInput<S> = S extends z.ZodType
    ? { [K in keyof z.input<S>]: LooseBoolean<z.input<S>[K]> }
    : never;

  export type BodyInput<S> = S extends z.ZodType ? z.input<S> : never;

  export type Output<S> = S extends z.ZodType ? z.output<S> : void;

  // What every read hook accepts besides its own arguments.
  export interface ReadOptions {
    enabled?: boolean;
    // For tasks the screen watches (sync run, backup): milliseconds, or `false` to stop.
    refetchInterval?: number | false;
  }
}
