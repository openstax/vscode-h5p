import { InputSet, InputSetProps } from './InputSet';

const PATTERNS = {
  'stax-apbio': {
    pattern: /^[A-Z]{3}[-.]\d{1,2}[-.][A-Z]$/,
    placeholder: '[A-Z]{3}-#{1,2}.[A-Z]',
  },
  'stax-apphys': {
    pattern: /^\d[-.][A-Z][-.]\d{1,2}[-.]\d$/,
    placeholder: '#.[A-Z].#{1,2}.#',
  },
  // TODO: stax-apush (Probably not an issue, book in limbo)
};

export default function APLO(props: InputSetProps & { book: string }) {
  const { pattern, placeholder } = PATTERNS[props.book] ?? {
    pattern: /^[A-Z0-9.-]+$/,
    placeholder: '',
  };
  const subProps = {
    ...props,
    handleInputChange: (index: number, value: string) => {
      props.handleInputChange(index, value, !!value.match(pattern));
    },
  };

  return (
    <InputSet
      title={'AP Learning Objectives'}
      {...subProps}
      placeholder={placeholder}
    />
  );
}
