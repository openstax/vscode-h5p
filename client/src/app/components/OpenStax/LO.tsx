import { InputSet, InputSetProps } from './InputSet';

const pattern = /^[AB]?\d{1,2}(-|\.)\d{1,2}(-|\.)\d{1,2}$/;
const placeholder = '[AB]?##-##-##';

export default function LO(props: InputSetProps) {
  const subProps = {
    ...props,
    handleInputChange: (index: number, value: string) => {
      props.handleInputChange(index, value, !!value.match(pattern));
    },
  };

  return <InputSet title={'LO'} {...subProps} placeholder={placeholder} />;
}
