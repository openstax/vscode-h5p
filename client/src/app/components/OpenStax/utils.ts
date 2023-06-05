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
