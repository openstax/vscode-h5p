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
            <h3>
              {title}{' '}
              <span style={{ color: 'red' }}>
                {required ?? false ? '*' : ''}
              </span>
            </h3>
          </div>
        </div>
        <div className="row">{content}</div>
      </div>
    </>
  );
}
