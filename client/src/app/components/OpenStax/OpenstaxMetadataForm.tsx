import React from 'react';
import BloomsDropdown from './Blooms';
import AssignmentType from './AssignmentType';
import { BookDropdown } from './Book';
import DokTag from './Dok';
import { chunk } from './utils';
import { InputState } from './types';
import LO from './LO';
import ModuleID from './ModuleID';
import APLO from './APLO';
import Time from './Time';
import Nickname from './Nickname';

type SingleInputs = {
  blooms: InputState;
  assignmentType: InputState;
  dokTag: InputState;
  time: InputState;
  nickname: InputState;
};

type InputSets = {
  books: InputState[];
  lo: InputState[];
  moduleId: InputState[];
  apLo: InputState[];
};

type FormState = SingleInputs & InputSets;

const defaultInputState: InputState = { value: '', isValid: true };

export default class OpenstaxMetadataForm extends React.Component {
  state: FormState = {
    books: [],
    lo: [],
    moduleId: [],
    apLo: [],
    blooms: { ...defaultInputState },
    assignmentType: { ...defaultInputState },
    dokTag: { ...defaultInputState },
    time: { ...defaultInputState },
    nickname: { ...defaultInputState },
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
    const inputSetHandlerProps = (type: keyof InputSets) => {
      return {
        inputs: this.state[type],
        handleAddInput: () => {
          const inputs = this.state[type];
          this.setState({ [type]: [...inputs, { ...defaultInputState }] });
        },
        handleRemoveInput: (index) => {
          const inputs = this.state[type];
          const newInputs = [...inputs];
          newInputs.splice(index, 1);
          this.setState({ [type]: newInputs });
        },
        handleInputChange: (
          index: number,
          value: string,
          isValid: boolean = true
        ) => {
          const inputs = this.state[type];
          const newInputs = [...inputs];
          newInputs[index] = { value, isValid };
          this.setState({ [type]: newInputs });
        },
      };
    };

    const inputHandlerProps = (type: keyof SingleInputs) => ({
      handleInputChange: (value: string, isValid: boolean = true) =>
        this.setState({ [type]: { value, isValid } }),
      ...this.state[type],
    });

    const inputs = [
      <Nickname {...inputHandlerProps('nickname')} />,
      <BookDropdown {...inputSetHandlerProps('books')} />,
      <LO {...inputSetHandlerProps('lo')} />,
      <ModuleID {...inputSetHandlerProps('moduleId')} />,
      <BloomsDropdown {...inputHandlerProps('blooms')} />,
      <AssignmentType {...inputHandlerProps('assignmentType')} />,
      <DokTag {...inputHandlerProps('dokTag')} />,
      <Time {...inputHandlerProps('time')} />,
    ];

    if (this.state.books.some((b) => b.value.includes('stax-ap'))) {
      inputs.splice(2, 0, <APLO {...inputSetHandlerProps('apLo')} />);
    } else if (this.state.apLo.length > 0) {
      this.setState({ apLo: [] });
    }

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
