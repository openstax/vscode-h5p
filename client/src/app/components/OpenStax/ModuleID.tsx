import { InputSet, InputSetProps } from './InputSet';

const moduleIdPattern = /m\d+$/;

export default function ModuleID(props: InputSetProps) {
  const subProps = {
    ...props,
    handleInputChange: (index: number, value: string) => {
      props.handleInputChange(index, value, !!value.match(moduleIdPattern));
    },
  };

  return <InputSet title={'Module Id'} {...subProps} />;
}
