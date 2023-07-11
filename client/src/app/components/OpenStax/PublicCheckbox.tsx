import BasicFormComponent from './BasicFormComponent';
import SingleCheckbox from './SingleCheckbox';
import { SingleInputProps } from './types';

export default function PublicCheckbox(props: SingleInputProps) {
  return (
    <BasicFormComponent
      title={'Solution is public'}
      content={
        <div className="col-12">
          <SingleCheckbox {...props} />
        </div>
      }
    />
  );
}
