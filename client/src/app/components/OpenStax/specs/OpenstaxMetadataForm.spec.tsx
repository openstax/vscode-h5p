import { cleanup, fireEvent, render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import React from 'react';

import OpenstaxMetadataForm from '../OpenstaxMetadataForm';
import { IContentService } from '../../../services/ContentService';

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
    books: ['stax-psy'],
    blooms: 1,
    lo: ['00-00-01'],
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
        const books = ['one'];
        const { container } = await initFormWithMinData({
          formDataOverride: { books },
        });
        const inputCountBefore = container.querySelectorAll('input').length;
        const expectedCount = inputCountBefore + inc;
        const selector = isAdd
          ? '[data-control-type="input-set-add"]'
          : '[data-control-type="input-set-subtract"]';
        const button = container.querySelector(selector)?.firstElementChild;
        expect(button).not.toBe(null);
        act(() => {
          fireEvent.click(button!, { button: 1 });
        });
        expect(container.querySelectorAll('input').length).toBe(expectedCount);
      });
    });
  });
  describe('Conditional Input Set', () => {
    const apScienceBooks = ['stax-apphys', 'stax-apbio'];
    const apHistoryBooks = ['stax-apush'];
    const apAll = apScienceBooks.concat(apHistoryBooks);
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
    const tests: Array<[string, string, string[]]> = [
      ['AP LO', 'AP LO', apAll],
      ['Science Practice', 'Science Practice', apScienceBooks],
      ['Historical Thinking', 'Historical Thinking', apHistoryBooks],
      ['AACN', 'AACN', nursingBooks],
      ['NCLEX', 'NCLEX', nursingBooks],
    ];
    tests.forEach(([name, text, books]) => {
      books.forEach((book) => {
        it(`shows "${name}" when "${book}" is selected`, async () => {
          const { getByText } = await initFormWithMinData({
            formDataOverride: { books: [book] },
          });
          expect(await getByText(text)).toBeTruthy();
        });
      });
    });
  });
  describe('encode/decode form state', () => {
    const formDataEncoded = {
      ...minFormData,
      'module-id': ['m000001', 'm000002', 'm000003#term-03'].map((id) => {
        const splitValue = id.split('#');
        return {
          'module-id': `modules/${splitValue[0]}/index.cnxml`,
          'element-id': splitValue[1] ?? ''
        }
      }),
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
