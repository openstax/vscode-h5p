import { useState } from 'react';
import BasicFormComponent from './BasicFormComponent';
import { SingleInputProps } from './types';

export default function CollaboratorSolution(
  props: SingleInputProps & { title: string },
) {
  const [isPreview, setIsPreview] = useState(false);
  return (
    <BasicFormComponent
      {...props}
      content={
        <div className="col-12" style={{ position: 'relative' }}>
          {isPreview ? (
            <div dangerouslySetInnerHTML={{ __html: props.value }}></div>
          ) : (
            <textarea
              data-control-type="textarea"
              rows={3}
              value={props.value}
              onChange={(e) => props.handleInputChange(e.target.value)}
              style={{ width: '100%' }}
            />
          )}
          <button
            data-control-type="preview-button"
            style={{
              position: 'absolute',
              bottom: '15px',
              right: '30px',
              width: '75px',
              fontSize: '12pt',
              fontFamily: 'arial',
            }}
            onClick={() => setIsPreview(!isPreview)}
          >
            Preview
          </button>
        </div>
      }
    />
  );
}
