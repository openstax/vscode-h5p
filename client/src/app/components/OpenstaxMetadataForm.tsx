import { ReactNode, useState } from 'react';
import H5PEditorUI from './H5PEditorUI';
import { IContentMetadata } from '@lumieducation/h5p-server';
import axios from 'axios';

function MyElement({ onUpdate }) {
  return (
    <div>
      Enter something:
      <br />
      <input type="text" onChange={(e) => onUpdate('filter', e.target.value)} />
    </div>
  );
}

export class OpenstaxH5PEditorUI extends H5PEditorUI {
  private metadata: any = {};

  public render(): ReactNode {
    // gets the request to save
    // adds our information
    // forwards request to our own endpoint
    axios.interceptors.request.use(
      (config) => {
        console.log(config, this.metadata);
        // Do something before request is sent
        return config;
      },
      function (error) {
        // Do something with request error
        return Promise.reject(error);
      }
    );

    return (
      <>
        {super.render()}
        <MyElement
          onUpdate={(property, value) => {
            this.metadata[property] = value;
          }}
        />
      </>
    );
  }

  public async save(): Promise<
    { contentId: string; metadata: IContentMetadata } | undefined
  > {
    const result = await super.save();
    if (result !== undefined) {
      console.log(result.contentId);
    }
    return result;
  }
}
