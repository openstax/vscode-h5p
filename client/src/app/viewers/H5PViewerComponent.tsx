import React from 'react';
import Container from 'react-bootstrap/Container';
import Alert from 'react-bootstrap/Alert';

import ContentListComponent from '../components/ContentListComponent';
import { ContentService } from '../services/ContentService';

import './H5PViewerComponent.css';
import { Col, Row } from 'react-bootstrap';

export default class H5PViewerComponent extends React.Component<{
  h5pUrl: string;
}> {
  constructor(props: { h5pUrl: string }) {
    super(props);
    this.h5pUrl = props.h5pUrl;
    this.contentService = new ContentService(`${this.h5pUrl}/h5p`);
  }

  private contentService: ContentService;
  private h5pUrl: string;

  private createViewportUpdateEvent(elem: Element, viewport: VisualViewport) {
    return new CustomEvent('viewportUpdate', {
      detail: {
        parentViewport: viewport,
        boundingClientRect: elem.getBoundingClientRect(),
      },
    });
  }

  private notifyIframes() {
    const viewport = window.visualViewport;
    if (viewport != null) {
      // Forward viewport events (scroll/resize) to all iframes
      // These iframes contain the h5p editor instances
      Array.from(document.querySelectorAll('iframe')).forEach((frame) => {
        frame.contentDocument?.dispatchEvent(
          this.createViewportUpdateEvent(frame, viewport),
        );
      });
    }
  }

  private installViewportUpdateEvent() {
    const notifyIframes = this.notifyIframes.bind(this);
    addEventListener('scroll', notifyIframes);
    addEventListener('resize', notifyIframes);
  }

  public override componentDidMount() {
    this.installViewportUpdateEvent();
  }

  override render() {
    return (
      <div className="App">
        <Container>
          <Row>
            <Col>
              <h1>H5P Vscode Extension</h1>
            </Col>
          </Row>
          <Alert variant="warning">
            This page allows you to view,create,edit and delete H5P content
            inside VSCode.
          </Alert>
          <ContentListComponent
            h5pUrl={this.h5pUrl}
            contentService={this.contentService}
          ></ContentListComponent>
        </Container>
      </div>
    );
  }
}
