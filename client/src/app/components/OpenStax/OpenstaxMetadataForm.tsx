import React from 'react';
import Blooms from './Blooms';
import AssignmentType from './AssignmentType';
import { Book } from './Book';
import DokTag from './Dok';
import {
  InputState,
  BookInputState,
  SingleInputProps,
  InputSetHandlerProps,
} from './types';
import LO from './LO';
import Context from './Context';
import APLO from './APLO';
import Time from './Time';
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
import Nickname from './Nickname';
import { assertValue, chunk, isFalsy } from '../../../../../common/src/utils';
import DetailedSolution from './DetailedSolution';
import { adaptToNetworkModel, adaptToFormModel } from './metadata-adaptor';
import SummarySolution from './SummarySolution';
import { randomId } from './utils';
import { Label } from './Label';

type SingleInputs = {
  nickname: InputState;
  blooms: InputState;
  assignment_type: InputState;
  dok: InputState;
  time: InputState;
  is_solution_public: InputState;
  errata_id: InputState;
  detailed_solution: InputState;
  summary_solution: InputState;
  context: InputState;
};

type InputSets = {
  books: InputState[];
};

export type BookInputs = {
  lo: BookInputState[];
  aplo: BookInputState[];
  hts: BookInputState[];
  rp: BookInputState[];
  science_practice: BookInputState[];
  aacn: BookInputState[];
  nclex: BookInputState[];
};

export type FormState = SingleInputs & InputSets & BookInputs;

type FormProps = {
  contentService: IContentService;
  contentId: string;
  onSaveError: (message: string) => void;
};

type MetadataEntry = [
  keyof SingleInputs | keyof InputSets,
  InputState | InputState[],
];

const defaultInputState: InputState = { value: '', isValid: true };

const bookInputs: Array<{
  isActive: (book: string) => boolean;
  make: (
    book: string,
    inputHandlerFactory: (
      book: string,
      type: keyof BookInputs,
    ) => SingleInputProps & { book: string },
    inputSetHandlerFactory: (
      book: string,
      type: keyof BookInputs,
    ) => InputSetHandlerProps<BookInputState>,
  ) => JSX.Element;
  key: keyof BookInputs;
  isInputSet?: boolean;
  isRequired?: boolean;
}> = [
  {
    key: 'lo',
    isActive: (book) => !AP_BOOKS.includes(book),
    make(book, _, inputSetHandlerFactory) {
      return (
        <LO
          {...inputSetHandlerFactory(book, this.key)}
          required={this.isRequired}
        />
      );
    },
    isInputSet: true,
  },
  {
    key: 'aplo',
    isActive: (book) => AP_BOOKS.includes(book),
    make(book, _, inputSetHandlerFactory) {
      return (
        <APLO
          {...inputSetHandlerFactory(book, this.key)}
          book={book}
          required={this.isRequired}
        />
      );
    },
    isInputSet: true,
  },
  {
    key: 'aacn',
    isActive: (book) => NURSING_BOOKS.includes(book),
    make(book, inputHandlerFactory) {
      return (
        <AACN
          {...inputHandlerFactory(book, this.key)}
          required={this.isRequired}
        />
      );
    },
  },
  {
    key: 'nclex',
    isActive: (book) => NURSING_BOOKS.includes(book),
    make(book, inputHandlerFactory) {
      return (
        <NCLEX
          {...inputHandlerFactory(book, this.key)}
          required={this.isRequired}
        />
      );
    },
  },
  {
    key: 'science_practice',
    isActive: (book) => AP_SCIENCE_BOOKS.includes(book),
    make(book, inputHandlerFactory) {
      return (
        <SciencePractice
          {...inputHandlerFactory(book, this.key)}
          book={book}
          required={this.isRequired}
        />
      );
    },
  },
  {
    key: 'hts',
    isActive: (book) => AP_HISTORY_BOOKS.includes(book),
    make(book, inputHandlerFactory) {
      return (
        <HistoricalThinking
          {...inputHandlerFactory(book, this.key)}
          required={this.isRequired}
        />
      );
    },
  },
  {
    key: 'rp',
    isActive: (book) => AP_HISTORY_BOOKS.includes(book),
    make(book, inputHandlerFactory) {
      return (
        <ReasoningProcess
          {...inputHandlerFactory(book, this.key)}
          required={this.isRequired}
        />
      );
    },
  },
];

const exerciseInputs: Array<
  {
    isActive?: boolean;
    make: (
      inputHandlerFactory: (type: keyof SingleInputs) => SingleInputProps,
      inputSetHandlerFactory: (
        type: keyof InputSets,
      ) => InputSetHandlerProps<InputState>,
    ) => JSX.Element;
    isInputSet?: boolean;
    isRequired?: boolean;
  } & ({ key: keyof InputSets } | { key: keyof SingleInputs })
> = [
  {
    key: 'nickname',
    isRequired: true,
    isActive: true,
    make(inputHandlerFactory) {
      return (
        <Nickname
          {...inputHandlerFactory(this.key)}
          required={this.isRequired}
        />
      );
    },
  },
  {
    key: 'context',
    make(inputHandlerFactory) {
      return (
        <Context
          {...inputHandlerFactory(this.key)}
          required={this.isRequired}
        />
      );
    },
    isInputSet: true,
  },
  {
    key: 'blooms',
    make(inputHandlerFactory) {
      return (
        <Blooms {...inputHandlerFactory(this.key)} required={this.isRequired} />
      );
    },
  },
  {
    key: 'assignment_type',
    make(inputHandlerFactory) {
      return (
        <AssignmentType
          {...inputHandlerFactory(this.key)}
          required={this.isRequired}
        />
      );
    },
  },
  {
    key: 'dok',
    make(inputHandlerFactory) {
      return (
        <DokTag {...inputHandlerFactory(this.key)} required={this.isRequired} />
      );
    },
  },
  {
    key: 'time',
    make(inputHandlerFactory) {
      return (
        <Time {...inputHandlerFactory(this.key)} required={this.isRequired} />
      );
    },
  },
  {
    key: 'detailed_solution',
    make(inputHandlerFactory) {
      return <DetailedSolution {...inputHandlerFactory(this.key)} />;
    },
  },
  {
    key: 'summary_solution',
    make(inputHandlerFactory) {
      return <SummarySolution {...inputHandlerFactory(this.key)} />;
    },
  },
  {
    key: 'is_solution_public',
    make(inputHandlerFactory) {
      return (
        <PublicCheckbox
          {...inputHandlerFactory(this.key)}
          required={this.isRequired}
        />
      );
    },
  },
];

const EXERCISE_INPUT_KEYS: Set<keyof SingleInputs | keyof InputSets> = new Set(
  exerciseInputs.map((e) => e.key).concat(['errata_id']),
);
const BOOK_INPUT_KEYS: Set<keyof BookInputs> = new Set(
  bookInputs.map((b) => b.key),
);
const INPUT_SET_KEYS: Set<keyof FormState> = new Set(
  exerciseInputs
    .filter(({ isInputSet }) => isInputSet === true)
    .map(({ key }) => key as keyof FormState)
    .concat(['books'])
    .concat(
      bookInputs
        .filter(({ isInputSet }) => isInputSet === true)
        .map(({ key }) => key),
    ),
);

export function getBookInputKeys(): Array<keyof BookInputs> {
  return Array.from(BOOK_INPUT_KEYS);
}

export function isInputSet(key: keyof FormState): boolean {
  return INPUT_SET_KEYS.has(key);
}

export function isMetadataEntry(
  entry: [unknown, unknown],
): entry is MetadataEntry {
  return EXERCISE_INPUT_KEYS.has(entry[0] as any);
}

export function isBookInputEntry(
  entry: [any, any],
): entry is [keyof BookInputs, BookInputState[]] {
  return BOOK_INPUT_KEYS.has(entry[0]);
}

export default class OpenstaxMetadataForm extends React.Component<FormProps> {
  public override state: FormState = {
    errata_id: { ...defaultInputState },
    nickname: { ...defaultInputState },
    context: { ...defaultInputState },
    blooms: { ...defaultInputState },
    assignment_type: { ...defaultInputState },
    dok: { ...defaultInputState },
    time: { ...defaultInputState },
    detailed_solution: { ...defaultInputState },
    summary_solution: { ...defaultInputState },
    is_solution_public: { ...defaultInputState, value: 'false' },
    books: [],
    aplo: [],
    lo: [],
    rp: [],
    hts: [],
    science_practice: [],
    aacn: [],
    nclex: [],
  };

  constructor(props: FormProps) {
    super(props);
  }

  private onSaveError(message: string) {
    this.props.onSaveError(`OpenStax Metadata: ${message}`);
  }

  public override async componentDidMount(): Promise<void> {
    try {
      const metadata = await this.props.contentService.getOSMeta(
        this.props.contentId,
      );
      if (Object.keys(metadata).length > 0) {
        const decoded = this.decodeValues(metadata);
        decoded.nickname = {
          ...defaultInputState,
          value: this.props.contentId,
          isDisabled: true,
        };
        this.setState(decoded);
      } else {
        const errataId = await randomId({ maxLength: 7 });
        const errataIdInputState = { ...defaultInputState, value: errataId };
        this.setState({
          nickname: { ...errataIdInputState },
          errata_id: errataIdInputState,
        });
      }
    } catch (err) {
      // TODO: Improve error handling during decoding
      this.props.onSaveError((err as Error).message);
    }
  }

  get metadataEntries(): MetadataEntry[] {
    return Object.entries(this.state).filter(isMetadataEntry);
  }

  get encodedValues() {
    return adaptToNetworkModel(this.state);
  }

  decodeValues(metadata: any): Partial<FormState> {
    return adaptToFormModel(metadata);
  }

  get isInputValid() {
    const required = [
      ...exerciseInputs.filter((e) => e.isRequired).map((e) => e.key),
      ...bookInputs.filter((b) => b.isRequired).map((b) => b.key),
    ];
    const isInputValid = (
      key: keyof SingleInputs | keyof InputSets | keyof BookInputs,
      state: InputState | undefined,
    ) => {
      if (state?.isValid === false) {
        this.onSaveError(`Value for "${key}" is invalid`);
        return false;
      }
      /* istanbul ignore if (not currently utilized) */
      if (required.includes(key) && isFalsy(state?.value)) {
        this.onSaveError(`"${key}" cannot be empty.`);
        return false;
      }
      return true;
    };
    const isArrayValid = (
      key: keyof SingleInputs | keyof InputSets | keyof BookInputs,
      inputSet: InputState[],
    ) => {
      /* istanbul ignore if (not currently utilized) */
      if (required.includes(key) && inputSet.length === 0) {
        this.onSaveError(`Expected at least one value for ${key}`);
        return false;
      }
      return inputSet.every((inputState) => isInputValid(key, inputState));
    };
    return (
      this.metadataEntries.every(([key, oneOrMany]) =>
        Array.isArray(oneOrMany)
          ? isArrayValid(key, oneOrMany)
          : isInputValid(key, oneOrMany),
      ) &&
      this.state.books.every((b) =>
        bookInputs.every(
          (bookInput) =>
            !bookInput.isActive(b.value) ||
            (bookInput.isInputSet === true
              ? isArrayValid(
                  bookInput.key,
                  this.state[bookInput.key].filter(
                    (state) => state.book === b.value,
                  ),
                )
              : isInputValid(
                  bookInput.key,
                  this.state[bookInput.key].find(
                    (state) => state.book === b.value,
                  ),
                )),
        ),
      )
    );
  }

  override render() {
    const inputSetHandlerProps = <K extends keyof InputSets | keyof BookInputs>(
      type: K,
    ) => {
      return {
        inputs: this.state[type],
        handleAddInput: (newInput?: InputState | BookInputState) => {
          const inputs = this.state[type];
          this.setState({
            [type]: [...inputs, newInput ?? { ...defaultInputState }],
          });
        },
        handleRemoveInput: (index: number) => {
          const inputs = this.state[type];
          const newInputs = [...inputs];
          newInputs.splice(index, 1);
          this.setState({ [type]: newInputs });
        },
        handleInputChange: (
          index: number,
          value: string,
          isValid: boolean = true,
        ) => {
          const inputs = this.state[type];
          const newInputs = [...inputs];
          newInputs[index] = { ...newInputs[index], value, isValid };
          this.setState({ [type]: newInputs });
        },
      };
    };

    const inputHandlerProps = (type: keyof SingleInputs) => ({
      handleInputChange: (value: string, isValid: boolean = true) =>
        this.setState({ [type]: { value, isValid } }),
      ...this.state[type],
    });

    const bookInputSetHandlerProps = (book: string, type: keyof BookInputs) => {
      const getIdx = (book: string, idx: number, arr: BookInputState[]) => {
        let idxByBook = 0;
        let realIdx: number | undefined;
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].book === book) {
            if (idxByBook === idx) {
              realIdx = i;
              break;
            }
            idxByBook++;
          }
        }
        return assertValue(realIdx);
      };
      const baseProps = inputSetHandlerProps(type);
      return {
        inputs: baseProps.inputs.filter((bookInput) => bookInput.book === book),
        handleAddInput: () => {
          baseProps.handleAddInput({ ...defaultInputState, book });
        },
        handleRemoveInput: (index: number) => {
          baseProps.handleRemoveInput(getIdx(book, index, this.state[type]));
        },
        handleInputChange: (
          index: number,
          value: string,
          isValid: boolean = true,
        ) => {
          baseProps.handleInputChange(
            getIdx(book, index, this.state[type]),
            value,
            isValid,
          );
        },
      };
    };

    const bookInputHandlerProps = (book: string, type: keyof BookInputs) => {
      return {
        ...(this.state[type].find((bookInput) => bookInput.book === book) ?? {
          ...defaultInputState,
          book,
        }),
        handleInputChange: (value: string, isValid: boolean = true) => {
          const idx = this.state[type].findIndex(
            (bookState) => bookState.book === book,
          );
          const newInputs = [...this.state[type]];
          if (idx !== -1) {
            newInputs[idx] = { value, isValid, book };
          } else {
            // Add new entry. This will be cleaned up in book change handler.
            newInputs.push({ value, isValid, book });
          }
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
        newBook !== undefined && newBook !== ''
          ? bookInputs.filter((input) => input.isActive(newBook))
          : [];
      const updated = Object.fromEntries(
        Object.entries(this.state)
          .filter(isBookInputEntry)
          .map(([key, value]) => {
            const isStateActive = activeInputs.some(
              (input) => input.key === key,
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
                (bookState): bookState is BookInputState => bookState != null,
              );
            return [key, updatedValue];
          }),
      );
      this.setState(updated);
    };

    return (
      <Accordion
        initiallyOpenedIdx={0}
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
                      i.make(inputHandlerProps, inputSetHandlerProps),
                    ),
                  inputsPerRow,
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
                  <div className="col-12 text-center">
                    <Label content={'Books'} />
                  </div>
                </div>
                {bookHandlerProps.inputs.map((bookState, idx) => {
                  const myBook = bookState.value;
                  // Books selected by this dropdown or not selected by any other
                  const selectableBooks = BOOKS.filter(
                    ([value]) =>
                      value === myBook ||
                      bookHandlerProps.inputs.every((b) => value !== b.value),
                  );

                  return (
                    <div
                      key={`book-${idx}`}
                      className="p-2 m-1 mb-2 row"
                      style={{
                        backgroundColor:
                          idx % 2 === 0
                            ? 'rgba(128, 128, 128, 0.5)'
                            : 'rgba(128, 128, 128, 0.1)',
                        borderRadius: '0.25em',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                      }}
                      data-control-type="book"
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
                      <div
                        className="col-1 p-0"
                        data-control-type="remove-book"
                      >
                        <Button
                          style={{ width: '100%' }}
                          onClick={() => {
                            bookHandlerProps.handleRemoveInput(idx);
                            handleBookChange(myBook);
                          }}
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
                                  bookInputSetHandlerProps,
                                ),
                              ),
                            inputsPerRow,
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
