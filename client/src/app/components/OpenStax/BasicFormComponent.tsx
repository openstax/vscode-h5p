export default function BasicFormComponent({
  title,
  content,
  required = false,
}) {
  return (
    <>
      <div className="container">
        <div className="row">
          <div>
            <h3>
              {title}{' '}
              <span style={{ color: 'red' }}>{required ? '*' : ''}</span>
            </h3>
          </div>
        </div>
        <div className="row">{content}</div>
      </div>
    </>
  );
}
