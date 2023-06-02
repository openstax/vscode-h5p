export default function FormComponent({ title, content }) {
  return (
    <>
      <div className="container">
        <div className="row">
          <div>
            <h3>{title}</h3>
          </div>
        </div>
        <div className="row">{content}</div>
      </div>
    </>
  );
}
