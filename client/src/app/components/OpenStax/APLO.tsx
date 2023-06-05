import { InputSet, InputSetProps } from './InputSet';

export default function APLO(props: InputSetProps) {
  const baseHandleInputChange = props.handleInputChange;
  props.handleInputChange = (index: number, value: string) => {
    baseHandleInputChange(index, value, !!value.match(/\w+/));
  };

  return <InputSet title={'AP LO'} {...props} />;
}
