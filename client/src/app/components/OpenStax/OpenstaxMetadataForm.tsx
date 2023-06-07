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
import { IContentService } from '../../services/ContentService';

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

type FormProps = {
  contentService: IContentService;
  contentId: string;
};

const defaultInputState: InputState = { value: '', isValid: true };

export default class OpenstaxMetadataForm extends React.Component<FormProps> {
  private contentService: IContentService;
  private contentId: string;

  public state: FormState = {
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

  constructor(props: FormProps) {
    super(props);
    this.contentService = props.contentService;
    this.contentId = props.contentId;
  }

  public async componentDidMount(): Promise<void> {
    try {
      const metadata = await this.contentService.getOSMeta(this.contentId);
      if (metadata) {
        this.setState({ ...this.decodeValues(metadata) });
      }
    } catch (err) {
      // TODO: Do something when there is an error
    }
  }

  async save() {
    if (this.isInputValid) {
      try {
        await this.contentService.saveOSMeta(
          this.contentId,
          this.encodeValues(this.state)
        );
      } catch (err) {
        // TODO: Do something when there is an error
      }
    }
    // TODO: Do something when input is not valid
  }

  encodeValues(metadata: FormState) {
    // TODO: Add encoders for each value type
    // TODO: Use `key` to determine which encoder to use for each value
    // TODO: Remove optional fields that are empty?
    const encodeValue = (key: string, state: InputState) => state.value;
    return Object.fromEntries(
      Object.entries(metadata).map(([key, oneOrMany]) => [
        key,
        Array.isArray(oneOrMany)
          ? oneOrMany.map((item) => encodeValue(key, item))
          : encodeValue(key, oneOrMany),
      ])
    );
  }

  decodeValues(metadata: any) {
    // TODO: Add decoders for each value type
    // TODO: Use `key` to determine which decoder to use for each value
    const decodeValue = (key: string, value: any) => ({
      ...defaultInputState,
      value,
    });
    return Object.fromEntries(
      Object.entries(metadata).map(([key, oneOrMany]) => [
        key,
        Array.isArray(oneOrMany)
          ? oneOrMany.map((item) => decodeValue(key, item))
          : decodeValue(key, oneOrMany),
      ])
    );
  }

  get isInputValid() {
    // TODO: Make a list of required fields
    // TODO: Use `key` to determine which fields need a value
    const isInputValid = (key: string, value: InputState) => value.isValid;
    return Object.entries(this.state).every(([key, oneOrMany]) =>
      Array.isArray(oneOrMany)
        ? oneOrMany.every((inputState) => isInputValid(key, inputState))
        : isInputValid(key, oneOrMany)
    );
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
