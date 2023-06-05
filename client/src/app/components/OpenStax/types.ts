export type DropdownOption = {
  readonly value: string;
  readonly label: string;
};

export type SingleInputProps = {
  value: string;
  isValid: boolean;
  handleInputChange: (v: string, isValid?: boolean) => void;
};

export type InputState = {
  value: string;
  isValid: boolean;
};
