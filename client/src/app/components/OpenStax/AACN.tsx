import BasicFormComponent from './BasicFormComponent';
import SingleInput from './SingleInput';
import { SingleInputProps } from './types';

const pattern = /^\d{1,2}\.\d[a-z]$/;

export default function AACN(props: SingleInputProps) {
  const subProps = {
    ...props,
    handleInputChange: (value: string) => {
      props.handleInputChange(value, !!value.match(pattern));
    },
  };

  return (
    <BasicFormComponent
      {...props}
      title={'AACN'}
      content={
        <div className="col-12">
          <SingleInput {...subProps} style={{ width: '100%' }} />
        </div>
      }
    />
  );
}
