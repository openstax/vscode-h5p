import { InputSet, InputSetProps } from './InputSet';

export default function APLO(props: InputSetProps) {
  const subProps = {
    ...props,
    handleInputChange: (index: number, value: string) => {
      props.handleInputChange(index, value, !!value.match(/\w+/));
    },
  };

  return <InputSet title={'AP LO'} {...subProps} />;
}
