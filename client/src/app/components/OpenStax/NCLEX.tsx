import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { DropdownOption, SingleInputProps } from './types';

const options: DropdownOption[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

export default function NCLEX(props: SingleInputProps) {
  return (
    <BasicFormComponent
      {...props}
      title={'NCLEX'}
      content={<SingleDropdown options={options} {...props} />}
    />
  );
}
