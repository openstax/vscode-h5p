import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { collect, range } from './utils';

const options = collect(range(1, 5))
  .map((n) => n.toString())
  .map((s) => ({ label: s, value: s }));

export default function DokTag({
  handleInputChange,
  value,
}: {
  handleInputChange: (v: string) => void;
  value: string;
}) {
  return (
    <BasicFormComponent
      title={'DOK'}
      content={
        <SingleDropdown
          options={options}
          value={value}
          handleInputChange={handleInputChange}
        />
      }
    />
  );
}
