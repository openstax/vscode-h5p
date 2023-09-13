import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { SingleInputProps } from './types';

const options = [
  { value: 'reading', label: 'Reading' },
  { value: 'homework', label: 'Homework' },
];

export default function AssignmentType(props: SingleInputProps) {
  return (
    <BasicFormComponent
      {...props}
      title={'Assignment Type'}
      content={
        <SingleDropdown
          options={options}
          handleInputChange={props.handleInputChange}
          value={props.value}
        />
      }
    />
  );
}
