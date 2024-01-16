export function Label(props: {
  content: string | JSX.Element;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={props.htmlFor} style={{ fontSize: '26px' }}>
      {props.content}
    </label>
  );
}
