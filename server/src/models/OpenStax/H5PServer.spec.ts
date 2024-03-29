import express from 'express';
import Config from './config';
import OSH5PServer from './H5PServer';
import request from 'supertest';
import * as H5P from '@lumieducation/h5p-server';

jest.mock('../H5PServer');

describe('OSH5PServer', () => {
  const h5pConfig = new H5P.H5PConfig();
  const app = express();
  const mockEditor = {
    config: h5pConfig,
    contentStorage: {
      getOSMeta: jest.fn(),
    },
  };

  it('starts and does stuff', async () => {
    const server: any = new OSH5PServer(jest.fn() as any, jest.fn() as any, '');
    server.handleError.mockImplementation(
      (res: any) => () => res.status(500).end(),
    );
    server.start(mockEditor, app, Config.port);
    let res = await request(app).get('/does-not-exist-404-please');
    expect(res.status).toBe(404);
    expect(mockEditor.contentStorage.getOSMeta).toBeCalledTimes(0);

    // fetch non-existing
    res = await request(app).get(
      `${h5pConfig.baseUrl}/undefined/openstax-metadata/`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual({});
    expect(mockEditor.contentStorage.getOSMeta).toBeCalledTimes(1);

    // fetch error
    mockEditor.contentStorage.getOSMeta = jest
      .fn()
      .mockRejectedValue('Fetch Error');
    res = res = await request(app).get(
      `${h5pConfig.baseUrl}/undefined/openstax-metadata/`,
    );
    expect(res.status).toBe(500);
    expect(mockEditor.contentStorage.getOSMeta).toBeCalledTimes(1);
  });
});
