import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import UploadHandler from '../../src/uploadHandler';
import TestUtil from '../_util/testUtil';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { logger } from '../../src/logger';

describe('#UploadHandler test suite', () => {
    const io = {
        to: (id) => io,
        emit: (event, message) => { }
    }

    beforeEach(() => {
        jest.spyOn(logger, 'info').mockImplementation();
    });

    describe('#registerEvent', () => {
        test('should call onfile and onfinish functions on Busboy instance', () => {
            const uploadHandler = new UploadHandler({ io, socketId: '01' })

            jest.spyOn(uploadHandler, uploadHandler.onFile.name).mockResolvedValue();

            const headers = {
                'content-type': 'multipart/form-data; boundary=',
            }

            const onFinishMock = jest.fn();

            const busBoyInstance = uploadHandler.registerEvents(headers, onFinishMock);

            const fileStream = TestUtil.generateReadableStream(['chunk', 'of', 'data']);

            busBoyInstance.emit('file', 'fieldname', fileStream, 'filename.txt');

            busBoyInstance.listeners('finish')[0].call();

            expect(uploadHandler.onFile).toHaveBeenCalled();

            expect(onFinishMock).toHaveBeenCalled();
        });
    });

    describe('#onFile', () => {
        test('given a stream file it should save it on disk', async () => {
            const chunks = ['hey', 'dude'];
            const downloadsFolder = '/tmp';
            const handler = new UploadHandler({
                io,
                socketId: '01',
                downloadsFolder
            });

            const onData = jest.fn();

            jest.spyOn(fs, fs.createWriteStream.name)
                .mockImplementation(() => TestUtil.generateWritableStream(onData));

            const onTransform = jest.fn();

            jest.spyOn(handler, handler.handleFileBytes.name).mockImplementation(() => TestUtil.generateTransformStream(onTransform));

            const params = {
                fieldname: 'video',
                file: TestUtil.generateReadableStream(chunks),
                filename: 'mockFile.mov'
            };

            await handler.onFile(...Object.values(params));

            expect(onData.mock.calls.join()).toEqual(chunks.join());

            expect(onTransform.mock.calls.join()).toEqual(chunks.join());

            const expectedFilename = `${handler.downloadsFolder}/${params.filename}`;

            expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFilename);
        });
    });

    describe('#handleFileBytes', () => {
        test('should call emit function and it is a transform stream', async () => {
            jest.spyOn(io, io.to.name);
            jest.spyOn(io, io.emit.name);

            const handler = new UploadHandler({
                io,
                socketId: '01'
            });

            jest.spyOn(handler, handler.canExecute.name).mockReturnValue(true);

            const messages = ['hello'];

            const source = TestUtil.generateReadableStream(messages);

            const onWrite = jest.fn();

            const target = TestUtil.generateWritableStream(onWrite);

            await pipeline(
                source,
                handler.handleFileBytes('filename.txt'),
                target
            );

            expect(io.to).toHaveBeenCalledTimes(messages.length);
            expect(io.emit).toHaveBeenCalledTimes(messages.length);

            expect(onWrite).toHaveBeenCalledTimes(messages.length);
            expect(onWrite.mock.calls.join()).toEqual(messages.join());
        });

        test('given message time delay as 2 secs it should emit only two message during 2 seconds period', async () => {
            jest.spyOn(io, io.emit.name);

            const messageTimeDelay = 2000;

            const day = '2021-09-09 01:01';

            const onFirstLastMessageSent = TestUtil.getTimeFromDate(`${day}:00`);

            const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`);

            const onFirstUpdateLastMessageSent = onFirstCanExecute;

            const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`);

            const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:04`);

            TestUtil.mockDateNow([
                onFirstLastMessageSent,
                onFirstCanExecute,
                onFirstUpdateLastMessageSent,
                onSecondCanExecute,
                onThirdCanExecute
            ])

            const handler = new UploadHandler({
                io,
                socketId: '01',
                messageTimeDelay
            });

            const messages = ['hello', 'hello', 'world'];
            const filename = 'filename.avi';
            const expectedMessageSent = 2;

            const source = TestUtil.generateReadableStream(messages);

            await pipeline(
                source,
                handler.handleFileBytes(filename)
            )

            expect(io.emit).toHaveBeenCalledTimes(expectedMessageSent);

            const [firstCallResult, secondCallResult] = io.emit.mock.calls;

            expect(firstCallResult).toEqual([handler.ON_UPLOAD_EVENT, { processedAlready: "hello".length, filename }]);
            expect(secondCallResult).toEqual([handler.ON_UPLOAD_EVENT, { processedAlready: messages.join("").length, filename }]);
        });
    });

    describe('#canExecute', () => {
        test('should return true when time is later than specified delay', () => {
            const tickNow = TestUtil.getTimeFromDate('2021-09-09 00:00:03');
            const lastExecution = TestUtil.getTimeFromDate('2021-09-09 00:00:00');
            const timeDelay = 1000;

            const uploadHandler = new UploadHandler({ io: {}, socketId: '', messageTimeDelay: timeDelay });

            TestUtil.mockDateNow([tickNow]);

            const result = uploadHandler.canExecute(lastExecution);

            expect(result).toBeTruthy();
        });

        test('should return false when time is not later than specified delay', () => {
            const now = TestUtil.getTimeFromDate('2021-09-09 00:00:02');
            const lastExecution = TestUtil.getTimeFromDate('2021-09-09 00:00:01');
            const timeDelay = 4000;

            const uploadHandler = new UploadHandler({ io: {}, socketId: '', messageTimeDelay: timeDelay });

            TestUtil.mockDateNow([now]);

            const result = uploadHandler.canExecute(lastExecution);

            expect(result).toBeFalsy();
        });
    });
});
