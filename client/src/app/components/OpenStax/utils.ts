export function* range(a: number, b?: number) {
  if (b === undefined) {
    for (let i = 0; i < a; i++) yield i;
  } else {
    for (let i = a; i < b; i++) yield i;
  }
}

export function collect<T>(iterable: Iterable<T>) {
  return [...iterable];
}

export function chunk<T>(arr: T[], chunkSize: number): Array<T[]> {
  return [...range(Math.ceil(arr.length / chunkSize))]
    .map((n) => n * chunkSize)
    .map((offset) => arr.slice(offset, offset + chunkSize));
}

export function debounce<A = unknown, R = void>(
  fn: (args: A) => R,
  ms: number
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

export function assertValue<T>(
  v: T | null | undefined,
  message = 'Expected a value but did not get anything'
) {
  if (v !== null && v !== undefined) return v;
  /* istanbul ignore next */
  throw new Error(`BUG: assertValue. Message: ${message}`);
}

export function assertType<T>(
  v: unknown,
  type: string,
  message = 'Got unexpected type'
): T {
  if (typeof v === type) return v as T;
  /* istanbul ignore next */
  throw new Error(`BUG: assertType. Message: ${message}`);
}
