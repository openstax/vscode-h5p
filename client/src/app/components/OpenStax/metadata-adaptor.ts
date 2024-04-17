import {
  BookMetadata,
  CanonicalMetadata,
  NetworkMetadata,
} from '../../../../../common/src/types';
import { assertValue, isFalsy } from '../../../../../common/src/utils';
import {
  FormState,
  BookInputs,
  getBookInputKeys,
  isBookInputEntry,
  isInputSet,
} from './OpenstaxMetadataForm';
import { BookInputState, InputState } from './types';

function getBookMetadata(formData: FormState): BookMetadata[] {
  const bookInputEntries = Object.entries(formData).filter(isBookInputEntry);
  const tryGetMetadataForBook = (book: string): BookMetadata => {
    const collectValuesForBook = ([key, inputStates]: [
      keyof BookInputs,
      BookInputState[],
    ]): [keyof BookInputs, string[]] => [
      key,
      inputStates
        .filter((state) => state.book === book && state.value !== '')
        .map((bookState) => bookState.value),
    ];
    const entriesForBook = bookInputEntries
      .map(collectValuesForBook)
      .filter(([_, value]) => value.length > 0)
      .map(([key, value]) => [key, isInputSet(key) ? value : value[0]]);
    return { name: book, ...Object.fromEntries(entriesForBook) };
  };
  return formData.books
    .map((b) => b.value)
    .filter((book) => book !== '')
    .map(tryGetMetadataForBook);
}

export function adaptToNetworkModel(formData: FormState): NetworkMetadata {
  const noContext = formData['context'].value === '';
  const splitContext = formData['context'].value.split('#');
  return {
    nickname: formData.nickname.value,
    errata_id: formData.errata_id.value,
    // Book metadata
    books: getBookMetadata(formData),
    // Optional values (null if absent)
    blooms: formData.blooms.value === '' ? null : formData.blooms.value,
    dok: formData.dok.value === '' ? null : formData.dok.value,
    assignment_type:
      formData.assignment_type.value === ''
        ? null
        : formData.assignment_type.value,
    time: formData.time.value === '' ? null : formData.time.value,
    feature_page: noContext ? null : assertValue(splitContext[0]),
    feature_id: noContext ? null : assertValue(splitContext[1]),
  };
}

const toInputState = <T>(value: T): InputState => ({
  // Just to be sure we never end up with 'undefined' or 'null' (as strings)
  value: String(assertValue(value)),
  isValid: true,
});

const toBookInput = (book: string, value: string): BookInputState => ({
  book,
  value,
  isValid: true,
});

function canonicalBooksToFormState(
  bookMetadata: BookMetadata[],
): { books: InputState[] } & Partial<
  Record<keyof BookInputs, BookInputState[]>
> {
  const bookInputKeys = getBookInputKeys();
  const books: InputState[] = [];
  const valuesByKey = Object.fromEntries(
    bookInputKeys.map((b) => [b, []]),
  ) as unknown as Record<keyof BookInputs, BookInputState[]>;
  bookMetadata.forEach((b) => {
    books.push(toInputState(b.name));
    bookInputKeys.forEach((k) => {
      const value = b[k];
      if (Array.isArray(value)) {
        // These would be lo or aplo, for example
        valuesByKey[k].push(...value.map((v) => toBookInput(b.name, v)));
      } else if (value !== undefined) {
        valuesByKey[k].push(toBookInput(b.name, value));
      }
    });
  });
  return {
    books,
    ...valuesByKey,
  };
}

export function adaptToFormModel(
  canonicalMetadata: CanonicalMetadata,
): Partial<FormState> {
  const formState: Partial<FormState> = canonicalBooksToFormState(
    canonicalMetadata.books,
  );
  if (!isFalsy(canonicalMetadata.feature_page)) {
    formState.context = toInputState(
      `${canonicalMetadata.feature_page}#${canonicalMetadata.feature_id}`,
    );
  }
  if (!isFalsy(canonicalMetadata.blooms)) {
    formState.blooms = toInputState(canonicalMetadata.blooms);
  }
  if (!isFalsy(canonicalMetadata.assignment_type)) {
    formState.assignment_type = toInputState(canonicalMetadata.assignment_type);
  }
  if (!isFalsy(canonicalMetadata.dok)) {
    formState.dok = toInputState(canonicalMetadata.dok);
  }
  if (!isFalsy(canonicalMetadata.time)) {
    formState.time = toInputState(canonicalMetadata.time);
  }
  formState.errata_id = toInputState(canonicalMetadata.errata_id);
  return formState;
}
