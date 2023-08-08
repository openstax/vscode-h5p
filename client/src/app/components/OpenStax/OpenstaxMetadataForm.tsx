import React from 'react';
import Blooms from './Blooms';
import AssignmentType from './AssignmentType';
import { Book } from './Book';
import DokTag from './Dok';
import { assertType, assertValue, chunk } from './utils';
import {
  InputState,
  BookInputState,
  SingleInputProps,
  InputSetHandlerProps,
} from './types';
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
import {
  AP_BOOKS,
  AP_HISTORY_BOOKS,
  AP_SCIENCE_BOOKS,
  BOOKS,
  NURSING_BOOKS,
} from './constants';
import { Button } from 'react-bootstrap';

type SingleInputs = {
  blooms: InputState;
  'assignment-type': InputState;
  'dok-tag': InputState;
  time: InputState;
  nickname: InputState;
  'is-solution-public': InputState;
};

type InputSets = {
  books: InputState[];
  'module-id': InputState[];
};

type BookInputs = {
  lo: BookInputState[];
  'ap-lo': BookInputState[];
  hts: BookInputState[];
  rp: BookInputState[];
  'science-practice': BookInputState[];
  aacn: BookInputState[];
  nclex: BookInputState[];
};

type FormState = SingleInputs & InputSets & BookInputs;

type FormProps = {
  contentService: IContentService;
  contentId: string;
  onSaveError: (message: string) => void;
};

type SavedState = Record<keyof SingleInputs | keyof InputSets, any>;
type MetadataEntry = [keyof SavedState, InputState | InputState[]];
type SavedEntry = [keyof SavedState, string | string[]];

const defaultInputState: InputState = { value: '', isValid: true };

const bookInputs: Array<{
  isActive: (book: string) => boolean;
  make: (
    book: string,
    inputHandlerFactory: (
      book: string,
      type: keyof BookInputs
    ) => SingleInputProps & { book: string },
    inputSetHandlerFactory: (
      book: string,
      type: keyof BookInputs
    ) => InputSetHandlerProps<BookInputState>
  ) => JSX.Element;
  key: keyof BookInputs;
  isInputSet?: boolean;
  isRequired?: boolean;
}> = [
  {
    key: 'lo',
    isActive: (book) => !AP_BOOKS.includes(book),
    make(book, _, inputSetHandlerFactory) {
      return <LO {...inputSetHandlerFactory(book, this.key)} />;
    },
    isInputSet: true,
    isRequired: true,
  },
  {
    key: 'ap-lo',
    isActive: (book) => AP_BOOKS.includes(book),
    make(book, _, inputSetHandlerFactory) {
      return <APLO {...inputSetHandlerFactory(book, this.key)} />;
    },
    isInputSet: true,
    isRequired: true,
  },
  {
    key: 'aacn',
    isActive: (book) => NURSING_BOOKS.includes(book),
    make(book, inputHandlerFactory, _) {
      return <AACN {...inputHandlerFactory(book, this.key)} />;
    },
  },
  {
    key: 'nclex',
    isActive: (book) => NURSING_BOOKS.includes(book),
    make(book, inputHandlerFactory, _) {
      return <NCLEX {...inputHandlerFactory(book, this.key)} />;
    },
  },
  {
    key: 'science-practice',
    isActive: (book) => AP_SCIENCE_BOOKS.includes(book),
    make(book, inputHandlerFactory, _) {
      return (
        <SciencePractice {...inputHandlerFactory(book, this.key)} book={book} />
      );
    },
  },
  {
    key: 'hts',
    isActive: (book) => AP_HISTORY_BOOKS.includes(book),
    make(book, inputHandlerFactory, _) {
      return <HistoricalThinking {...inputHandlerFactory(book, this.key)} />;
    },
  },
  {
    key: 'rp',
    isActive: (book) => AP_HISTORY_BOOKS.includes(book),
    make(book, inputHandlerFactory, _) {
      return <ReasoningProcess {...inputHandlerFactory(book, this.key)} />;
    },
  },
];

const exerciseInputs: Array<
  {
    isActive?: boolean;
    make: (
      inputHandlerFactory: (type: keyof SingleInputs) => SingleInputProps,
      inputSetHandlerFactory: (
        type: keyof InputSets
      ) => InputSetHandlerProps<InputState>
    ) => JSX.Element;
    isInputSet?: boolean;
    isRequired?: boolean;
  } & ({ key: keyof InputSets } | { key: keyof SingleInputs })
> = [
  {
    key: 'nickname',
    make(inputHandlerFactory, _) {
      return <Nickname {...inputHandlerFactory(this.key)} />;
    },
    isRequired: true,
  },
  {
    key: 'module-id',
    make(_, inputSetHandlerFactory) {
      return <ModuleID {...inputSetHandlerFactory(this.key)} />;
    },
    isInputSet: true,
  },
  {
    key: 'blooms',
    make(inputHandlerFactory, _) {
      return <Blooms {...inputHandlerFactory(this.key)} />;
    },
    isRequired: true,
  },
  {
    key: 'assignment-type',
    make(inputHandlerFactory, _) {
      return <AssignmentType {...inputHandlerFactory(this.key)} />;
    },
  },
  {
    key: 'dok-tag',
    make(inputHandlerFactory, _) {
      return <DokTag {...inputHandlerFactory(this.key)} />;
    },
  },
  {
    key: 'time',
    make(inputHandlerFactory, _) {
      return <Time {...inputHandlerFactory(this.key)} />;
    },
  },
  {
    key: 'is-solution-public',
    make(inputHandlerFactory, _) {
      return <PublicCheckbox {...inputHandlerFactory(this.key)} />;
    },
  },
];

const metadataKeys: Array<keyof SavedState> = exerciseInputs.map((e) => e.key);
const bookInputKeys: Array<keyof BookInputs> = bookInputs.map((b) => b.key);

function isMetadataEntry(entry: [any, any]): entry is MetadataEntry {
  return metadataKeys.includes(entry[0]);
}

function isSavedEntry(entry: [any, any]): entry is SavedEntry {
  return metadataKeys.includes(entry[0]);
}

function isBookInputEntry(
  entry: [any, any]
): entry is [string, BookInputState[]] {
  return bookInputKeys.includes(entry[0]);
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
  'module-id': {
    encoder: (state: InputState) => {
      const splitValue = state.value.split('#');
      return {
        module: `modules/${splitValue[0]}/index.cnxml`,
        'element-id': splitValue[1] ?? '',
      };
    },
    decoder: (value: any) => {
      const moduleId = assertValue(
        assertType<string>(value['module'], 'string').split('/').at(-2)
      );
      return value['element-id'] !== ''
        ? `${moduleId}#${value['element-id']}`
        : moduleId;
    },
  },
};

export default class OpenstaxMetadataForm extends React.Component<FormProps> {
  public state: FormState = {
    'module-id': [],
    blooms: { ...defaultInputState },
    'assignment-type': { ...defaultInputState },
    'dok-tag': { ...defaultInputState },
    time: { ...defaultInputState },
    nickname: { ...defaultInputState },
    'is-solution-public': { ...defaultInputState, value: 'true' },
    books: [],
    'ap-lo': [],
    lo: [],
    rp: [],
    hts: [],
    'science-practice': [],
    aacn: [],
    nclex: [],
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
    const metadata = Object.fromEntries(
      this.metadataEntries.map(([key, oneOrMany]) => [
        key,
        Array.isArray(oneOrMany)
          ? oneOrMany.map((item) => encodeValue(key, item))
          : encodeValue(key, oneOrMany),
      ])
    );
    const bookMetadataEntries = Object.entries(this.state).filter(
      isBookInputEntry
    );
    const bookInputSets = bookInputs
      .filter((b) => b.isInputSet === true)
      .map((b) => b.key as string);
    const bookMetadata = Object.fromEntries(
      this.state.books
        .filter((b) => b.value !== '')
        .map((b) => {
          const book = b.value;
          return [
            book,
            Object.fromEntries(
              bookMetadataEntries
                .map(([stateKey, bookStates]): [string, string[]] => [
                  stateKey,
                  bookStates
                    .filter((bookState) => bookState.book === book)
                    .map((bookState) => bookState.value),
                ])
                .filter(([_, v]) => v.length > 0)
                .map(([k, v]) => [k, bookInputSets.includes(k) ? v : v[0]])
            ),
          ];
        })
    );
    return { ...metadata, books: bookMetadata };
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
    const exerciseMetadata = Object.fromEntries(
      Object.entries(metadata)
        .filter(isSavedEntry)
        .map(([key, oneOrMany]) => [
          key,
          Array.isArray(oneOrMany)
            ? oneOrMany.map((item) => decodeValue(key, item))
            : decodeValue(key, oneOrMany),
        ])
    );
    const books = Object.entries(metadata['books'] ?? {}) as [string, any];
    const bookMetadata = {
      books: books.map(([k, _]) => ({ ...defaultInputState, value: k })),
      ...Object.fromEntries(
        bookInputKeys.map((k) => {
          const value: any[] = [];
          books.forEach(([book, values]) => {
            const valuesByKey = values[k];
            if (Array.isArray(valuesByKey)) {
              valuesByKey.forEach((v) =>
                value.push({
                  ...defaultInputState,
                  value: v,
                  book,
                })
              );
            } else if (valuesByKey !== undefined) {
              value.push({ ...defaultInputState, value: valuesByKey, book });
            }
          });
          return [k, value];
        })
      ),
    };
    return { ...exerciseMetadata, ...bookMetadata };
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

  render() {
    const inputSetHandlerProps = <K extends keyof InputSets | keyof BookInputs>(
      type: K
    ) => {
      return {
        inputs: this.state[type],
        handleAddInput: (newInput?: InputState | BookInputState) => {
          const inputs = this.state[type];
          this.setState({
            [type]: [...inputs, newInput ?? { ...defaultInputState }],
          });
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
          newInputs[index] = { ...newInputs[index], value, isValid };
          this.setState({ [type]: newInputs });
        },
      };
    };

    const inputHandlerProps = <K extends keyof SingleInputs | keyof BookInputs>(
      type: K
    ) => ({
      handleInputChange: (value: string, isValid: boolean = true) =>
        this.setState({ [type]: { value, isValid } }),
      ...this.state[type],
    });

    const bookInputSetHandlerProps = (book: string, type: keyof BookInputs) => {
      const getIdx = (book: string, idx: number, arr: BookInputState[]) => {
        let idxByBook = 0;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].book === book) {
            if (idxByBook === idx) {
              return i;
            }
            idxByBook++;
          }
        }
      };
      const baseProps = inputSetHandlerProps(type);
      return {
        inputs: baseProps.inputs.filter((bookInput) => bookInput.book === book),
        handleAddInput: () => {
          baseProps.handleAddInput({ ...defaultInputState, book });
        },
        handleRemoveInput: (index) => {
          baseProps.handleRemoveInput(
            assertValue(getIdx(book, index, this.state[type]))
          );
        },
        handleInputChange: (
          index: number,
          value: string,
          isValid: boolean = true
        ) => {
          baseProps.handleInputChange(
            assertValue(getIdx(book, index, this.state[type])),
            value,
            isValid
          );
        },
      };
    };

    const bookInputHandlerProps = (book: string, type: keyof BookInputs) => {
      const getOrAdd = () => {
        const existing = this.state[type].find(
          (bookInput) => bookInput.book === book
        );
        if (existing !== undefined) {
          return existing;
        } else {
          // Add new entry. This will be cleaned up in book change handler.
          const newState = { ...defaultInputState, book };
          this.setState({ [type]: [...this.state[type], newState] });
          return newState;
        }
      };
      return {
        ...getOrAdd(),
        handleInputChange: (value: string, isValid: boolean = true) => {
          const idx = this.state[type].findIndex(
            (bookState) => bookState.book === book
          );
          const newInputs = [...this.state[type]];
          newInputs[idx] = { value, isValid, book };
          this.setState({
            [type]: newInputs,
          });
        },
      };
    };

    const inputsPerRow = 2;
    const colClass = `col-${Math.ceil(12 / inputsPerRow)}`;

    const bookHandlerProps = inputSetHandlerProps('books');

    const handleBookChange = (oldBook: string, newBook?: string) => {
      const activeInputs =
        newBook !== undefined
          ? bookInputs.filter((input) => input.isActive(newBook))
          : [];
      const updated = Object.fromEntries(
        Object.entries(this.state)
          .filter(isBookInputEntry)
          .map(([key, value]) => {
            const isStateActive = activeInputs.some(
              (input) => input.key === key
            );
            const updatedValue = value
              .map((bookState) => {
                switch (true) {
                  // Books do not match: keep same state
                  case bookState.book !== oldBook:
                    return bookState;
                  // State should exist for new book: update referenced book
                  case isStateActive:
                    return { ...bookState, book: newBook };
                  // State should not exist for new book: mark for removal
                  default:
                    return null;
                }
              })
              .filter(
                (bookState): bookState is BookInputState => bookState != null
              );
            return [key, updatedValue];
          })
      );
      this.setState(updated);
    };

    return (
      <Accordion
        style={{ maxWidth: '960px', margin: '10px 0' }}
        children={[
          {
            title: 'OpenStax Metadata',
            content: (
              <div className="container mb-4 mt-4">
                {chunk(
                  exerciseInputs
                    .filter((i) => i.isActive !== false)
                    .map((i) =>
                      i.make(inputHandlerProps, inputSetHandlerProps)
                    ),
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
                <div className="row">
                  <div className="col-12 text-center h3">Books</div>
                </div>
                {bookHandlerProps.inputs.map((bookState, idx) => {
                  const myBook = bookState.value;
                  // Books selected by this dropdown or not selected by any other
                  const selectableBooks = BOOKS.filter(
                    ([value, _]) =>
                      value === myBook ||
                      bookHandlerProps.inputs.every((b) => value !== b.value)
                  );

                  return (
                    <div
                      key={`book-${idx}`}
                      className="p-2 m-1 mb-2 row"
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#F8CECC' : '#DAE8FC',
                        borderRadius: '0.25em',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <div
                        className="col-11"
                        style={{ padding: '0', paddingRight: '8px' }}
                      >
                        <Book
                          {...bookState}
                          books={selectableBooks}
                          handleInputChange={(value) => {
                            bookHandlerProps.handleInputChange(idx, value);
                            handleBookChange(myBook, value);
                          }}
                        />
                      </div>
                      <div className="col-1 p-0">
                        <Button
                          style={{ width: '100%' }}
                          onClick={() => {
                            bookHandlerProps.handleRemoveInput(idx);
                            handleBookChange(myBook);
                          }}
                          data-control-type="remove-book"
                        >
                          -
                        </Button>
                      </div>
                      {myBook === ''
                        ? null
                        : chunk(
                            bookInputs
                              .filter((input) => input.isActive(myBook))
                              .map((input) =>
                                input.make(
                                  myBook,
                                  bookInputHandlerProps,
                                  bookInputSetHandlerProps
                                )
                              ),
                            inputsPerRow
                          ).map((inputsChunk, rowIdx) => (
                            <div
                              className="row p-0 mt-4"
                              key={`book-row-${rowIdx}`}
                            >
                              {inputsChunk.map((input, colIdx) => (
                                <div
                                  className={colClass}
                                  key={`book-col-${colIdx}`}
                                >
                                  {input}
                                </div>
                              ))}
                            </div>
                          ))}
                    </div>
                  );
                })}
                <div className="row">
                  <div
                    className="col-12 text-center"
                    data-control-type="add-book"
                  >
                    <Button
                      style={{ width: '100px' }}
                      onClick={() => bookHandlerProps.handleAddInput()}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />
    );
  }
}
