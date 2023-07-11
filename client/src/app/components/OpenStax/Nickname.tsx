import BasicFormComponent from './BasicFormComponent';
import SingleInput from './SingleInput';
import { SingleInputProps } from './types';

const pattern = /^\w+$/;

export default function Nickname(props: SingleInputProps) {
  const subProps = {
    ...props,
    handleInputChange: (value: string) => {
      props.handleInputChange(value, !!value.match(pattern));
    },
  };

  return (
    <BasicFormComponent
      title={'Nickname'}
      content={
        <div className="col-12">
          <SingleInput {...subProps} style={{ width: '100%' }} />
        </div>
      }
    />
  );
}
