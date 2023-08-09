import React from 'react';
import { SingleInputProps } from './types';

export default function SingleInput({
  value,
  isValid,
  style,
  styleInvalid = { outline: '2px solid red' },
  handleInputChange,
  placeholder,
}: SingleInputProps & {
  style?: React.CSSProperties;
  styleInvalid?: React.CSSProperties;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => handleInputChange(event.target.value)}
      style={isValid ? style : { ...style, ...styleInvalid }}
      placeholder={placeholder}
    />
  );
}
