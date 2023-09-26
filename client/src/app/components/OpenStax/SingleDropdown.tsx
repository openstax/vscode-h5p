import Select, { StylesConfig } from 'react-select';
import { DropdownOption } from './types';

export function SingleDropdown<
  OptionType extends DropdownOption = DropdownOption
>({
  options,
  handleInputChange,
  value,
  styles,
  required = false,
}: {
  options: Array<OptionType>;
  handleInputChange: (value: string) => void;
  value: string;
  styles?: StylesConfig<{ label: string; value: string }, false>;
  required?: boolean;
}) {
  const defaultValue = {
    label: 'Select an option...',
    value: '',
  };
  return (
    <Select
      options={options}
      isSearchable={true}
      isClearable={!required}
      value={options.find((o) => o.value === value) ?? defaultValue}
      onChange={(v) => {
        handleInputChange((v ?? defaultValue).value);
      }}
      styles={styles}
    />
  );
}
