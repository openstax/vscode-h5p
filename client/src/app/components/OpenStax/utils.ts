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
