import {
  faChevronDown,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';

type AccordionChild = {
  title: string;
  content: JSX.Element;
};

type AccordionProps = {
  children: AccordionChild[];
  style?: React.CSSProperties;
  initiallyOpenedIdx?: number;
};

export default function Accordion(props: AccordionProps) {
  const [openIdx, setOpenIdx] = useState(props.initiallyOpenedIdx ?? null);

  const handleSectionClick = (idx) => {
    setOpenIdx(idx === openIdx ? null : idx);
  };

  return (
    <div style={props.style}>
      {props.children.map((kid, idx) => (
        <div className="accordion-section" key={idx}>
          <div
            className="container"
            onClick={() => handleSectionClick(idx)}
            style={{ cursor: 'pointer' }}
          >
            <div
              className="row"
              style={{ padding: '10px', background: 'lightgray' }}
            >
              <div className="col-11" style={{ fontWeight: 'bold' }}>
                {kid.title}
              </div>
              <div className="col-1 text-end">
                <FontAwesomeIcon
                  icon={openIdx === idx ? faChevronDown : faChevronLeft}
                />
              </div>
            </div>
          </div>
          {openIdx === idx && (
            <div
              className="accordion-section-content"
              style={{
                padding: '5px 0',
                background: '#eee',
              }}
            >
              {kid.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
