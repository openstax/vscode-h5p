import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { collect, range } from './utils';

const options = collect(range(1, 7))
  .map((b) => b.toString())
  .map((b) => ({ label: b, value: b }));

export default function BloomsDropdown({
  handleInputChange,
  value,
}: {
  handleInputChange: (v: string) => void;
  value: string;
}) {
  return (
    <BasicFormComponent
      title={'Blooms'}
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
