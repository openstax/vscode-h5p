export type Yanker = (content: any) => [unknown, unknown];
export type Unyanker = (publicData: any, privateData: any) => unknown;

function yankByKeys(content: any, keys: string[]): [unknown, unknown] {
  const publicData: Record<string, any> = {};
  const privateData: Record<string, any> = {};
  Object.entries(content).forEach(([k, v]) => {
    if (keys.includes(k)) {
      privateData[k] = v;
    } else {
      publicData[k] = v;
    }
  });
  return [publicData, privateData];
}

export const blanksYanker: Yanker = (content) => {
  return yankByKeys(content, ['questions']);
};

export const multiChoiceYanker: Yanker = (content) => {
  return yankByKeys(content, ['answers']);
};

export const questionSetMerge: Unyanker = (
  publicData: any,
  privateData: any,
) => {
  const copy = { ...publicData };
  copy.questions.forEach((q: any, idx: number) => {
    q.params = shallowMerge(q.params, privateData[idx]);
  });
  return copy;
};

export const trueFalseYanker: Yanker = (content) => {
  return yankByKeys(content, ['correct']);
};

export const shallowMerge: Unyanker = (publicData: any, privateData: any) => ({
  ...publicData,
  ...privateData,
});
