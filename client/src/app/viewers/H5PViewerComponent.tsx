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

  render() {
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
