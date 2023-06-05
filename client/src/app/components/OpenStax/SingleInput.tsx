import { SingleInputProps } from './types';

export default function SingleInput({
  value,
  isValid,
  style = {},
  styleInvalid = { outline: '2px solid red' },
  handleInputChange,
}: SingleInputProps & {
  style?: Record<string, string>;
  styleInvalid?: Record<string, string>;
}) {
  let realStyle = { ...style };
  if (!isValid) {
    realStyle = { ...realStyle, ...styleInvalid };
  }
  return (
    <input
      value={value}
      onChange={(event) => handleInputChange(event.target.value)}
      style={realStyle}
    />
  );
}
