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

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
export async function digestMessage(
  message: string,
  options?: { algorithm?: string }
) {
  const { algorithm = 'SHA-1' } = options ?? {};
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest(algorithm, msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(''); // convert bytes to hex string
  return hashHex;
}

export async function randomId(options?: {
  salt?: string;
  maxLength?: number;
  message?: string;
  algorithm?: string;
}) {
  const {
    salt = Date.now().toString(),
    maxLength = Infinity,
    message = '',
  } = options ?? {};
  const hash = await digestMessage(`${salt} ${message}`, options);
  return hash.slice(0, maxLength);
}
