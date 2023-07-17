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
  const yankBySubtype = (q) => {
    const [libraryName, _version] = q.library.split(' ');
    switch (libraryName) {
      case 'H5P.MultiChoice':
        return multiChoiceYanker(q.params);
      case 'H5P.Blanks':
        return blanksYanker(q.params);
      case 'H5P.TrueFalse':
        return trueFalseYanker(q.params);
      default:
        throw new Error(`Library, "${libraryName}," is unsupported`);
    }
  };
  const privateData: unknown[] = [];
  const publicData = {
    ...content,
    // NOTE: Impure map
    questions: content.questions.map((q) => {
      const [pub, priv] = yankBySubtype(q);
      privateData.push(priv);
      return {
        ...q,
        params: pub,
      };
    }),
  };
  return [publicData, privateData];
};

export const questionSetMerge: Unyanker = (
  publicData: any,
  privateData: any
) => {
  const copy = { ...publicData };
  copy.questions.forEach((q, idx) => {
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
