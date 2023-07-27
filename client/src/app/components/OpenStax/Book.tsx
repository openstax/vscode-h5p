import { SingleDropdown } from './SingleDropdown';
import { SingleInputProps } from './types';

export function Book(props: SingleInputProps & { books: Array<string[]> }) {
  return (
    <SingleDropdown
      {...props}
      options={props.books.map(([value, label]) => ({
        label,
        value,
      }))}
    />
  );
}
