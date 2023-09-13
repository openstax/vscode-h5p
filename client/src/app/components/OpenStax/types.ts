export type DropdownOption = {
  readonly value: string;
  readonly label: string;
};

export type SingleInputProps = {
  value: string;
  isValid: boolean;
  handleInputChange: (value: string, isValid?: boolean) => void;
  required?: boolean;
};

export type InputSetHandlerProps<T> = {
  inputs: T[];
  handleAddInput: () => void;
  handleRemoveInput: (index: any) => void;
  handleInputChange: (index: number, value: string, isValid?: boolean) => void;
  required?: boolean;
};

export type InputState = {
  value: string;
  isValid: boolean;
};

export type BookInputState = InputState & { book: string };
