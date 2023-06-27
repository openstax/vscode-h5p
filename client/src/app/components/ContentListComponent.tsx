import React from 'react';
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Pagination from 'react-bootstrap/Pagination';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';

// The .js references are necessary for requireJs to work in the browser.
import { IContentService, IContentListEntry } from '../services/ContentService';
import ContentListEntryComponent from './ContentListEntryComponent';
import { chunk, range } from './OpenStax/utils';

export default class ContentList extends React.Component<{
  h5pUrl: string;
  contentService: IContentService;
}> {
  constructor(props: { h5pUrl: string; contentService: IContentService }) {
    super(props);
    this.state = { contentList: [], page: 1 };
    this.contentService = props.contentService;
    this.h5pUrl = props.h5pUrl;
  }

  public state: {
    contentList: IContentListEntry[];
    page: number;
  };

  protected contentService: IContentService;
  protected h5pUrl: string;
  /**
   * Keeps track of newly created content to assign a key
   * @memberof ContentList
   */
  protected newCounter = 0;

  public async componentDidMount(): Promise<void> {
    await this.updateList();
  }

  public render(): React.ReactNode {
    // TODO: Add filtering and pagination
    const resultsPerPage = 50;
    const pages = chunk(this.state.contentList, resultsPerPage);
    return (
      <div>
        <Button variant="primary" onClick={() => this.new()} className="my-2">
          <FontAwesomeIcon icon={faPlusCircle} className="me-2" />
          Create new content
        </Button>
        <ListGroup>
          {(pages[this.state.page - 1] ?? []).map((content) => (
            <ContentListEntryComponent
              h5pUrl={this.h5pUrl}
              contentService={this.contentService}
              data={content}
              key={content.originalNewKey ?? content.contentId}
              onDiscard={() => this.onDiscard(content)}
              onDelete={() => this.onDelete(content)}
              onSaved={(newData) => this.onSaved(content, newData)}
              generateDownloadLink={this.contentService.generateDownloadLink}
            ></ContentListEntryComponent>
          ))}
        </ListGroup>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '10px',
          }}
        >
          <Pagination>
            <Pagination.First
              onClick={() => {
                this.setState({ page: 1 });
              }}
            />
            <Pagination.Prev
              onClick={() => {
                if (this.state.page > 1)
                  this.setState({ page: this.state.page - 1 });
              }}
            />
            {[...range(1, pages.length + 1)].map((pageNumber) => (
              <Pagination.Item
                key={pageNumber}
                active={pageNumber === this.state.page}
                onClick={() => {
                  this.setState({ page: pageNumber });
                }}
              >
                {pageNumber}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => {
                if (this.state.page < pages.length)
                  this.setState({ page: this.state.page + 1 });
              }}
            />
            <Pagination.Last
              onClick={() => {
                this.setState({ page: pages.length });
              }}
            />
          </Pagination>
        </div>
      </div>
    );
  }

  protected async updateList(): Promise<void> {
    const contentList = await this.contentService.list();
    this.setState({ contentList });
  }

  protected new() {
    this.setState({
      contentList: [
        {
          contentId: 'new',
          mainLibrary: undefined,
          title: 'New H5P',
          originalNewKey: `new-${this.newCounter++}`,
        },
        ...this.state.contentList,
      ],
    });
  }

  protected onDiscard(content) {
    this.setState({
      contentList: this.state.contentList.filter((c) => c !== content),
    });
  }

  protected async onDelete(content: IContentListEntry) {
    if (!content.contentId) {
      return;
    }
    try {
      await this.contentService.delete(content.contentId);
      this.setState({
        contentList: this.state.contentList.filter((c) => c !== content),
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }

  protected async onSaved(
    oldData: IContentListEntry,
    newData: IContentListEntry
  ) {
    this.setState({
      contentList: this.state.contentList.map((c) =>
        c === oldData ? newData : c
      ),
    });
  }
}
