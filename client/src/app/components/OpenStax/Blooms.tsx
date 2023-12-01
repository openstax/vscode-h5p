import { range } from '../../../../../common/src/utils';
import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { SingleInputProps } from './types';

const options = range(1, 7)
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
