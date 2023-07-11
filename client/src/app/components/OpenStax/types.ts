export type DropdownOption = {
  readonly value: string;
  readonly label: string;
};

export type SingleInputProps = {
  value: string;
  isValid: boolean;
  handleInputChange: (value: string, isValid?: boolean) => void;
};

export type InputState = {
  value: string;
  isValid: boolean;
};
