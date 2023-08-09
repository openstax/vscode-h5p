import Select, { GroupBase, StylesConfig } from 'react-select';
import { DropdownOption } from './types';

export function SingleDropdown<
  OptionType extends DropdownOption = DropdownOption
>({
  options,
  handleInputChange,
  value,
  styles,
}: {
  options: Array<OptionType>;
  handleInputChange: (value: string) => void;
  value: string;
  styles?: StylesConfig<{ label: string; value: string }, false>;
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
        /* istanbul ignore next */
        if (v == null) return;
        handleInputChange(v.value);
      }}
      styles={styles}
    />
  );
}
