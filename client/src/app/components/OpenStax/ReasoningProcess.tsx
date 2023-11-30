import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { SingleInputProps } from './types';
import { collect, range } from './utils';

const options = collect(range(1, 4))
  .map((b) => b.toString())
  .map((b) => ({ label: b, value: b }));

export default function ReasoningProcess(props: SingleInputProps) {
  return (
    <BasicFormComponent
      {...props}
      title={'Reasoning Process'}
      content={<SingleDropdown options={options} {...props} />}
    />
  );
}
