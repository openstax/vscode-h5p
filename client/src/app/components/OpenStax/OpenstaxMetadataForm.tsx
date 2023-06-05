import React from 'react';
import { InputSet } from './InputSet';
import BloomsDropdown from './Blooms';
import AssignmentType from './AssignmentType';
import { BookDropdown } from './Book';
import DokTag from './Dok';
import { chunk } from './utils';

interface InputState {
  value: string;
}

type SingleInputs = {
  blooms: InputState;
  assignmentType: InputState;
  dokTag: InputState;
};

type InputSets = {
  books: InputState[];
  lo: InputState[];
  moduleId: InputState[];
};

type FormState = SingleInputs & InputSets;

export default class OpenstaxMetadataForm extends React.Component {
  state: FormState = {
    books: [],
    lo: [],
    moduleId: [],
    blooms: { value: '' },
    assignmentType: { value: '' },
    dokTag: { value: '' },
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
    const inputSetHandleChange = (type, index, value) => {
      const inputs = this.state[type];
      const newInputs = [...inputs];
      newInputs[index] = { value };
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

    const inputSetHandlerProps = (type: keyof InputSets) => {
      return {
        inputs: this.state[type],
        handleAddInput: () => handleAddInput(type),
        handleRemoveInput: (index) => handleRemoveInput(type, index),
        handleInputChange: (index, value) =>
          inputSetHandleChange(type, index, value),
      };
    };

    const inputHandlerProps = (type: keyof SingleInputs) => ({
      handleInputChange: (value: string) =>
        this.setState({ [type]: { value } }),
      value: this.state[type].value,
    });

    const inputs = [
      <BookDropdown {...inputSetHandlerProps('books')} />,
      <InputSet title={'LO'} {...inputSetHandlerProps('lo')} />,
      <BloomsDropdown {...inputHandlerProps('blooms')} />,
      <AssignmentType {...inputHandlerProps('assignmentType')} />,
      <DokTag {...inputHandlerProps('dokTag')} />,
    ];

    const inputsPerRow = 2;
    const colClass = `col-${Math.ceil(12 / inputsPerRow)}`;

    return (
      <div className="container mb-4 mt-4">
        {chunk(inputs, inputsPerRow).map((inputsChunk) => (
          <div className="row mb-4">
            {inputsChunk.map((input) => (
              <div className={colClass}>{input}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }
}
