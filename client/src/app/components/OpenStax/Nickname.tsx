import BasicFormComponent from './BasicFormComponent';
import SingleInput from './SingleInput';
import { SingleInputProps } from './types';

const pattern = /^\w+$/;

export default function Nickname(props: SingleInputProps) {
  const baseHandleInputChange = props.handleInputChange;
  props.handleInputChange = (value: string) => {
    baseHandleInputChange(value, !!value.match(pattern));
  };

  return (
    <BasicFormComponent
      title={'Nickname'}
      content={
        <div className="col-12">
          <SingleInput {...props} style={{ width: '100%' }} />
        </div>
      }
    />
  );
}
