export const patternValidationFactory = (
  pattern: RegExp,
  options?: { required?: boolean },
) => {
  return validationFactory(RegExp.prototype.test.bind(pattern), options);
};

export const validationFactory = (
  subValidate: (value: string) => boolean,
  options?: { required?: boolean },
) => {
  const isOptional = options?.required !== true;
  return (value: string) => subValidate(value) || (isOptional && value === '');
};
