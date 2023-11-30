import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusCircle, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { DropdownOption, InputState } from './types';
import { SingleDropdown } from './SingleDropdown';
import SingleInput from './SingleInput';

export type InputSetProps<OptionType extends DropdownOption = DropdownOption> =
  {
    inputs: InputState[];
    handleAddInput: () => void;
    handleRemoveInput: (index: number) => void;
    handleInputChange: (
      index: number,
      value: string,
      isValid?: boolean,
    ) => void;
    options?: Array<OptionType>;
    placeholder?: string;
    required?: boolean;
  };

export function InputSet<OptionType extends DropdownOption = DropdownOption>({
  title,
  inputs,
  handleAddInput,
  handleRemoveInput,
  handleInputChange,
  options,
  placeholder,
  required = false,
}: InputSetProps<OptionType> & { title: string }) {
  return (
    <>
      <div className="container">
        <div className="row">
          <div className="col-11">
            <h3>
              {title}{' '}
              <span style={{ color: 'red' }}>{required ? '*' : ''}</span>
            </h3>
          </div>
          <div className="col-1 pt-2" data-control-type={'input-set-add'}>
            <FontAwesomeIcon
              icon={faPlusCircle}
              onClick={() => handleAddInput()}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>
        {inputs.map((input, index) => (
          <div key={index} className="row pt-1 pb-1">
            <div className="col-11">
              {options === undefined || options.length === 0 ? (
                <SingleInput
                  value={input.value}
                  isValid={input.isValid}
                  handleInputChange={(value: string) => {
                    handleInputChange(index, value);
                  }}
                  style={{ width: '100%' }}
                  placeholder={placeholder}
                />
              ) : (
                <SingleDropdown
                  required={required}
                  value={input.value}
                  options={options}
                  handleInputChange={(v: string) => {
                    handleInputChange(index, v);
                  }}
                  styles={{
                    control: (styles) => ({ ...styles, width: '100%' }),
                  }}
                />
              )}
            </div>
            <div className="col-1" data-control-type={'input-set-subtract'}>
              <FontAwesomeIcon
                icon={faMinusCircle}
                onClick={() => handleRemoveInput(index)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
