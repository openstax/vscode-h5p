import { range } from '../../../../../common/src/utils';
import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { SingleInputProps } from './types';

const options = range(1, 5)
  .map((n) => n.toString())
  .map((s) => ({ label: s, value: s }));

export default function DokTag(props: SingleInputProps) {
  return (
    <BasicFormComponent
      {...props}
      title={'Depth of Knowledge'}
      content={<SingleDropdown options={options} {...props} />}
    />
  );
}
