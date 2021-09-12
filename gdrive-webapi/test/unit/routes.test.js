import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import Routes from '../../src/routes';
import UploadHandler from '../../src/uploadHandler';
import TestUtil from '../_util/testUtil';
import { logger } from '../../src/logger.js';

describe('#Routes test suite', () => {
    const request = TestUtil.generateReadableStream(['some file bytes']);
    const response = TestUtil.generateWritableStream(() => {});

    const defaultParams = {
        request: Object.assign(request, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            method: '',
            body: {}
        }),
        response: Object.assign(response,{
            setHeader: jest.fn(),
            writeHead: jest.fn(),
            end: jest.fn(),
        }),
        values: () => Object.values(defaultParams)
    }

    beforeEach(() => {
        jest.spyOn(logger, 'info').mockImplementation();
    });

    test('setSocket should store io instance', () => {
        const routes = new Routes();

        const ioObj = {
            to: (id) => ioObj,
            emit: (event, message) => { }
        }

        routes.setSocketInstance(ioObj);

        expect(routes.io).toStrictEqual(ioObj)
    });

    describe('#handler', () => {

        test('given an inexistent route, it should choose default route', () => {
            const routes = new Routes();
            const params = {
                ...defaultParams,
            }

            params.request.method = 'inexistent';

            routes.handler(...params.values());

            expect(params.response.end).toHaveBeenCalledWith('Route not found');
        });

        test('it should set any requeste with CORS enabled', () => {
            const routes = new Routes();
            const params = {
                ...defaultParams,
            }

            params.request.method = 'inexistent';

            routes.handler(...params.values());

            expect(params.response.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        });

        test('given method OPTIONS it should choose options route', async () => {
            const routes = new Routes();
            const params = {
                ...defaultParams,
            }

            params.request.method = 'OPTIONS';

            await routes.handler(...params.values());

            expect(params.response.writeHead).toHaveBeenCalledWith(204);
            expect(params.response.end).toHaveBeenCalled();
        });

        test('given method POST it should choose post route', async () => {
            const routes = new Routes();
            const params = {
                ...defaultParams,
            }

            params.request.method = 'POST';

            jest.spyOn(routes, routes.post.name).mockResolvedValue();

            await routes.handler(...params.values());

            expect(routes.post).toHaveBeenCalled();
        });

        test('given method GET it should choose get route', async () => {
            const routes = new Routes();
            const params = {
                ...defaultParams,
            }

            params.request.method = 'GET';

            jest.spyOn(routes, routes.get.name).mockResolvedValue();

            await routes.handler(...params.values());

            expect(routes.get).toHaveBeenCalled();
        });
    });

    describe('#get', () => {
        test('given method GET it should list all files downloaded', async () => {
            const routes = new Routes();

            const params = {
                ...defaultParams,
            }

            const fileStatusesMock = [{
                size: '723 B',
                lastModified: '2021-09-08T23:09:12.554Z',
                owner: 'nathaliaspinula',
                file: 'file.png'
            }];

            jest.spyOn(routes.fileHelper, routes.fileHelper.getFileStatus.name).mockResolvedValue(fileStatusesMock);

            params.request.method = 'GET';

            await routes.handler(...params.values());

            expect(params.response.writeHead).toHaveBeenCalledWith(200);
            expect(params.response.end).toHaveBeenCalledWith(JSON.stringify(fileStatusesMock));
        });
    });

    describe('#post', () => {
        test('it should validate post route workflow', async () => {
            const routes = new Routes('/tmp');

            const options = {
                ...defaultParams,
            }

            options.request.method = 'POST';
            options.request.url = '?socketId=10';

            jest.spyOn(UploadHandler.prototype, UploadHandler.prototype.registerEvents.name)
                .mockImplementation((headers, onFinish) => {
                    const writable = TestUtil.generateWritableStream(() => {});
                    
                    writable.on("finish", onFinish);

                    return writable;
                });

            await routes.handler(...options.values());
            
            expect(UploadHandler.prototype.registerEvents).toHaveBeenCalled();
            expect(options.response.writeHead).toHaveBeenCalledWith(200);

            const expectedResult = JSON.stringify({ result: 'Files uploaded with success! ' });
            
            expect(options.response.end).toHaveBeenCalledWith(expectedResult);
        });
    });
})
