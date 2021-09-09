import { describe, test, expect, jest } from '@jest/globals';
import fs from 'fs';
import FileHelper from '../../src/fileHelper';

describe('#FileHelper test suite', () => {
    describe('#getFileStatus', () => {
        test('it should return files statuses in correct format', async () => {
            const statMock = {
                dev: 851136133,
                mode: 33206,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: 0,
                blksize: 4096,
                ino: 10977524091737354,
                size: 723,
                blocks: 8,
                atimeMs: 1631149197522.618,
                mtimeMs: 1631147757090.1743,
                ctimeMs: 1631147757090.1743,
                birthtimeMs: 1631142552553.6555,
                atime: '2021-09-09T00:59:57.523Z',
                mtime: '2021-09-09T00:35:57.090Z',
                ctime: '2021-09-09T00:35:57.090Z',
                birthtime: '2021-09-08T23:09:12.554Z'
            }

            const mockUser = 'nathaliaspinula';

            process.env.USER = mockUser;

            const filename = 'file.png';

            jest.spyOn(fs.promises, fs.promises.readdir.name).mockResolvedValue([filename]);
            
            jest.spyOn(fs.promises, fs.promises.stat.name).mockResolvedValue(statMock);

            const result = await FileHelper.getFileStatus("/tmp");

            const expectedResult = [{
                size: '723 B',
                lastModified: statMock.birthtime,
                owner: mockUser,
                file: filename
            }];

            expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${filename}`);
            expect(result).toMatchObject(expectedResult);
        });
    });
});