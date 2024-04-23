/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  cleanup,
  fireEvent,
  render,
  getByDisplayValue,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import React from 'react';

import OpenstaxMetadataForm from '../OpenstaxMetadataForm';
import { IContentService } from '../../../services/ContentService';
import {
  AP_BOOKS,
  AP_HISTORY_BOOKS,
  AP_SCIENCE_BOOKS,
  NURSING_BOOKS,
} from '../constants';

const SEL_INPUT_SET_ADD = '[data-control-type="input-set-add"]';
const SEL_INPUT_SET_REM = '[data-control-type="input-set-subtract"]';

const SEL_BOOK = '[data-control-type="book"]';
const SEL_BOOK_REM = '[data-control-type="remove-book"]';
const SEL_BOOK_ADD = '[data-control-type="add-book"]';
const MIN_FORM_DATA = {
  errata_id: 'test',
  books: [],
};

describe('OpenstaxMetadataForm', () => {
  let defaultMockContentService: IContentService;

  let defaultFormProps: {
    contentId: string;
    contentService: IContentService;
    onSaveError: jest.Mock<any, any, any>;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    defaultMockContentService = {
      getOSMeta: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue(undefined),
    } as any as IContentService;
    defaultFormProps = {
      contentId: 'new',
      contentService: defaultMockContentService,
      onSaveError: jest.fn().mockImplementation(console.error),
    };
  });

  const createForm = async (
    formProps: JSX.IntrinsicAttributes &
      JSX.IntrinsicClassAttributes<OpenstaxMetadataForm> &
      Readonly<{
        contentService: IContentService;
        contentId: string;
        onSaveError: (message: string) => void;
      }>,
  ) => {
    const openstaxForm = React.createRef<OpenstaxMetadataForm>();
    let all;
    await act(async () => {
      all = render(<OpenstaxMetadataForm {...formProps} ref={openstaxForm} />);
    });
    return { openstaxForm, ...all! };
  };

  const toggleAccordion = async (
    { getByText }: { getByText: (text: string) => Node },
    state = true,
  ) => {
    const formTitle = await getByText('OpenStax Metadata');
    const formParent = formTitle.parentElement;
    if (state && formParent?.getAttribute('data-is-item-open') === 'true') {
      return;
    }
    expect(formTitle).toBeTruthy();
    expect(formParent).toBeTruthy();
    // Open the Accordion so that its children render
    fireEvent.click(formTitle.parentElement!, { button: 1 });
  };

  const initForm = async (formData: any, formPropsOverride: any) => {
    const formProps = {
      ...defaultFormProps,
      contentService: {
        ...defaultMockContentService,
        getOSMeta: jest.fn().mockResolvedValue(formData),
      },
      ...formPropsOverride,
    };
    const controller = await createForm(formProps);
    await toggleAccordion(controller);
    return controller;
  };

  const initFormWithMinData = async (args: {
    formDataOverride?: any;
    formPropsOverride?: any;
  }) => {
    const { formDataOverride = {}, formPropsOverride = {} } = args;
    const formData = { ...MIN_FORM_DATA, ...formDataOverride };
    return await initForm(formData, formPropsOverride);
  };

  const selectOption = (container: HTMLElement, idx: number, value: string) => {
    const input = [
      ...container.querySelectorAll('input[role="combobox"]'),
    ].find((el, i) => el.id.match(/^react-select-\d+-input$/) && i === idx);
    if (input === undefined) {
      throw new Error('Failed to find input for select box');
    }
    // Type the value then press Enter
    act(() => {
      fireEvent.change(input, { target: { value } });
    });
    act(() => {
      fireEvent.keyDown(input, { keyCode: 13 });
    });
  };

  afterEach(cleanup);

  describe('Default Input Set', () => {
    it('is rendered and allows users to toggle accordion', async () => {
      const controller = await createForm(defaultFormProps);
      const { getByText } = controller;
      expect(defaultFormProps.onSaveError).not.toBeCalled();
      // Open the accordion and ensure it is open by checking for books element
      await toggleAccordion(controller);
      expect(await getByText('Books')).toBeTruthy();

      // Close it and make sure books element is no longer visible
      await toggleAccordion(controller, false);
      await expect(async () => {
        await getByText('Books');
      }).rejects.toThrow();
    });
    it('renders when there is an error in getOSMeta', async () => {
      const { getByText } = await initFormWithMinData({
        formPropsOverride: {
          contentService: {
            ...defaultMockContentService,
            getOSMeta: jest.fn().mockRejectedValue(new Error('Test')),
          },
        },
      });
      expect(defaultFormProps.onSaveError).toBeCalled();
      expect(await getByText('Books')).toBeTruthy();
    });
    // [-1, 1].forEach((inc) => {
    //   const isAdd = inc > 0;
    //   it(`can ${isAdd ? 'add' : 'remove'} inputs in a set`, async () => {
    //     const { container } = await initFormWithMinData({
    //       formDataOverride: {
    //         context: ['a/b/c#fs-123']
    //       },
    //     });
    //     const inputCountBefore = container.querySelectorAll('input').length;
    //     const expectedCount = inputCountBefore + inc;
    //     const selector = isAdd ? SEL_INPUT_SET_ADD : SEL_INPUT_SET_REM;
    //     const button = container.querySelector(selector)?.firstElementChild;
    //     expect(button).not.toBeFalsy();
    //     act(() => {
    //       fireEvent.click(button!, { button: 1 });
    //     });
    //     expect(container.querySelectorAll('input').length).toBe(expectedCount);
    //   });
    // });
  });
  describe('Conditional Input Set', () => {
    const tests: Array<[string, string, string[]]> = [
      ['AP LO', 'AP Learning Objectives', AP_BOOKS],
      ['Science Practice', 'Science Practice', AP_SCIENCE_BOOKS],
      ['Historical Thinking', 'Historical Thinking', AP_HISTORY_BOOKS],
      ['AACN', 'AACN', NURSING_BOOKS],
      ['NCLEX', 'NCLEX', NURSING_BOOKS],
    ];
    tests.forEach(([name, text, books]) => {
      books.forEach((book) => {
        it(`shows "${name}" when "${book}" is selected`, async () => {
          const { getByText } = await initFormWithMinData({
            formDataOverride: {
              books: [
                {
                  name: book,
                },
              ],
            },
          });
          expect(await getByText(text)).toBeTruthy();
        });
      });
    });
  });
  describe('Book inputs', () => {
    const getBook = (
      container: HTMLElement,
      idx: number,
    ): HTMLElement | undefined => {
      const el = container.querySelectorAll(SEL_BOOK)[idx];
      return el === undefined ? undefined : (el as HTMLElement);
    };
    const getBookInput = (
      container: HTMLElement,
      bookIdx: number,
      name: string,
    ): HTMLElement | undefined => {
      const el = Array.from(
        Array.from(container.querySelectorAll(SEL_BOOK))[
          bookIdx
        ]?.querySelectorAll('.container') ?? [],
      ).find(
        (el) => el.querySelector('label')?.textContent?.indexOf(name) === 0,
      );
      return el === undefined ? undefined : (el as HTMLElement);
    };
    [-1, 1].forEach((inc) => {
      const isAdd = inc > 0;
      it(`can ${isAdd ? 'add' : 'remove'} books`, async () => {
        const { container } = await initFormWithMinData({
          formDataOverride: {
            books: [{ name: 'stax-psy', lo: ['1-2-3'] }],
          },
        });
        const bookCountBefore = container.querySelectorAll(SEL_BOOK).length;
        const expectedCount = bookCountBefore + inc;
        const selector = isAdd ? SEL_BOOK_ADD : SEL_BOOK_REM;
        const button = container.querySelector(selector)?.firstElementChild;
        expect(button).toBeTruthy();
        act(() => {
          fireEvent.click(button!, { button: 1 });
        });
        expect(container.querySelectorAll(SEL_BOOK).length).toBe(expectedCount);
      });
    });
    it('correctly adds and removes inputs in a set', async () => {
      const { container } = await initFormWithMinData({
        formDataOverride: {
          books: [{ name: 'stax-psy', lo: ['1-2-3'] }],
        },
      });
      const bookInput = getBookInput(container, 0, 'Learning Objectives')!;
      const addButton =
        bookInput.querySelector(SEL_INPUT_SET_ADD)?.firstElementChild;
      const remButton =
        bookInput.querySelector(SEL_INPUT_SET_REM)?.firstElementChild;

      expect(bookInput.querySelectorAll(SEL_INPUT_SET_REM).length).toBe(1);

      act(() => {
        fireEvent.click(addButton!, { button: 1 });
      });
      expect(bookInput.querySelectorAll(SEL_INPUT_SET_REM).length).toBe(2);

      act(() => {
        fireEvent.click(remButton!, { button: 1 });
      });
      expect(bookInput.querySelectorAll(SEL_INPUT_SET_REM).length).toBe(1);
    });
    it('correctly modifies inputs in a set', async () => {
      let count = 0;
      const getValue = () => {
        return `not-modified-${count++}`;
      };
      const oldValue = getValue();
      const newValue = 'stax-psy.lo[1]';
      const { container, openstaxForm } = await initFormWithMinData({
        formDataOverride: {
          books: [
            { name: 'stax-should-be-removed', lo: [getValue()] },
            { name: 'stax-psy', lo: [getValue(), oldValue, getValue()] },
            { name: 'stax-anything', lo: [getValue()] },
          ],
        },
      });
      act(() => {
        fireEvent.change(
          getByDisplayValue(
            getBookInput(container, 1, 'Learning Objectives')!,
            oldValue,
          )!,
          {
            target: { value: newValue },
          },
        );
      });
      // Remove a book
      act(() => {
        fireEvent.click(
          container.querySelector(SEL_BOOK_REM)!.firstElementChild,
          { button: 1 },
        );
      });
      // Add a book
      act(() => {
        fireEvent.click(
          container.querySelector(SEL_BOOK_ADD)!.firstElementChild,
          { button: 1 },
        );
      });
      // Add another option
      selectOption(getBook(container, 2)!, 0, 'stax-amfg');
      expect(openstaxForm.current!.encodedValues).toMatchSnapshot();
    });
    it('correctly modifies inputs', async () => {
      let count = 0;
      const getValue = () => {
        return `not-modified-${count++}`;
      };
      const oldValue = '';
      const newValue = 'modified';
      const { container, openstaxForm } = await initFormWithMinData({
        formDataOverride: {
          books: [
            { name: 'stax-nutrition', aacn: getValue() },
            // Empty to test adding state for inputs
            { name: 'stax-pharmacology' },
            { name: 'stax-pophealth', aacn: getValue() },
          ],
        },
      });
      act(() => {
        fireEvent.change(
          getByDisplayValue(getBookInput(container, 1, 'AACN')!, oldValue)!,
          {
            target: { value: newValue },
          },
        );
      });
      expect(openstaxForm.current!.encodedValues).toMatchSnapshot();
    });
    describe('handleBookChange', () => {
      it('keeps input values when they exist on the new book', async () => {
        const { container, openstaxForm } = await initFormWithMinData({
          formDataOverride: {
            books: [
              { name: 'stax-amfg', lo: ['test-carry-state-to-stax-usgovt'] },
              { name: 'stax-psy', lo: ['test-keep-state-on-stax-psy'] },
            ],
          },
        });
        selectOption(getBook(container, 0)!, 0, 'stax-usgovt');
        expect(openstaxForm.current!.encodedValues).toMatchSnapshot();
      });
    });
  });
  describe('encode/decode form state', () => {
    const formDataEncoded = {
      context: ['m00003#term-03'],
      books: [
        { name: 'stax-psy', lo: ['00-00-01'] },
        {
          name: 'stax-apbio',
          aplo: ['ABC.0.F'],
          science_practice: 'concept-explanation',
        },
      ],
    };
    it('decodes form state when loading and encodes when saving', async () => {
      const controller = await initFormWithMinData({
        formDataOverride: formDataEncoded,
      });
      const { openstaxForm } = controller;
      expect(
        openstaxForm.current!.decodeValues({
          ...MIN_FORM_DATA,
          formDataEncoded,
        }),
      ).toMatchSnapshot();
      expect(openstaxForm.current!.encodedValues).toMatchSnapshot();
    });
  });
  describe('Form validation', () => {
    it('stores information about field validity', async () => {
      const moduleNumber = 'm00001';
      const elementId = 'fs-123';
      const contextInitialValue = `${moduleNumber}#${elementId}`;
      const errorValue = contextInitialValue + '+';
      const { openstaxForm, getByDisplayValue } = await initFormWithMinData({
        formDataOverride: {
          context: [`${moduleNumber}#${elementId}`],
        },
      });
      const moduleIdInput = await getByDisplayValue(contextInitialValue);
      expect(moduleIdInput).toBeTruthy();
      // Validity checks happen in handleInputChange
      act(() => {
        fireEvent.change(moduleIdInput, { target: { value: errorValue } });
      });
      expect(moduleIdInput.value).toBe(errorValue);
      expect(openstaxForm.current!.isInputValid).toBe(false);
      expect(defaultFormProps.onSaveError).toHaveBeenCalledWith(
        'OpenStax Metadata: Value for "context" is invalid',
      );
    });
    it('rejects invalid book input set values', async () => {
      const { openstaxForm: openstaxFormBadLO, getByDisplayValue } =
        await initFormWithMinData({
          formDataOverride: {
            books: [
              {
                name: 'stax-phys',
                lo: ['test bookInputSetHandlerProps.getIdx', 'test-lo-field'],
              },
            ],
          },
        });
      const loInput = getByDisplayValue('test-lo-field');
      expect(loInput).toBeTruthy();
      act(() => {
        fireEvent.change(loInput!, { target: { value: 'invalid ' } });
      });
      expect(openstaxFormBadLO.current!.isInputValid).toBe(false);
      expect(defaultFormProps.onSaveError).toHaveBeenCalledWith(
        'OpenStax Metadata: Value for "lo" is invalid',
      );
    });
    it('rejects invalid book input values', async () => {
      const { openstaxForm: openstaxFormBadLO, getByDisplayValue } =
        await initFormWithMinData({
          formDataOverride: {
            books: [{ name: 'stax-nutrition', aacn: 'test-aacn' }],
          },
        });
      const loInput = getByDisplayValue('test-aacn');
      expect(loInput).toBeTruthy();
      act(() => {
        fireEvent.change(loInput!, { target: { value: 'invalid ' } });
      });
      expect(openstaxFormBadLO.current!.isInputValid).toBe(false);
      expect(defaultFormProps.onSaveError).toHaveBeenCalledWith(
        'OpenStax Metadata: Value for "aacn" is invalid',
      );
    });
    // No required fields right now (leaving this in incase this changes)
    it('does not save when information is missing', async () => {
      // GIVEN: Metadata form
      const formProps = { ...defaultFormProps };
      const { openstaxForm, getByDisplayValue } = await initFormWithMinData({});
      // WHEN: Data is valid
      expect(openstaxForm.current!.encodedValues.nickname).toBe(
        formProps.contentId,
      );
      // THEN: It is seen as valid and save is called
      expect(openstaxForm.current!.isInputValid).toBe(true);
      expect(formProps.onSaveError.mock.calls).toMatchSnapshot();
      expect(formProps.contentService.save).not.toBeCalled();

      (formProps.contentService.save as jest.Mock).mockReset();
      formProps.onSaveError.mockReset();

      // GIVEN: Metadata form
      const nickInput = getByDisplayValue(formProps.contentId);
      act(() => {
        fireEvent.change(nickInput!, { target: { value: '' } });
      });
      // WHEN: Nickname is missing (data is invalid/missing required)
      expect(openstaxForm.current!.encodedValues.nickname).toBe('');
      // THEN: It is seen as invalid and save is not called
      expect(openstaxForm.current!.isInputValid).toBe(false);
      expect(formProps.onSaveError.mock.calls).toMatchSnapshot();
      expect(formProps.contentService.save).not.toBeCalled();
    });
    it('does save when all required fields are present', async () => {
      const formProps = {
        ...defaultFormProps,
        contentService: {
          ...defaultMockContentService,
          getOSMeta: jest.fn().mockResolvedValue(MIN_FORM_DATA),
        } as any as IContentService,
      };
      const { openstaxForm } = await createForm(formProps);
      expect(openstaxForm.current).toBeTruthy();
      expect(formProps.contentService.getOSMeta).toBeCalledTimes(1);
    });
  });
});
