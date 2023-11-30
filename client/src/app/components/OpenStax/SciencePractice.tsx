import BasicFormComponent from './BasicFormComponent';
import { SingleDropdown } from './SingleDropdown';
import { DropdownOption, SingleInputProps } from './types';

const apPhysics = [
  { value: 'modeling', label: 'Modeling' },
  { value: 'mathematical-routines', label: 'Mathematical Routines' },
  { value: 'scientific-reasoning', label: 'Scientific Reasoning' },
  { value: 'experimental-methods', label: 'Experimental Methods' },
  { value: 'data-analysis', label: 'Data Analysis' },
  { value: 'making-connections', label: 'Making Connections' },
];

const apBio = [
  { value: 'concept-explanation', label: 'Concept Explanation' },
  { value: 'visual-representations', label: 'Visual Representations' },
  { value: 'questions-methods', label: 'Questions and Methods' },
  {
    value: 'representing-describing-data',
    label: 'Representing and Describing Data',
  },
  {
    value: 'statistical-tests-data-analysis',
    label: 'Statistical Tests and Data Analysis',
  },
];

export default function SciencePractice(
  props: SingleInputProps & { book: string },
) {
  const options: DropdownOption[] = [
    { value: 'argumentation', label: 'Argumentation' },
  ];
  if (props.book === 'stax-apphys') {
    options.push(...apPhysics);
  }
  if (props.book === 'stax-apbio') {
    options.push(...apBio);
  }
  return (
    <BasicFormComponent
      {...props}
      title={'Science Practice'}
      content={<SingleDropdown options={options} {...props} />}
    />
  );
}
