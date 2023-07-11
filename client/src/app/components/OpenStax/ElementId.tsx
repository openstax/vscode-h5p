import { InputSet, InputSetProps } from './InputSet';

const pattern = /^[\w-]+$/i;

export default function ElementID(props: InputSetProps) {
  const subProps = {
    ...props,
    handleInputChange: (index: number, value: string) => {
      props.handleInputChange(index, value, !!value.match(pattern));
    },
  };

  return <InputSet title={'Element ID'} {...subProps} />;
}
