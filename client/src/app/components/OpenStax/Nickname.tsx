import BasicFormComponent from './BasicFormComponent';
import SingleInput from './SingleInput';
import { SingleInputProps } from './types';
import { patternValidationFactory } from './utils';

const pattern = /^[\w-]+$/;

export default function Nickname(props: SingleInputProps) {
  const validator = patternValidationFactory(pattern, props);
  const subProps = {
    ...props,
    handleInputChange: (value: string) => {
      props.handleInputChange(value, validator(value));
    },
  };

  return (
    <BasicFormComponent
      {...props}
      title={'Nickname'}
      content={
        <div className="col-12">
          <SingleInput {...subProps} style={{ width: '100%' }} />
        </div>
      }
    />
  );
}
