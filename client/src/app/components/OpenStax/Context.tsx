import BasicFormComponent from './BasicFormComponent';
import SingleInput from './SingleInput';
import { SingleInputProps } from './types';

const moduleIdPattern = /^m\d+#.+$/i;

export default function Context(props: SingleInputProps) {
  const subProps = {
    ...props,
    handleInputChange: (value: string) => {
      props.handleInputChange(value, !!value.match(moduleIdPattern));
    },
  };

  return (
    <BasicFormComponent
      {...subProps}
      title={'Context'}
      content={
        <div className="col-12">
          <SingleInput {...subProps} style={{ width: '100%' }} />
        </div>
      }
    />
  );
}
