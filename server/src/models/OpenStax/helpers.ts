import { assertValue } from '../../../../common/src/utils';

// TODO: Add more interfaces and guards as needed
export interface QuestionSetQuestion {
  library: string;
  params: Partial<unknown>;
}

export interface QuestionSet {
  questions: QuestionSetQuestion[];
}

export interface MultiChoiceAnswer {
  correct: boolean;
  text: string;
  tipsAndFeedback: Partial<unknown>;
}

export interface MultiChoice {
  question: string;
  answers: MultiChoiceAnswer[];
}

export function isQuestionSet(
  content: Partial<unknown>,
): content is QuestionSet {
  const questions = Reflect.get(content, 'questions');
  return (
    Array.isArray(questions) &&
    questions.every(
      (q: Partial<unknown>) =>
        Reflect.has(q, 'library') && Reflect.has(q, 'params'),
    )
  );
}

export function toQuestionSet(content: Partial<unknown>): QuestionSet {
  return assertValue(
    isQuestionSet(content) ? content : undefined,
    'BUG: tried to interpret a non-QuestionSet as a QuestionSet',
  );
}

export function isMultiChoice(
  content: Partial<unknown>,
): content is MultiChoice {
  return (
    'question' in content &&
    'answers' in content &&
    Array.isArray(content['answers']) &&
    content['answers'].every(
      (a) => 'correct' in a && 'text' in a && 'tipsAndFeedback' in a,
    )
  );
}

export function toMultiChoice(content: Partial<unknown>): MultiChoice {
  return assertValue(
    isMultiChoice(content) ? content : undefined,
    'BUG: tried to interpret a non-MultiChoice as a MultiChoice',
  );
}
