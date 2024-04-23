import { InputSet, InputSetProps } from './InputSet';
import { patternValidationFactory } from './utils';

const moduleIdPattern = /^m\d+(#[A-Za-z][A-Za-z0-9-_]*)?$/;
const placeholder = 'm00000#element-id';

export default function Context(props: InputSetProps) {
  const validator = patternValidationFactory(moduleIdPattern, props);
  const subProps = {
    ...props,
    handleInputChange: (index: number, value: string) => {
      props.handleInputChange(index, value, validator(value));
    },
  };

  return <InputSet {...subProps} title={'Context'} placeholder={placeholder} />;
}
