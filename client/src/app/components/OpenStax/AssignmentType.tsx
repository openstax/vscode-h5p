import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';

const options = [
  { value: 'reading', label: 'Reading' },
  { value: 'homework', label: 'Homework' },
];

export default function AssignmentType({ handleInputChange, value }) {
  return (
    <BasicFormComponent
      title={'Assignment Type'}
      content={
        <SingleDropdown
          options={options}
          handleInputChange={handleInputChange}
          value={value}
        />
      }
    />
  );
}
