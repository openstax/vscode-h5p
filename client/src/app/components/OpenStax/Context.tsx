import BasicFormComponent from './BasicFormComponent';
import SingleInput from './SingleInput';
import { SingleInputProps } from './types';
import { patternValidationFactory } from './utils';

const moduleIdPattern = /^m\d+#\w.*$/;
const placeholder = 'm00000#element-id';

export default function Context(props: SingleInputProps) {
  const validator = patternValidationFactory(moduleIdPattern, props);
  const subProps = {
    ...props,
    handleInputChange: (value: string) => {
      props.handleInputChange(value, validator(value));
    },
  };

  return (
    <BasicFormComponent
      {...subProps}
      title={'Context'}
      content={
        <div className="col-12">
          <SingleInput
            {...subProps}
            style={{ width: '100%' }}
            placeholder={placeholder}
          />
        </div>
      }
    />
  );
}
