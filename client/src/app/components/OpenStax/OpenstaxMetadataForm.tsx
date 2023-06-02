import React from 'react';
import { InputSet } from './InputSet';
import BloomsDropdown from './Blooms';
import AssignmentType from './AssignmentType';
import { BookDropdown } from './Book';
import DokTag from './dok';

export default class OpenstaxMetadataForm extends React.Component {
  state = {
    books: [],
    lo: [],
    blooms: '',
    assignmentType: '',
    dokTag: '',
  };

  save(contentId) {
    // TODO: Validate, encode, send values to server
  }

  encodeValues() {
    // TODO: Transform values from the format used here into the format they are stored in
  }

  decodeValues() {
    // TODO: Transform values from the format they are stored in into the format used here
  }

  validate() {
    // TODO: Maybe have an array of { element, validation, enabled }
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

    const inputSetHandlerProps = (type) => {
      return {
        inputs: this.state[type],
        handleAddInput: () => handleAddInput(type),
        handleRemoveInput: (index) => handleRemoveInput(type, index),
        handleInputChange: (index, value) =>
          handleInputChange(type, index, value),
      };
    };

    return (
      <div className="container mb-4 mt-4">
        <div className="row mb-4">
          <div className="col-6">
            <BookDropdown {...inputSetHandlerProps('books')} />
          </div>
          <div className="col-6">
            <InputSet title={'LO'} {...inputSetHandlerProps('lo')} />
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-6">
            <BloomsDropdown
              handleInputChange={(v) => this.setState({ blooms: v })}
              value={this.state.blooms}
            />
          </div>
          <div className="col-6">
            <AssignmentType
              handleInputChange={(v) => this.setState({ assignmentType: v })}
              value={this.state.assignmentType}
            />
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-6">
            <DokTag
              handleInputChange={(v) => this.setState({ dokTag: v })}
              value={this.state.dokTag}
            />
          </div>
          <div className="col-6"></div>
        </div>
      </div>
    );
  }
}
