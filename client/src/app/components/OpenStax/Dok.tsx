import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { SingleInputProps } from './types';
import { collect, range } from './utils';

const options = collect(range(1, 5))
  .map((n) => n.toString())
  .map((s) => ({ label: s, value: s }));

export default function DokTag(props: SingleInputProps) {
  return (
    <BasicFormComponent
      title={'Depth of Knowledge'}
      content={<SingleDropdown options={options} {...props} />}
    />
  );
}
