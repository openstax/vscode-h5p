import BasicFormComponent from './BasicFormComponent';
import { SingleInputProps } from './types';

export default function CollaboratorSolution(
  props: SingleInputProps & { title: string },
) {
  // TODO: Maybe add support for previewing HTML/Math
  // const [isPreview, setIsPreview] = useState(false);
  return (
    <BasicFormComponent
      {...props}
      content={
        <div className="col-12">
          <textarea
            rows={3}
            value={props.value}
            onChange={(e) => props.handleInputChange(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      }
    />
  );
}
