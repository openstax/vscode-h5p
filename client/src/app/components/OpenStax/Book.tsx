import { InputSet, InputSetProps } from './InputSet';

export const BOOKS = {
  'stax-amfg': 'Additive Manufacturing',
  'stax-usgovt': 'American Government',
  'stax-anp': 'Anatomy and Physiology',
  'stax-anth': 'Anthropology',
  'stax-bio': 'Biology',
  'stax-apbio': 'Biology for AP® Courses',
  'stax-bca': 'Business Computer Applications',
  'stax-phys': 'College Physics',
  'stax-apphys': 'College Physics for AP® Courses',
  'stax-pyth': 'Computer Programming with Python',
  'stax-cs': 'Computer Science',
  'stax-cbio': 'Concepts of Biology',
  'stax-cmath': 'Contemporary Math',
  'stax-devpsy': 'Developmental Psychology',
  'stax-econ': 'Economics',
  'stax-engcomp': 'English Composition',
  'stax-eship': 'Entrepreneurship',
  'stax-fin': 'Finance',
  'stax-k12phys': 'HS Physics',
  'stax-infosys': 'Information Systems',
  'stax-macro': 'Macro Economics',
  'stax-micro': 'Micro Economics',
  'stax-orgchem': 'Organic Chemistry',
  'stax-phi': 'Philosophy',
  'stax-polisci': 'Political Science',
  'stax-mktg': 'Principles of Marketing',
  'stax-psy': 'Psychology',
  'stax-soc': 'Sociology',
  'stax-ushist': 'U.S. History',
  'stax-apush': 'U.S. History for AP® Courses',
  'stax-worldhist': 'World History',
};

export function Book(props: InputSetProps) {
  props.options = Object.entries(BOOKS).map(([k, v]) => ({
    label: v,
    value: k,
  }));
  return <InputSet title={'Books'} {...props} />;
}
