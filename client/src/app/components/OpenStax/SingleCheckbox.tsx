import { SingleInputProps } from './types';

export default function SingleCheckbox({
  value,
  style,
  handleInputChange,
}: SingleInputProps & {
  style?: React.CSSProperties;
}) {
  return (
    <input
      type="checkbox"
      checked={value === 'true'}
      onChange={(event) => handleInputChange(event.target.checked.toString())}
      style={style}
    />
  );
}
