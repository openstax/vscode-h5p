import {
  cleanup,
  fireEvent,
  render,
  getByText,
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
  BOOKS,
  NURSING_BOOKS,
} from '../constants';

const SEL_INPUT_SET_ADD = '[data-control-type="input-set-add"]';
const SEL_INPUT_SET_REM = '[data-control-type="input-set-subtract"]';

describe('OpenstaxMetadataForm', () => {
  const defaultMockContentService = {
    getOSMeta: jest.fn().mockResolvedValue({}),
    saveOSMeta: jest.fn().mockResolvedValue(undefined),
  } as any as IContentService;

  const defaultFormProps = {
    contentId: 'new',
    contentService: defaultMockContentService,
    onSaveError: jest.fn(),
  };

  const minFormData = {
    nickname: 'test',
    blooms: 1,
  };

  const createForm = async (formProps) => {
    const openstaxForm = React.createRef<OpenstaxMetadataForm>();
    let all;
    await act(async () => {
      all = render(<OpenstaxMetadataForm {...formProps} ref={openstaxForm} />);
    });
    return { openstaxForm, ...all };
  };

  const revealForm = async ({ getByText }) => {
    const formTitle = await getByText('OpenStax Metadata');
    const formParent = formTitle.parentElement;
    expect(formTitle).toBeTruthy();
    expect(formParent).toBeTruthy();
    // Open the Accordion so that its children render
    fireEvent.click(formTitle.parentElement!, { button: 1 });
  };

  const initForm = async (formData, formPropsOverride) => {
    const formProps = {
      ...defaultFormProps,
      contentService: {
        ...defaultMockContentService,
        getOSMeta: jest.fn().mockResolvedValue(formData),
      },
      ...formPropsOverride,
    };
    const controller = await createForm(formProps);
    await revealForm(controller);
    return controller;
  };

  const initFormWithMinData = async (args: {
    formDataOverride?;
    formPropsOverride?;
  }) => {
    const { formDataOverride = {}, formPropsOverride = {} } = args;
    return await initForm(
      { ...minFormData, ...formDataOverride },
      formPropsOverride
    );
  };

  const selectOption = (container: HTMLElement, idx: number, value: string) => {
    const input = [
      ...container.querySelectorAll('input[role="combobox"]'),
    ].find((el, i) => el.id.match(/^react-select-\d+-input$/) && i === idx);
    if (input === undefined) {
      throw new Error('Failed to find input for select box');
    }
    act(() => {
      // Type the value then press Enter
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { keyCode: 13 });
    });
  };

  afterEach(cleanup);

  beforeEach(() => jest.resetAllMocks());

  describe('Default Input Set', () => {
    it('is rendered', async () => {
      const controller = await createForm(defaultFormProps);
      const { getByText } = controller;
      await revealForm(controller);
      expect(await getByText('Books')).toBeTruthy();
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
      expect(await getByText('Books')).toBeTruthy();
    });
    [-1, 1].forEach((inc) => {
      const isAdd = inc > 0;
      it(`can ${isAdd ? 'add' : 'remove'} inputs in a set`, async () => {
        const { container } = await initFormWithMinData({
          formDataOverride: {
            'module-id': [{ module: 'a/b/c', 'element-id': '' }],
          },
        });
        const inputCountBefore = container.querySelectorAll('input').length;
        const expectedCount = inputCountBefore + inc;
        const selector = isAdd ? SEL_INPUT_SET_ADD : SEL_INPUT_SET_REM;
        const button = container.querySelector(selector)?.firstElementChild;
        expect(button).not.toBeFalsy();
        act(() => {
          fireEvent.click(button!, { button: 1 });
        });
        expect(container.querySelectorAll('input').length).toBe(expectedCount);
      });
    });
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
            formDataOverride: { books: { [book]: {} } },
          });
          expect(await getByText(text)).toBeTruthy();
        });
      });
    });
  });
  describe('Book inputs', () => {
    const getBookInput = (
      container: HTMLElement,
      bookIdx: number,
      name: string
    ): Element | undefined => {
      return Array.from(
        Array.from(container.querySelectorAll('[data-control-type="book"]'))[
          bookIdx
        ]?.querySelectorAll('.container') ?? []
      ).find((el) => el.querySelector('h3')?.textContent === name);
    };
    [-1, 1].forEach((inc) => {
      const isAdd = inc > 0;
      it(`can ${isAdd ? 'add' : 'remove'} books`, async () => {
        const { container } = await initFormWithMinData({
          formDataOverride: {
            books: {
              'stax-psy': {
                lo: ['1-2-3'],
              },
            },
          },
        });
        const bookSelector = '[data-control-type="book"]';
        const bookCountBefore = container.querySelectorAll(bookSelector).length;
        const expectedCount = bookCountBefore + inc;
        const selector = isAdd
          ? '[data-control-type="add-book"]'
          : '[data-control-type="remove-book"]';
        const button = container.querySelector(selector)?.firstElementChild;
        expect(button).toBeTruthy();
        act(() => {
          fireEvent.click(button!, { button: 1 });
        });
        expect(container.querySelectorAll(bookSelector).length).toBe(
          expectedCount
        );
      });
    });
    it('correctly adds and removes inputs in a set', async () => {
      const { container } = await initFormWithMinData({
        formDataOverride: {
          books: {
            'stax-psy': {
              lo: ['1-2-3'],
            },
          },
        },
      });
      const bookEl = getBookInput(container, 0, 'Learning Objectives');
      const addButton =
        bookEl!.querySelector(SEL_INPUT_SET_ADD)?.firstElementChild;
      const remButton =
        bookEl!.querySelector(SEL_INPUT_SET_REM)?.firstElementChild;

      expect(bookEl!.querySelectorAll(SEL_INPUT_SET_REM).length).toBe(1);

      act(() => {
        fireEvent.click(addButton!, { button: 1 });
      });
      expect(bookEl!.querySelectorAll(SEL_INPUT_SET_REM).length).toBe(2);

      act(() => {
        fireEvent.click(remButton!, { button: 1 });
      });
      expect(bookEl!.querySelectorAll(SEL_INPUT_SET_REM).length).toBe(1);
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
          books: {
            'stax-something-else': {
              lo: [getValue()],
            },
            'stax-psy': {
              lo: [getValue(), oldValue, getValue()],
            },
            'stax-anything': {
              lo: [getValue()],
            },
          },
        },
      });
      const bookInput = getBookInput(
        container,
        1,
        'Learning Objectives'
      ) as HTMLElement;
      act(() => {
        fireEvent.change(getByDisplayValue(bookInput, oldValue)!, {
          target: { value: newValue },
        });
      });
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
          books: {
            'stax-nutrition': {
              aacn: getValue(),
            },
            'stax-pharmacology': {
              // Empty to test adding state for inputs
            },
            'stax-pophealth': {
              aacn: getValue(),
            },
          },
        },
      });
      const bookInput = getBookInput(container, 1, 'AACN') as HTMLElement;
      act(() => {
        fireEvent.change(getByDisplayValue(bookInput, oldValue)!, {
          target: { value: newValue },
        });
      });
      expect(openstaxForm.current!.encodedValues).toMatchSnapshot();
    });
    describe('handleBookChange', () => {
      it('keeps input values when they exist on the new book', async () => {
        const { container, openstaxForm } = await initFormWithMinData({
          formDataOverride: {
            books: {
              'stax-amfg': {
                lo: ['test-carry-state-to-stax-usgovt'],
              },
              'stax-psy': {
                lo: ['test-keep-state-on-stax-psy'],
              },
            },
          },
        });
        const bookEl = container.querySelector('[data-control-type="book"]');
        selectOption(bookEl, 0, 'stax-usgovt');
        expect(openstaxForm.current!.encodedValues).toMatchSnapshot();
      });
    });
  });
  describe('encode/decode form state', () => {
    const formDataEncoded = {
      ...minFormData,
      'module-id': ['m000001', 'm000002', 'm000003#term-03'].map((id) => {
        const splitValue = id.split('#');
        return {
          module: `modules/${splitValue[0]}/index.cnxml`,
          'element-id': splitValue[1] ?? '',
        };
      }),
      books: {
        'stax-psy': {
          lo: ['00-00-01'],
        },
        'stax-apbio': {
          'ap-lo': ['ABC.0.F'],
          'science-practice': 'concept-explanation',
        },
      },
    };
    it('decodes form state when loading and encodes when saving', async () => {
      const controller = await initFormWithMinData({
        formDataOverride: formDataEncoded,
      });
      const { openstaxForm } = controller;
      await openstaxForm.current!.save();
      expect(
        openstaxForm.current!.decodeValues(formDataEncoded)
      ).toMatchSnapshot();
      expect(
        (defaultMockContentService.saveOSMeta as jest.Mock).mock.calls
      ).toMatchSnapshot();
    });
  });
  describe('Form validation', () => {
    it('stores information about field validity', async () => {
      const nicknameInitialValue = 'supercoolnickname';
      const errorValue = nicknameInitialValue + '+';
      const { openstaxForm, getByDisplayValue } = await initFormWithMinData({
        formDataOverride: { nickname: nicknameInitialValue },
      });
      const nickInput = await getByDisplayValue(nicknameInitialValue);
      expect(nickInput).toBeTruthy();
      // Validity checks happen in handleInputChange
      act(() => {
        fireEvent.change(nickInput, { target: { value: errorValue } });
      });
      await openstaxForm.current!.save();
      expect(defaultMockContentService.saveOSMeta).not.toHaveBeenCalled();
      expect(nickInput.value).toBe(errorValue);
      expect(openstaxForm.current!.isInputValid).toBe(false);
      expect(defaultFormProps.onSaveError).toHaveBeenCalledWith(
        'OpenStax Metadata: Value for "nickname" is invalid'
      );
    });
    it('rejects invalid book input set values', async () => {
      const { openstaxForm: openstaxFormBadLO, getByDisplayValue } =
        await initFormWithMinData({
          formDataOverride: {
            books: {
              'stax-phys': {
                lo: ['test bookInputSetHandlerProps.getIdx', 'test-lo-field'],
              },
            },
          },
        });
      const loInput = getByDisplayValue('test-lo-field');
      expect(loInput).toBeTruthy();
      act(() => {
        fireEvent.change(loInput!, { target: { value: 'invalid ' } });
      });
      await openstaxFormBadLO.current!.save('new');
      expect(defaultFormProps.onSaveError).toHaveBeenCalledWith(
        'OpenStax Metadata: Value for "lo" is invalid'
      );
      expect(defaultFormProps.contentService.saveOSMeta).not.toBeCalled();
    });
    it('rejects invalid book input values', async () => {
      const { openstaxForm: openstaxFormBadLO, getByDisplayValue } =
        await initFormWithMinData({
          formDataOverride: {
            books: {
              'stax-nutrition': {
                aacn: 'test-aacn',
              },
            },
          },
        });
      const loInput = getByDisplayValue('test-aacn');
      expect(loInput).toBeTruthy();
      act(() => {
        fireEvent.change(loInput!, { target: { value: 'invalid ' } });
      });
      await openstaxFormBadLO.current!.save('new');
      expect(defaultFormProps.onSaveError).toHaveBeenCalledWith(
        'OpenStax Metadata: Value for "aacn" is invalid'
      );
      expect(defaultFormProps.contentService.saveOSMeta).not.toBeCalled();
    });
    it('does not save when information is missing', async () => {
      const formProps = { ...defaultFormProps };
      const { openstaxForm } = await createForm(formProps);
      await openstaxForm.current!.save('new');
      expect(formProps.onSaveError.mock.calls).toMatchSnapshot();
      expect(formProps.contentService.saveOSMeta).not.toBeCalled();

      (formProps.contentService.saveOSMeta as jest.Mock).mockReset();
      formProps.onSaveError.mockReset();
      cleanup();

      const { openstaxForm: openstaxFormNoNick } = await initFormWithMinData({
        formDataOverride: { nickname: '' },
      });
      await openstaxFormNoNick.current!.save('new');
      expect(formProps.onSaveError.mock.calls).toMatchSnapshot();
      expect(formProps.contentService.saveOSMeta).not.toBeCalled();
    });
    it('does save when all required fields are present', async () => {
      const formProps = {
        ...defaultFormProps,
        contentService: {
          ...defaultMockContentService,
          getOSMeta: jest.fn().mockResolvedValue(minFormData),
        } as any as IContentService,
      };
      const { openstaxForm } = await createForm(formProps);
      expect(openstaxForm.current).toBeTruthy();
      await openstaxForm.current!.save('does not matter');
      expect(formProps.contentService.getOSMeta).toBeCalledTimes(1);
      expect(formProps.onSaveError).not.toBeCalled();
      expect(formProps.contentService.saveOSMeta).toBeCalledTimes(1);
    });
  });
});
