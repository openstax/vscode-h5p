/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { cleanup, fireEvent, render } from '@testing-library/react';

import SingleInput from '../SingleInput';
import { DropdownOption, SingleInputProps } from '../types';
import { InputSet, InputSetProps } from '../InputSet';
import LO from '../LO';
import React from 'react';
import AACN from '../AACN';
import { act } from 'react-dom/test-utils';
import Context from '../Context';
import APLO from '../APLO';
import { SingleDropdown } from '../SingleDropdown';
import { range } from '../../../../../../common/src/utils';
import ConfirmationDialog from '../ConfirmationDialog';

function testSingleInputValidation(
  factory: (state: SingleInputProps) => React.ReactElement<SingleInputProps>,
  valuesToTest: [value: string, isValid: boolean][],
) {
  let value = '';
  let isValid = true;
  const state: SingleInputProps = {
    value,
    isValid,
    handleInputChange: (v, i) => {
      value = v;
      isValid = i ?? true;
    },
  };

  const { container } = render(factory(state));
  const input = container.querySelector('input');
  expect(input).not.toBeFalsy();
  valuesToTest.forEach(([v, i]) => {
    fireEvent.change(input!, { target: { value: v } });
    expect(value).toBe(v);
    expect(isValid).toBe(i);
  });
}

function testInputSetValidation(
  factory: (state: InputSetProps) => React.ReactElement<InputSetProps>,
  valuesToTest: [value: string, isValid: boolean][][],
) {
  const inputStates = range(valuesToTest[0].length).map(() => ({
    value: '',
    isValid: true,
  }));
  const state: InputSetProps = {
    inputs: inputStates,
    handleInputChange: (idx, value, isValid) => {
      inputStates[idx] = { value, isValid: isValid ?? true };
    },
    handleRemoveInput: () => {},
    handleAddInput: () => {},
  };

  const { container } = render(factory(state));
  const inputs = container.querySelectorAll('input');
  // Test every combination of values sent
  // All inputs should yield the same result for a given input
  for (let i = 0; i < valuesToTest.length; i++) {
    valuesToTest.forEach((valueSet) => {
      // First set all the values
      valueSet.forEach(([value], idx) => {
        fireEvent.change(inputs[idx], { target: { value } });
      });
      // Then check that they all retained the correct value
      valueSet.forEach(([value, isValid], idx) => {
        expect(inputStates[idx].value).toBe(value);
        expect(inputStates[idx].isValid).toBe(isValid);
      });
    });
    valuesToTest.push(valuesToTest.shift()!);
  }
}

function selectOption(container: HTMLElement, idx: number, value: string) {
  const input = [...container.querySelectorAll('input[role="combobox"]')].find(
    (el, i) => el.id.match(/^react-select-\d+-input$/) && i === idx,
  );
  if (input === undefined) {
    throw new Error('Failed to find input for select box');
  }
  act(() => {
    // Type the value then press Enter
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { keyCode: 13 });
  });
}

describe('Inputs', () => {
  afterEach(cleanup);

  describe('SingleInput', () => {
    it('displays the value and styles as expected', () => {
      let value = 'some invalid value';
      const isValid = false;
      const styleInvalid = {
        outline: '123px solid red',
      };
      const style = {
        width: '71%',
      };
      const harness: SingleInputProps = {
        value,
        isValid,
        handleInputChange: (v) => {
          value = v;
        },
      };

      const { container } = render(
        <SingleInput {...harness} style={style} styleInvalid={styleInvalid} />,
      );

      const input = container.querySelector('input');
      Object.entries({ ...style, ...styleInvalid }).forEach(([k, v]) => {
        expect(input?.style[k as any]).toBe(v);
      });
      expect(input?.value).toBe(value);
      fireEvent.change(input!, { target: { value: 'test' } });
      expect(value).toBe('test');
    });
  });

  describe('SingleDropdown', () => {
    it('displays and changes values', () => {
      const mockChange = jest.fn();
      const options: DropdownOption[] = [
        { value: 'a', label: 'a' },
        { value: 'b', label: 'b' },
        { value: 'c', label: 'c' },
      ];

      const props: SingleInputProps = {
        value: '',
        isValid: true,
        handleInputChange: mockChange,
      };

      const { container } = render(
        <SingleDropdown options={options} {...props} />,
      );

      // Should cause a change to be triggered
      selectOption(container, 0, 'b');
      expect(mockChange).toHaveBeenCalledWith('b');
    });
  });

  describe('InputSet', () => {
    it('uses single inputs when no options are given and adds/removes inputs', () => {
      let inputsState = [
        { value: 'a', isValid: true },
        { value: 'b', isValid: true },
        { value: 'c', isValid: true },
      ];
      const state: InputSetProps = {
        inputs: inputsState,
        handleInputChange: () => {},
        handleRemoveInput: (idx) => {
          const inputs = inputsState;
          const newInputs = [...inputs];
          newInputs.splice(idx, 1);
          inputsState = newInputs;
        },
        handleAddInput: () => {
          inputsState.push({
            value: inputsState.length.toString(),
            isValid: true,
          });
        },
      };

      const { container } = render(<InputSet title="Test" {...state} />);

      const inputs = container.querySelectorAll('input');
      inputs.forEach((input, idx) => {
        expect(input.value).toBe(state.inputs[idx].value);
      });
      expect(inputs.length).toBe(3);

      [-1, 1].forEach((inc) => {
        const isAdd = inc > 0;
        const selector = isAdd
          ? '[data-control-type="input-set-add"]'
          : '[data-control-type="input-set-subtract"]';
        const button = container.querySelector(selector)?.firstElementChild;
        const countBefore = inputsState.length;
        const expectedCount = countBefore + inc;
        expect(button).not.toBeFalsy();
        act(() => {
          fireEvent.click(button!, { button: 1 });
        });
        expect(inputsState.length).toBe(expectedCount);
      });
    });
    it('displays select boxes when options are given and supports changes', () => {
      const mockChange = jest.fn();
      const state: InputSetProps = {
        inputs: [
          { value: '', isValid: true },
          { value: '', isValid: true },
          { value: '', isValid: true },
        ],
        handleInputChange: mockChange,
        handleRemoveInput: () => {},
        handleAddInput: () => {},
      };
      const options: DropdownOption[] = [
        { value: 'a', label: 'a' },
        { value: 'b', label: 'b' },
        { value: 'c', label: 'c' },
      ];

      const { container } = render(
        <InputSet title="Test" options={options} {...state} />,
      );

      const inputs = container.querySelectorAll('input[role="combobox"]');
      expect(inputs.length).toBe(3);

      // Type 'a' and hit Enter
      act(() => {
        fireEvent.change(inputs[0]!, { target: { value: 'a' } });
        fireEvent.keyDown(inputs[0]!, { keyCode: 13 });
      });
      // Should cause a change to be triggered
      expect(mockChange).toHaveBeenCalledWith(0, 'a');
    });
  });

  describe('lo', () => {
    it('validates values', () => {
      testInputSetValidation(
        (state) => <LO {...state} />,
        [
          [
            ['00-00-01', true],
            ['invalid', false],
            ['A00-00-02', true],
          ],
          [
            ['invalid', false],
            ['00-00-001', false],
            ['A00-00-02', true],
          ],
        ],
      );
    });
  });

  describe('aplo', () => {
    it('validates values for stax-apbio', () => {
      testInputSetValidation(
        (state) => <APLO {...state} book={'stax-apbio'} />,
        [
          [
            ['ABC-0-A', true],
            ['invalid', false],
            ['DEF-01-B', true],
          ],
          [
            ['invalid', false],
            ['abc.1.a', false],
            ['ABC.0.F', true],
          ],
        ],
      );
    });
    it('validates values for stax-apphys', () => {
      testInputSetValidation(
        (state) => <APLO {...state} book={'stax-apphys'} />,
        [
          [
            ['1-A-23-1', true],
            ['invalid', false],
            ['1-B-1-2', true],
          ],
          [
            ['invalid', false],
            ['1-a-23-1', false],
            ['1.B.1.2', true],
          ],
        ],
      );
    });
    it('validates values for other ap books', () => {
      testInputSetValidation(
        (state) => <APLO {...state} book={'stax-apdoes-not-exist'} />,
        [
          [
            ['ANYTHING-LIKE-THIS', true],
            ['invalid', false],
            ['1-B-1-2', true],
          ],
          [
            ['invalid', false],
            ['1-a-23-1', false],
            ['1.B.1.2', true],
          ],
        ],
      );
    });
  });

  describe('aacn', () => {
    it('validates values', () => {
      testSingleInputValidation(
        (state) => <AACN {...state} />,
        [
          ['20.1m', true],
          [' ', false],
          ['1.1a', true],
          ['10.9z', true],
          ['10.10a', false],
        ],
      );
    });
  });

  describe('context', () => {
    it('validates values', () => {
      testInputSetValidation(
        (state) => <Context {...state} />,
        [
          [
            ['m00123', true],
            ['invalid', false],
            ['m00123#fs-12345', true],
          ],
          [
            ['m00123#', false],
            ['m00123#a', true],
            ['m00123#12-asd', false],
          ],
        ],
      );
    });
  });

  describe('confirmation-dialog', () => {
    const confirmText = 'Yep-mhm';
    const denyText = 'Nope-nuhuh';
    [true, false].forEach((confirm) => {
      const testCase = `${confirm ? 'confirm' : 'deny'} button is clicked`;
      it(`reports the correct result when - ${testCase}`, () => {
        const mockHandleResult = jest.fn();
        const { getByText } = render(
          <ConfirmationDialog
            onResult={mockHandleResult}
            acceptButtonText={confirmText}
            declineButtonText={denyText}
            show={true}
          />,
        );
        const button = getByText(confirm ? confirmText : denyText);
        act(() => fireEvent.click(button));
        expect(mockHandleResult).toBeCalledTimes(1);
        expect(mockHandleResult).toHaveBeenCalledWith(confirm);
      });
    });
  });
});
