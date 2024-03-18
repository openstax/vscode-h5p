import { recursiveMerge } from '../../utils';

export type Yanker = (
  content: Partial<unknown>,
) => [Partial<unknown>, Partial<unknown>];

export function yankByKeys(
  content: Partial<unknown>,
  keys: string[],
): [Partial<unknown>, Partial<unknown>] {
  const publicData: Record<string, unknown> = {};
  const privateData: Record<string, unknown> = {};
  Object.entries(content).forEach(([k, v]) => {
    if (keys.includes(k)) {
      privateData[k] = v;
    } else {
      publicData[k] = v;
    }
  });
  return [publicData, privateData];
}

export const yankByKeysFactory = (...keys: string[]) => {
  return (content: Partial<unknown>): [Partial<unknown>, Partial<unknown>] =>
    yankByKeys(content, keys);
};

export const chain =
  (a: Yanker, b: Yanker): Yanker =>
  (content) => {
    const [pub1, priv1] = a(content);
    const [pub2, priv2] = b(pub1);
    return [pub2, recursiveMerge(priv1, priv2) as Partial<unknown>];
  };
