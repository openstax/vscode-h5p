export function assertTrue(v: boolean, msg: string) {
  if (!v) throw new Error(msg);
}

export function assertValue<T>(
  v: T | null | undefined,
  message = 'Expected a value but did not get anything',
) {
  if (v !== null && v !== undefined) return v;
  /* istanbul ignore next */
  throw new Error(`BUG: assertValue. Message: ${message}`);
}

export function assertType<T>(
  v: unknown,
  type: string,
  message = 'Got unexpected type',
): T {
  if (typeof v === type) return v as T;
  /* istanbul ignore next */
  throw new Error(`BUG: assertType. Message: ${message}`);
}

export function unwrap<T>(opt: T | null | undefined): T {
  return assertValue(opt, 'BUG: unwrap optional without value.');
}

export function chunk<T>(arr: T[], chunkSize: number): Array<T[]> {
  return [...range(Math.ceil(arr.length / chunkSize))]
    .map((n) => n * chunkSize)
    .map((offset) => arr.slice(offset, offset + chunkSize));
}

export function range(a: number, b?: number) {
  return b === undefined
    ? [...new Array(a)].map((_, idx) => idx)
    : [...new Array(b - a)].map((_, idx) => idx + a);
}

export function isFalsy<T>(obj: T): boolean {
  return (typeof obj === 'boolean' ? obj : Boolean(obj)) === false;
}

export function debounce<A = unknown, R = void>(
  fn: (args: A) => R,
  ms: number,
): (args: A) => Promise<R> {
  let timer: NodeJS.Timeout;

  return (args: A) => {
    clearTimeout(timer);

    return new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(fn(args));
      }, ms);
    });
  };
}
