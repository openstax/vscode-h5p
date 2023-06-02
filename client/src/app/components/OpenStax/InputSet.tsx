import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusCircle, faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { DropdownOption } from './types';
import { SingleDropdown } from './SingleDropdown';

export interface InputSetProps<
  OptionType extends DropdownOption = DropdownOption
> {
  inputs: any;
  handleAddInput: () => void;
  handleRemoveInput: (index: number) => void;
  handleInputChange: (index: number, value: string) => void;
  options?: Array<OptionType>;
}

export function InputSet<OptionType extends DropdownOption = DropdownOption>({
  title,
  inputs,
  handleAddInput,
  handleRemoveInput,
  handleInputChange,
  options,
}: InputSetProps<OptionType> & { title: string }) {
  return (
    <>
      <div className="container">
        <div className="row">
          <div className="col-11">
            <h3>{title}</h3>
          </div>
          <div className="col-1 pt-2">
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
                <input
                  value={input.value}
                  onChange={(event) =>
                    handleInputChange(index, event.target.value)
                  }
                  style={{ width: '100%' }}
                />
              ) : (
                <SingleDropdown
                  value={input.value}
                  options={options}
                  handleInputChange={(v: string) => {
                    handleInputChange(index, v);
                  }}
                  otherOptions={{
                    styles: {
                      control: (styles) => ({ ...styles, width: '100%' }),
                    },
                  }}
                />
              )}
            </div>
            <div className="col-1">
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
