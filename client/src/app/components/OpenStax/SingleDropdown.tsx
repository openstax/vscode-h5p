import Select from 'react-select';
import { DropdownOption } from './types';

export function SingleDropdown<
  OptionType extends DropdownOption = DropdownOption
>({
  options,
  handleInputChange,
  value,
  otherOptions,
}: {
  options: Array<OptionType>;
  handleInputChange: (value: string) => void;
  value: string;
  otherOptions?: Record<string, any>;
}) {
  return (
    <Select
      options={options}
      isSearchable={true}
      value={
        options.find((o) => o.value === value) ?? {
          label: 'Select an option...',
          value: '',
        }
      }
      onChange={(v) => {
        if (v == null) return;
        handleInputChange(v.value);
      }}
      {...(otherOptions ?? {})}
    />
  );
}
