import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusCircle, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

const TypedInputSet = ({
  title,
  inputs,
  handleAddInput,
  handleRemoveInput,
  handleInputChange,
}) => {
  return (
    <div>
      <div className="container">
        <div className="row">
          <div className="col-8">
            <h3>{title}</h3>
          </div>
          <div className="col-4 pt-2">
            <FontAwesomeIcon
              icon={faPlusCircle}
              onClick={() => handleAddInput()}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>
        {inputs.map((input, index) => (
          <div key={index} className="row pt-1 pb-1">
            <div className="col-8">
              <input
                value={input.value}
                onChange={(event) =>
                  handleInputChange(index, event.target.value)
                }
                style={{ width: '100%' }}
              />
            </div>
            <div className="col-4">
              <FontAwesomeIcon
                icon={faMinusCircle}
                onClick={() => handleRemoveInput(index)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default class OpenstaxMetadataForm extends React.Component {
  state = {
    book: [],
    lo: [],
  };

  save(contentId) {
    console.log('Save', contentId);
  }

  render() {
    const handleInputChange = (type, index, value) => {
      const inputs = this.state[type];
      const newInputs = [...inputs];
      newInputs[index].value = value;
      this.setState({ [type]: newInputs });
    };

    const handleAddInput = (type) => {
      const inputs = this.state[type];
      this.setState({ [type]: [...inputs, { value: '' }] });
    };

    const handleRemoveInput = (type, index) => {
      const inputs = this.state[type];
      const newInputs = [...inputs];
      newInputs.splice(index, 1);
      this.setState({ [type]: newInputs });
    };

    const inputHandlerProps = (type) => {
      return {
        inputs: this.state[type],
        handleAddInput: () => handleAddInput(type),
        handleRemoveInput: (index) => handleRemoveInput(type, index),
        handleInputChange: (index, value) =>
          handleInputChange(type, index, value),
      };
    };

    return (
      <div className="container">
        <div className="row">
          <div className="col-6">
            <TypedInputSet title={'Book'} {...inputHandlerProps('book')} />
          </div>
          <div className="col-6">
            <TypedInputSet title={'LO'} {...inputHandlerProps('lo')} />
          </div>
        </div>
        <div>Testing 1 2 3 state.saving</div>
      </div>
    );
  }
}
