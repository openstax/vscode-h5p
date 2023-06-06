import { InputSet, InputSetProps } from './InputSet';
import { InputState } from './types';

const pattern = /^[AB]?\d{1,2}(-|\.)\d{1,2}(-|\.)\d{1,2}$/;
const placeholder = '[AB]?##-##-##';

export default function LO(props: InputSetProps) {
  const baseHandleInputChange = props.handleInputChange;
  props.handleInputChange = (index: number, value: string) => {
    baseHandleInputChange(index, value, !!value.match(pattern));
  };

  return <InputSet title={'LO'} {...props} placeholder={placeholder} />;
}
