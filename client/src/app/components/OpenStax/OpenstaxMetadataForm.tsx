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
  onSaveError: (message: string) => void;
};

type SavedState = Record<keyof SingleInputs | keyof InputSets, any>;
type MetadataEntry = [keyof SavedState, InputState | InputState[]];
type SavedEntry = [keyof SavedState, string | string[]];

const defaultInputState: InputState = { value: '', isValid: true };

const metadataKeys: Array<keyof SavedState> = [
  'blooms',
  'assignmentType',
  'dokTag',
  'time',
  'nickname',
  'books',
  'lo',
  'moduleId',
  'apLo',
];

function isMetadataEntry(entry: [any, any]): entry is MetadataEntry {
  return metadataKeys.includes(entry[0]);
}

function isSavedEntry(entry: [any, any]): entry is SavedEntry {
  return metadataKeys.includes(entry[0]);
}

export default class OpenstaxMetadataForm extends React.Component<FormProps> {
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
  }

  public async componentDidMount(): Promise<void> {
    try {
      const metadata = await this.props.contentService.getOSMeta(
        this.props.contentId
      );
      if (metadata) {
        this.setState({ ...this.decodeValues(metadata) });
      }
    } catch (err) {
      this.props.onSaveError((err as Error).message);
    }
  }

  async save(contentId: string) {
    if (this.isInputValid) {
      try {
        await this.props.contentService.saveOSMeta(
          contentId, this.encodedValues
        );
      } catch (err) {
        this.props.onSaveError((err as Error).message);
      }
    }
  }

  get metadataEntries(): MetadataEntry[] {
    return Object.entries(this.state).filter(isMetadataEntry);
  }

  get encodedValues() {
    // TODO: Add encoders for each value type
    // TODO: Use `key` to determine which encoder to use for each value
    // TODO: Remove optional fields that are empty?
    const encodeValue = (key: string, state: InputState) => state.value;
    return Object.fromEntries(
      this.metadataEntries.map(([key, oneOrMany]) => [
        key,
        Array.isArray(oneOrMany)
          ? oneOrMany.map((item) => encodeValue(key, item))
          : encodeValue(key, oneOrMany),
      ])
    );
  }

  decodeValues(metadata: any): SavedState {
    // TODO: Add decoders for each value type
    // TODO: Use `key` to determine which decoder to use for each value
    const decodeValue = (key: string, value: string): InputState => ({
      ...defaultInputState,
      value,
    });
    return Object.fromEntries(
      Object.entries(metadata)
        .filter(isSavedEntry)
        .map(([key, oneOrMany]) => [
          key,
          Array.isArray(oneOrMany)
            ? oneOrMany.map((item) => decodeValue(key, item))
            : decodeValue(key, oneOrMany),
        ])
    ) as SavedState;
  }

  get isInputValid() {
    const required: Array<keyof SavedState> = [
      'nickname',
      'books',
      'blooms',
      'lo',
    ];
    const isInputValid = (key: keyof SavedState, value: InputState) => {
      if (!value.isValid) {
        this.props.onSaveError(`Value for "${key}" is invalid`);
        return false;
      }
      if (required.includes(key) && value.value === '') {
        this.props.onSaveError(`"${key}" cannot be empty.`);
        return false;
      }
      return true;
    };
    const isArrayValid = (key: keyof SavedState, inputSet: InputState[]) => {
      if (required.includes(key) && inputSet.length === 0) {
        this.props.onSaveError(`Expected at least one value for ${key}`);
        return false;
      }
      return inputSet.every((inputState) => isInputValid(key, inputState));
    };
    return this.metadataEntries.every(([key, oneOrMany]) =>
      Array.isArray(oneOrMany)
        ? isArrayValid(key, oneOrMany)
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
