import { InputSet, InputSetProps } from './InputSet';
import { patternValidationFactory } from './utils';

const pattern = /^[AB]?\d{1,2}(-|\.)\d{1,2}(-|\.)\d{1,2}$/;
const placeholder = '[AB]?##-##-##';

export default function LO(props: InputSetProps) {
  const validator = patternValidationFactory(pattern, props);
  const subProps = {
    ...props,
    handleInputChange: (index: number, value: string) => {
      props.handleInputChange(index, value, validator(value));
    },
  };

  return (
    <InputSet
      title={'Learning Objectives'}
      {...subProps}
      placeholder={placeholder}
    />
  );
}
