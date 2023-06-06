import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { DropdownOption, SingleInputProps } from './types';

const options: DropdownOption[] = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Long', value: 'long' },
];

export default function Time(props: SingleInputProps) {
  return (
    <BasicFormComponent
      title={'Time'}
      content={<SingleDropdown options={options} {...props} />}
    />
  );
}
