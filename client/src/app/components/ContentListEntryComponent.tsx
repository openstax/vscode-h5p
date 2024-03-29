import React from 'react';
import ListGroupItem from 'react-bootstrap/ListGroupItem';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Overlay from 'react-bootstrap/Overlay';
import Tooltip from 'react-bootstrap/Tooltip';
import Dropdown from 'react-bootstrap/Dropdown';
import Modal from 'react-bootstrap/Modal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFingerprint,
  faBookOpen,
  faWindowClose,
  faSave,
  faCheck,
  faPlay,
  faPencilAlt,
  faFileDownload,
  faTrashAlt,
  faCopyright,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';

import H5PPlayerUI from './H5PPlayerUI';
import H5PEditorUI from './H5PEditorUI';

import { IContentListEntry, IContentService } from '../services/ContentService';
import './ContentListEntryComponent.css';
import OpenstaxMetadataForm from './OpenStax/OpenstaxMetadataForm';
import ConfirmationDialog from './OpenStax/ConfirmationDialog';

export default class ContentListEntryComponent extends React.Component<{
  h5pUrl: string;
  contentService: IContentService;
  data: IContentListEntry;
  onDelete: (content: IContentListEntry) => void;
  onDiscard: (content: IContentListEntry) => void;
  onSaved: (data: IContentListEntry) => void;
  generateDownloadLink: (contentId: string) => string;
}> {
  h5pUrl: string;
  constructor(props: {
    h5pUrl: string;
    contentService: IContentService;
    data: IContentListEntry;
    onDiscard: (content: IContentListEntry) => void;
    onDelete: (content: IContentListEntry) => void;
    onSaved: (data: IContentListEntry) => void;
    generateDownloadLink: (contentId: string) => string;
  }) {
    super(props);
    this.state = {
      editing: props.data.contentId === 'new',
      playing: false,
      saving: false,
      saved: false,
      loading: true,
      saveErrorMessage: '',
      saveError: false,
      showingCustomCopyright: false,
      showingDeleteConfirmation: false,
    };
    this.h5pEditor = React.createRef();
    this.saveButton = React.createRef();
    this.h5pPlayer = React.createRef();
    this.openstaxForm = React.createRef();
    this.h5pUrl = props.h5pUrl;
  }

  public override state: {
    editing: boolean;
    loading: boolean;
    playing: boolean;
    saved: boolean;
    saving: boolean;
    saveError: boolean;
    saveErrorMessage: string;
    showingCustomCopyright: boolean;
    showingDeleteConfirmation: boolean;
  };

  private h5pPlayer: React.RefObject<H5PPlayerUI>;
  private h5pEditor: React.RefObject<H5PEditorUI>;
  private saveButton: React.RefObject<HTMLButtonElement>;
  private openstaxForm: React.RefObject<OpenstaxMetadataForm>;

  public override render(): React.ReactNode {
    return (
      <ListGroupItem
        key={this.props.data.originalNewKey ?? this.props.data.contentId}
      >
        <Container>
          <Row>
            <Col className="p-2">
              <h5>{this.props.data.title}</h5>
              <Row className="small">
                <Col className="me-2" lg="auto">
                  <FontAwesomeIcon icon={faBookOpen} className="me-1" />
                  {this.props.data.mainLibrary}
                </Col>
                <Col className="me-2" lg="auto">
                  <FontAwesomeIcon icon={faFingerprint} className="me-1" />
                  {this.props.data.contentId}
                </Col>
              </Row>
            </Col>
            {this.state.playing ? (
              <Col className="p-2" lg="auto">
                <Button variant="light" onClick={() => this.close()}>
                  <FontAwesomeIcon icon={faWindowClose} className="me-2" />
                  close player
                </Button>
              </Col>
            ) : undefined}
            {this.state.playing &&
            this.h5pPlayer.current?.hasCopyrightInformation() === true ? (
              <Col className="p-2" lg="auto">
                <Dropdown>
                  <Dropdown.Toggle variant="light">
                    <span>
                      <FontAwesomeIcon icon={faCopyright} className="me-2" />
                      Copyright
                    </span>
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      onClick={() => {
                        this.showCopyrightCustom();
                      }}
                    >
                      Show in custom dialog
                    </Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => {
                        this.showCopyrightNative();
                      }}
                    >
                      Show in native H5P dialog
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
            ) : undefined}
            {this.state.editing ? (
              <Col className="p-2" lg="auto">
                <Overlay
                  target={this.saveButton.current}
                  show={this.state.saveError}
                  placement="right"
                >
                  <Tooltip id="error-tooltip">
                    {this.state.saveErrorMessage}
                  </Tooltip>
                </Overlay>
                <Button
                  ref={this.saveButton}
                  variant={this.state.saveError ? 'danger' : 'primary'}
                  className={
                    this.state.saving || this.state.loading ? 'disabled' : ''
                  }
                  disabled={this.state.saving || this.state.loading}
                  onClick={() => this.save()}
                >
                  {this.state.saving ? (
                    <div
                      className="spinner-border spinner-border-sm m-1 align-middle"
                      role="status"
                    ></div>
                  ) : (
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                  )}{' '}
                  save{' '}
                  {this.state.saved ? (
                    <FontAwesomeIcon icon={faCheck} className="me-2" />
                  ) : undefined}
                  {this.state.saveError ? (
                    <FontAwesomeIcon
                      icon={faExclamationTriangle}
                      className="me-2"
                    />
                  ) : undefined}
                </Button>
              </Col>
            ) : undefined}
            {this.state.editing && !this.isNew() ? (
              <Col className="p-2" lg="auto">
                <Button variant="light" onClick={() => this.close()}>
                  <FontAwesomeIcon icon={faWindowClose} className="me-2" />
                  close editor
                </Button>
              </Col>
            ) : undefined}
            {this.state.editing && this.isNew() ? (
              <Col className="p-2" lg="auto">
                <Button
                  variant="light"
                  onClick={() => this.props.onDiscard(this.props.data)}
                >
                  <FontAwesomeIcon icon={faWindowClose} className="me-2" />
                  discard
                </Button>
              </Col>
            ) : undefined}
            {!this.isNew() ? (
              <React.Fragment>
                <Col className="p-2" lg="auto">
                  <Button variant="success" onClick={() => this.play()}>
                    <FontAwesomeIcon icon={faPlay} className="me-2" />
                    play
                  </Button>
                </Col>
                <Col className="p-2" lg="auto">
                  <Button variant="secondary" onClick={() => this.edit()}>
                    <FontAwesomeIcon icon={faPencilAlt} className="me-2" />
                    edit
                  </Button>
                </Col>{' '}
                <Col className="p-2" lg="auto">
                  <a
                    href={this.props.generateDownloadLink(
                      this.props.data.contentId,
                    )}
                  >
                    <Button variant="info">
                      <FontAwesomeIcon icon={faFileDownload} className="me-2" />
                      download
                    </Button>
                  </a>
                </Col>
                <Col className="p-2" lg="auto">
                  <Button
                    variant="danger"
                    onClick={() => this.showDeleteConfirmation()}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} className="me-2" />
                    delete
                  </Button>
                </Col>
              </React.Fragment>
            ) : undefined}
          </Row>
        </Container>
        {this.state.editing ? (
          <div
            className={
              this.props.data.contentId !== 'new' && this.state.loading
                ? 'loading'
                : ''
            }
          >
            <OpenstaxMetadataForm
              ref={this.openstaxForm}
              contentService={this.props.contentService}
              contentId={this.props.data.contentId}
              onSaveError={this.onSaveError}
            />
            <H5PEditorUI
              ref={this.h5pEditor}
              h5pUrl={this.h5pUrl}
              contentId={this.props.data.contentId}
              loadContentCallback={this.props.contentService.getEdit}
              saveContentCallback={async (contentId, requestBody) => {
                requestBody.params.params.osMeta =
                  this.openstaxForm.current?.encodedValues;
                return await this.props.contentService.save(
                  contentId,
                  requestBody,
                );
              }}
              onSaved={this.onSaved}
              onLoaded={this.onEditorLoaded}
              onSaveError={this.onSaveError}
            />
          </div>
        ) : undefined}
        {this.state.playing ? (
          <div className={this.state.loading ? 'loading' : ''}>
            <H5PPlayerUI
              ref={this.h5pPlayer}
              h5pUrl={this.h5pUrl}
              contentId={this.props.data.contentId}
              loadContentCallback={this.props.contentService.getPlay}
              onInitialized={this.onPlayerInitialized}
              onxAPIStatement={(statement: any, context: any, event) =>
                console.log(statement, context, event)
              }
            />
            <div
              style={{
                visibility: this.state.loading ? 'visible' : 'collapse',
              }}
              className="spinner-border spinner-border-sm m-2"
              role="status"
            ></div>
          </div>
        ) : undefined}
        <Modal show={this.state.showingCustomCopyright}>
          <Modal.Header>
            <Modal.Title>Copyright information</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div
              dangerouslySetInnerHTML={{
                __html:
                  this.h5pPlayer.current?.getCopyrightHtml() ??
                  'No copyright information',
              }}
            ></div>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="primary"
              onClick={() => {
                this.closeCopyrightCustom();
              }}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
        <ConfirmationDialog
          show={this.state.showingDeleteConfirmation}
          heading="Delete exercise?"
          text={`Are you sure you want to delete ${this.props.data.contentId}?`}
          onResult={(yes) => this.handleConfirmDelete(yes)}
        ></ConfirmationDialog>
      </ListGroupItem>
    );
  }

  protected play() {
    this.setState({ editing: false, playing: true });
  }

  protected edit() {
    this.setState({ editing: true, playing: false });
  }

  protected close() {
    this.setState({ editing: false, playing: false });
  }

  protected showCopyrightCustom() {
    this.setState({ showingCustomCopyright: true });
  }

  protected closeCopyrightCustom() {
    this.setState({ showingCustomCopyright: false });
  }

  protected showDeleteConfirmation() {
    this.setState({ showingDeleteConfirmation: true });
  }

  protected handleConfirmDelete(yes: boolean) {
    try {
      if (yes) {
        this.props.onDelete(this.props.data);
      }
    } finally {
      this.setState({ showingDeleteConfirmation: false });
    }
  }

  protected showCopyrightNative() {
    this.h5pPlayer.current?.showCopyright();
  }

  private onPlayerInitialized = () => {
    this.setState({ loading: false });
  };

  protected async save() {
    if (this.openstaxForm.current?.isInputValid !== true) return;
    this.setState({ saving: true });
    try {
      const returnData = await this.h5pEditor.current?.save();
      if (returnData) {
        await this.props.onSaved({
          h5PUrl: this.h5pUrl,
          contentId: returnData.contentId,
          mainLibrary: returnData.metadata.mainLibrary,
          title: returnData.metadata.title,
          originalNewKey: this.props.data.originalNewKey,
        });
      }
    } catch (error) {
      // We ignore the error, as we subscribe to the 'save-error' and
      // 'validation-error' events.
    }
  }

  protected onSaveError = async (saveErrorMessage: any) => {
    this.setState({
      saving: false,
      saved: false,
      saveError: true,
      saveErrorMessage,
    });
    setTimeout(() => {
      this.setState({
        saveError: false,
      });
    }, 5000);
  };

  protected onSaved = async () => {
    this.setState({
      saving: false,
      saved: true,
    });
    setTimeout(() => {
      this.setState({ saved: false });
    }, 3000);
  };

  protected onEditorLoaded = () => {
    this.setState({ loading: false });
  };

  private isNew() {
    return this.props.data.contentId === 'new';
  }
}
