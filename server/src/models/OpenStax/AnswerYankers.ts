export type Yanker = (content: any) => [unknown, unknown];
export type Unyanker = (publicData: any, privateData: any) => unknown;

function yankByKeys(content: any, keys: string[]): [unknown, unknown] {
  const publicData = {};
  const privateData = {};
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

export const questionSetYanker: Yanker = (content) => {
  const publicData = {
    ...content,
    questions: content.questions.map((q) => ({
      ...q,
      params: Object.fromEntries(
        Object.entries(q.params).filter(([k, _]) => k !== 'answers')
      ),
    })),
  };
  const privateData = {
    questions: content.questions,
  };
  return [publicData, privateData];
};

export const trueFalseYanker: Yanker = (content) => {
	return yankByKeys(content, ['correct']);
}

export const shallowMerge: Unyanker = (publicData: any, privateData: any) => ({
  ...publicData,
  ...privateData,
});
