import { cleanup, fireEvent, render } from '@testing-library/react';

import SingleInput from '../SingleInput';
import { DropdownOption, SingleInputProps } from '../types';
import { InputSet, InputSetProps } from '../InputSet';
import LO from '../LO';
import Nickname from '../Nickname';
import React from 'react';
import { collect, range } from '../utils';
import AACN from '../AACN';
import { act } from 'react-dom/test-utils';

function testSingleInputValidation(
  factory: (state: SingleInputProps) => React.ReactElement<SingleInputProps>,
  valuesToTest: [string, boolean][]
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
  expect(input).not.toBe(null);
  valuesToTest.forEach(([v, i]) => {
    fireEvent.change(input!, { target: { value: v } });
    expect(value).toBe(v);
    expect(isValid).toBe(i);
  });
}

function testInputSetValidation(
  factory: (state: InputSetProps) => React.ReactElement<InputSetProps>,
  valuesToTest: [string, boolean][][]
) {
  const inputStates = collect(range(valuesToTest[0].length)).map((_) => ({
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
      valueSet.forEach(([value, _], idx) => {
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

describe('Inputs', () => {
  afterEach(cleanup);

  describe('SingleInput', () => {
    it('displays the value and styles expected', () => {
      let value = 'some invalid value';
      let input;
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
        handleInputChange: (v, _) => {
          value = v;
        },
      };

      const { container } = render(
        <SingleInput {...harness} style={style} styleInvalid={styleInvalid} />
      );

      input = container.querySelector('input');
      Object.entries({ ...style, ...styleInvalid }).forEach(([k, v]) => {
        expect(input?.style[k]).toBe(v);
      });
      expect(input?.value).toBe(value);
      fireEvent.change(input!, { target: { value: 'test' } });
      expect(value).toBe('test');
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
        expect(button).not.toBe(null);
        act(() => {
          fireEvent.click(button!, { button: 1 });
        });
        expect(inputsState.length).toBe(expectedCount);
      });
    });
    it('displays a list of select boxes when options are given', () => {
      const state: InputSetProps = {
        inputs: [
          { value: '', isValid: true },
          { value: '', isValid: true },
          { value: '', isValid: true },
        ],
        handleInputChange: () => {},
        handleRemoveInput: () => {},
        handleAddInput: () => {},
      };
      const options: DropdownOption[] = [
        { value: 'a', label: 'a' },
        { value: 'b', label: 'b' },
        { value: 'c', label: 'c' },
      ];

      const { container, baseElement } = render(
        <InputSet title="Test" options={options} {...state} />
      );

      const inputs = Array.from(container.querySelectorAll('*')).filter((el) =>
        el.id.match(/react-select-\d+?-live-region/)
      );
      expect(inputs.length).toBe(3);
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
        ]
      );
    });
  });

  describe('nickname', () => {
    it('validates values', () => {
      testSingleInputValidation(
        (state) => <Nickname {...state} />,
        [
          ['Anything', true],
          [' ', false],
          ['Anything_else', true],
        ]
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
        ]
      );
    });
  });
});
