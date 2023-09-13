import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { SingleInputProps } from './types';
import { collect, range } from './utils';

const options = collect(range(1, 7))
  .map((b) => b.toString())
  .map((b) => ({ label: b, value: b }));

export default function Blooms(props: SingleInputProps) {
  return (
    <BasicFormComponent
      {...props}
      title={'Blooms'}
      content={<SingleDropdown options={options} {...props} />}
    />
  );
}
