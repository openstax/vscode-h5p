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

  const initForm = async (formData) => {
    const formProps = {
      ...defaultFormProps,
      contentService: {
        ...defaultMockContentService,
        getOSMeta: jest.fn().mockResolvedValue(formData),
      },
    };
    const controller = await createForm(formProps);
    await revealForm(controller);
    return controller;
  };

  const initFormWithMinData = async (formPropsOverride) => {
    return await initForm({ ...minFormData, ...formPropsOverride });
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
    it('does not save when information is missing', async () => {
      const formProps = { ...defaultFormProps };
      const { openstaxForm } = await createForm(formProps);
      expect(openstaxForm.current).toBeTruthy();
      await openstaxForm.current!.save('new');
      expect(formProps.onSaveError).toBeCalledTimes(1);
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
  describe('Conditional Input Set', () => {
    const apScienceBooks = ['stax-apphys', 'stax-apbio'];
    const apHistoryBooks = ['stax-apush'];
    const apAll = apScienceBooks.concat(apHistoryBooks);
    const tests: Array<[string, string, string[]]> = [
      ['AP LO', 'AP LO', apAll],
      ['Science Practice', 'Science Practice', apScienceBooks],
      ['Historical Thinking', 'Historical Thinking', apHistoryBooks],
    ];
    tests.forEach(([name, text, books]) => {
      books.forEach((book) => {
        it(`shows "${name}" when "${book}" is selected`, async () => {
          const { getByText } = await initFormWithMinData({ books: [book] });
          expect(await getByText(text)).toBeTruthy();
        });
      });
    });
  });
  describe('encode/decode form state', () => {
    const formDataEncoded = {
      ...minFormData,
      moduleId: ['m000001', 'm000002'].map((id) => `modules/${id}/index.cnxml`),
    };
    it('decodes form state when loading and encodes when saving', async () => {
      const contentService = {
        ...defaultMockContentService,
      };
      const controller = await initFormWithMinData({
        ...formDataEncoded,
        contentService,
      });
      const { openstaxForm } = controller;
      await openstaxForm.current!.save();
      expect(
        openstaxForm.current!.decodeValues(formDataEncoded)
      ).toMatchSnapshot();
      expect(
        (contentService.saveOSMeta as jest.Mock).mock.calls
      ).toMatchSnapshot();
    });
  });
});
