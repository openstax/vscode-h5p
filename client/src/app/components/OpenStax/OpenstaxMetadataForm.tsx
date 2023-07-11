import React from 'react';
import Blooms from './Blooms';
import AssignmentType from './AssignmentType';
import { Book } from './Book';
import DokTag from './Dok';
import { chunk } from './utils';
import { InputState } from './types';
import LO from './LO';
import ModuleID from './ModuleID';
import APLO from './APLO';
import Time from './Time';
import Nickname from './Nickname';
import { IContentService } from '../../services/ContentService';
import PublicCheckbox from './PublicCheckbox';
import HistoricalThinking from './HistoricalThinking';
import ReasoningProcess from './ReasoningProcess';
import SciencePractice from './SciencePractice';
import Accordion from './Accordion';
import AACN from './AACN';
import NCLEX from './NCLEX';
import ElementID from './ElementId';

type SingleInputs = {
  blooms: InputState;
  assignmentType: InputState;
  dokTag: InputState;
  time: InputState;
  nickname: InputState;
  isSolutionPublic: InputState;
  hts: InputState;
  rp: InputState;
  'science-practice': InputState;
  aacn: InputState;
  nclex: InputState;
};

type InputSets = {
  books: InputState[];
  lo: InputState[];
  moduleId: InputState[];
  elementId: InputState[];
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
  'elementId',
  'apLo',
  'isSolutionPublic',
  'hts',
  'rp',
  'science-practice',
  'aacn',
  'nclex',
];

function isMetadataEntry(entry: [any, any]): entry is MetadataEntry {
  return metadataKeys.includes(entry[0]);
}

function isSavedEntry(entry: [any, any]): entry is SavedEntry {
  return metadataKeys.includes(entry[0]);
}

function assertValue<T>(
  v: T | null | undefined,
  message = 'Expected a value but did not get anything'
) {
  if (v !== null && v !== undefined) return v;
  /* istanbul ignore next */
  throw new Error(`BUG: assertValue. Message: ${message}`);
}

function assertType<T>(
  v: unknown,
  type: string,
  message = 'Got unexpected type'
): T {
  if (typeof v === type) return v as T;
  /* istanbul ignore next */
  throw new Error(`BUG: assertType. Message: ${message}`);
}

const coders: Partial<
  Record<
    keyof FormState,
    {
      encoder: (state: InputState) => any;
      decoder: (value: unknown) => string;
    }
  >
> = {
  moduleId: {
    encoder: (state: InputState) => `modules/${state.value}/index.cnxml`,
    decoder: (value: unknown) =>
      assertValue(assertType<string>(value, 'string').split('/').at(-2)),
  },
};

export default class OpenstaxMetadataForm extends React.Component<FormProps> {
  public state: FormState = {
    books: [],
    lo: [],
    moduleId: [],
    elementId: [],
    apLo: [],
    blooms: { ...defaultInputState },
    assignmentType: { ...defaultInputState },
    dokTag: { ...defaultInputState },
    time: { ...defaultInputState },
    nickname: { ...defaultInputState },
    hts: { ...defaultInputState },
    rp: { ...defaultInputState },
    'science-practice': { ...defaultInputState },
    isSolutionPublic: { ...defaultInputState, value: 'true' },
    aacn: { ...defaultInputState },
    nclex: { ...defaultInputState },
  };

  constructor(props: FormProps) {
    super(props);
  }

  private onSaveError(message: string) {
    this.props.onSaveError(`OpenStax Metadata: ${message}`);
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
      // TODO: Improve error handling during decoding
      console.error((err as Error).message);
    }
  }

  async save(contentId: string) {
    if (this.isInputValid) {
      try {
        await this.props.contentService.saveOSMeta(
          contentId,
          this.encodedValues
        );
      } catch (err) {
        /* istanbul ignore next */
        this.onSaveError((err as Error).message);
      }
    }
  }

  get metadataEntries(): MetadataEntry[] {
    return Object.entries(this.state).filter(isMetadataEntry);
  }

  get encodedValues() {
    // TODO: Remove optional fields that are empty?
    const encodeValue = (key: keyof FormState, state: InputState): any =>
      key in coders ? coders[key]!.encoder(state) : state.value;
    return Object.fromEntries(
      this.metadataEntries.map(([key, oneOrMany]) => [
        key,
        Array.isArray(oneOrMany)
          ? oneOrMany.map((item) => encodeValue(key, item))
          : encodeValue(key, oneOrMany),
      ])
    );
  }

  decodeValues(metadata: any): Partial<FormState> {
    const decode = (key: keyof SavedState, value: any): string =>
      key in coders ? coders[key]!.decoder(value) : value.toString();
    const decodeValue = (key: keyof SavedState, value: any): InputState => {
      return {
        ...defaultInputState,
        value: decode(key, value),
      };
    };
    return Object.fromEntries(
      Object.entries(metadata)
        .filter(isSavedEntry)
        .map(([key, oneOrMany]) => [
          key,
          Array.isArray(oneOrMany)
            ? oneOrMany.map((item) => decodeValue(key, item))
            : decodeValue(key, oneOrMany),
        ])
    );
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
        this.onSaveError(`Value for "${key}" is invalid`);
        return false;
      }
      if (required.includes(key) && value.value === '') {
        this.onSaveError(`"${key}" cannot be empty.`);
        return false;
      }
      return true;
    };
    const isArrayValid = (key: keyof SavedState, inputSet: InputState[]) => {
      if (required.includes(key) && inputSet.length === 0) {
        this.onSaveError(`Expected at least one value for ${key}`);
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

  get hasApBook() {
    return this.state.books.some((b) => b.value.startsWith('stax-ap'));
  }

  get hasApScienceBook() {
    return this.state.books.some(
      (b) => b.value === 'stax-apphys' || b.value === 'stax-apbio'
    );
  }

  get hasApHistoryBook() {
    return this.state.books.some((b) => b.value === 'stax-apush');
  }

  get hasNursingBook() {
    const nursingBooks = [
      'stax-matnewborn',
      'stax-nursingskills',
      'stax-psychnursing',
      'stax-medsurg',
      'stax-nursingfundamentals',
      'stax-pharmacology',
      'stax-nutrition',
      'stax-pophealth',
    ];
    return this.state.books.some((b) => nursingBooks.includes(b.value));
  }

  private reset(key: keyof SingleInputs | keyof InputSets) {
    const state = this.state[key];
    if (Array.isArray(state)) {
      if (state.length !== 0) {
        /* istanbul ignore next */
        this.setState({ [key]: [] });
      }
      return;
    }
    if (!Object.keys(state).every((k) => state[k] === defaultInputState[k])) {
      /* istanbul ignore next */
      this.setState({ [key]: { ...defaultInputState } });
    }
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
      { make: () => <Nickname {...inputHandlerProps('nickname')} /> },
      { make: () => <Book {...inputSetHandlerProps('books')} /> },
      { make: () => <LO {...inputSetHandlerProps('lo')} /> },
      {
        make: () => <APLO {...inputSetHandlerProps('apLo')} />,
        isActive: this.hasApBook,
      },
      {
        make: () => (
          <SciencePractice
            {...inputHandlerProps('science-practice')}
            books={this.state.books.map((b) => b.value)}
          />
        ),
        isActive: this.hasApScienceBook,
      },
      {
        make: () => <HistoricalThinking {...inputHandlerProps('hts')} />,
        isActive: this.hasApHistoryBook,
      },
      {
        make: () => <ReasoningProcess {...inputHandlerProps('rp')} />,
        isActive: this.hasApHistoryBook,
      },
      { make: () => <ModuleID {...inputSetHandlerProps('moduleId')} /> },
      { make: () => <ElementID {...inputSetHandlerProps('elementId')} /> },
      { make: () => <Blooms {...inputHandlerProps('blooms')} /> },
      {
        make: () => <AssignmentType {...inputHandlerProps('assignmentType')} />,
      },
      { make: () => <DokTag {...inputHandlerProps('dokTag')} /> },
      { make: () => <Time {...inputHandlerProps('time')} /> },
      {
        make: () => <AACN {...inputHandlerProps('aacn')} />,
        isActive: this.hasNursingBook,
      },
      {
        make: () => <NCLEX {...inputHandlerProps('nclex')} />,
        isActive: this.hasNursingBook,
      },
      {
        make: () => (
          <PublicCheckbox {...inputHandlerProps('isSolutionPublic')} />
        ),
      },
    ];

    if (!this.hasApBook) {
      this.reset('apLo');
    }
    if (!this.hasApHistoryBook) {
      this.reset('hts');
      this.reset('rp');
    }
    if (!this.hasApScienceBook) {
      this.reset('science-practice');
    }

    const inputsPerRow = 2;
    const colClass = `col-${Math.ceil(12 / inputsPerRow)}`;

    return (
      <Accordion
        style={{ maxWidth: '960px', margin: '10px 0' }}
        children={[
          {
            title: 'OpenStax Metadata',
            content: (
              <div className="container mb-4 mt-4">
                {chunk(
                  inputs
                    .filter((i) => i.isActive !== false)
                    .map((i) => i.make()),
                  inputsPerRow
                ).map((inputsChunk, rowIdx) => (
                  <div className="row mb-4" key={`row-${rowIdx}`}>
                    {inputsChunk.map((input, colIdx) => (
                      <div className={colClass} key={`col-${colIdx}`}>
                        {input}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    );
  }
}
