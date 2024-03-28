import { assertValue } from '../../../../common/src/utils';

// TODO: Add more interfaces and guards as needed
export interface QuestionSetQuestion {
  library: string;
  params: Partial<unknown>;
}

export interface QuestionSet {
  questions: QuestionSetQuestion[];
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
