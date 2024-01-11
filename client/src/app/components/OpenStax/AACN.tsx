import BasicFormComponent from './BasicFormComponent';
import SingleInput from './SingleInput';
import { SingleInputProps } from './types';
import { patternValidationFactory } from './utils';

const pattern = /^\d{1,2}\.\d[a-z]$/;
const placeholder = '#{1,2}.#[a-z]';

export default function AACN(props: SingleInputProps) {
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
      title={'AACN'}
      content={
        <div className="col-12">
          <SingleInput
            {...subProps}
            placeholder={placeholder}
            style={{ width: '100%' }}
          />
        </div>
      }
    />
  );
}
