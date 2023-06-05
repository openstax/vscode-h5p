import { InputSet, InputSetProps } from './InputSet';

const moduleIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export default function ModuleID(props: InputSetProps) {
  const baseHandleInputChange = props.handleInputChange;
  props.handleInputChange = (index: number, value: string) => {
    baseHandleInputChange(index, value, !!value.match(moduleIdPattern));
  };

  return <InputSet title={'Module UUID'} {...props} />;
}
