import {
  CanonicalMetadata,
  NetworkMetadata,
} from '../../../../../../common/src/types';
import { FormState } from '../OpenstaxMetadataForm';
import { adaptToFormModel, adaptToNetworkModel } from '../metadata-adaptor';
import { InputState } from '../types';

const defaultInputState: InputState = { value: '', isValid: true };
const BASE_FORM_STATE: FormState = {
  errata_id: { ...defaultInputState, value: 'fffffff' },
  nickname: { ...defaultInputState, value: 'test' },
  context: { ...defaultInputState },
  blooms: { ...defaultInputState },
  assignment_type: { ...defaultInputState },
  dok: { ...defaultInputState },
  time: { ...defaultInputState },
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

function toCanonicalModel(metadata: NetworkMetadata): CanonicalMetadata {
  // Remove nickname and any optional fields that do not have a value
  return Object.fromEntries(
    Object.entries({
      ...metadata,
      attachments: [],
    }).filter(([k, v]) => k !== 'nickname' && v !== null),
  ) as unknown as CanonicalMetadata;
}

describe('Metadata Adaptor', () => {
  it('Adapts form data to network model', () => {
    // GIVEN: Some form state
    // WHEN: The state is adapted to the network model
    // THEN:
    //  - Empty strings are replaced with null
    //  - Books without values are filtered out
    expect(
      adaptToNetworkModel({
        ...BASE_FORM_STATE,
        books: [{ ...defaultInputState, value: 'stax-should-not-be-saved' }],
      }),
    ).toMatchSnapshot();
  });
  it('Adapts to form model', () => {
    // GIVEN: Saved data that does not contain empty strings or null values
    const canonical = toCanonicalModel(adaptToNetworkModel(BASE_FORM_STATE));

    // Books should not be saved, so we overwrite that with an empty array
    const expected = Object.fromEntries(
      Object.entries(BASE_FORM_STATE).filter(
        ([k, v]) =>
          k !== 'nickname' && (Array.isArray(v) || v.value.length > 0),
      ),
    );

    // WHEN: The data is loaded
    const adapted = adaptToFormModel(canonical);

    // THEN: It does not contain nickname or empty strings
    expect(adapted).toMatchObject(expected);
  });
  it('Saves and loads values for books', () => {
    // GIVEN: Book input values
    const state: FormState = {
      ...BASE_FORM_STATE,
      books: [
        { ...defaultInputState, value: 'stax-something' },
        { ...defaultInputState, value: 'stax-apsomething' },
      ],
      lo: [{ ...defaultInputState, book: 'stax-something', value: '1-2-3' }],
      aplo: [
        { ...defaultInputState, value: '4-5-6', book: 'stax-apsomething' },
      ],
    };
    // WHEN: The data is saved
    const saved = toCanonicalModel(adaptToNetworkModel(state));
    // THEN: The books are saved as expected
    expect(saved).toMatchSnapshot();

    // WHEN: The data is loaded
    const loaded = {
      ...BASE_FORM_STATE,
      ...adaptToFormModel(saved),
    };
    // THEN: The books are loaded back into their original state
    expect(loaded).toMatchObject(state);
  });
  it('saves and loads optional values', () => {
    // GIVEN: Optional input values
    const state: FormState = {
      ...BASE_FORM_STATE,
      context: { ...defaultInputState, value: 'm12345#fs-12345' },
      blooms: { ...defaultInputState, value: '1' },
      assignment_type: { ...defaultInputState, value: 'something' },
      dok: { ...defaultInputState, value: '1' },
      time: { ...defaultInputState, value: 'Short' },
    };
    // WHEN: The data is saved
    const saved = toCanonicalModel(adaptToNetworkModel(state));
    // THEN: The optional values are saved as expected
    expect(saved).toMatchSnapshot();

    // WHEN: The data is loaded
    const loaded = {
      ...BASE_FORM_STATE,
      ...adaptToFormModel(saved),
    };
    // THEN: The optional values are loaded back into their original state
    expect(loaded).toMatchObject(state);
  });
});
