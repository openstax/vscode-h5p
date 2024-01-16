import { Label } from './Label';

export default function BasicFormComponent({
  title,
  content,
  required = false,
}: {
  title: string;
  content: JSX.Element;
  required?: boolean;
}): JSX.Element {
  return (
    <>
      <div className="container">
        <div className="row">
          <div>
            <Label
              content={
                <>
                  {title}{' '}
                  <span style={{ color: 'red' }}>
                    {required ?? false ? '*' : ''}
                  </span>
                </>
              }
            />
          </div>
        </div>
        <div className="row">{content}</div>
      </div>
    </>
  );
}
