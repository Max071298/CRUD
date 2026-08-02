import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { S3Service } from './s3.service';
import { S3Lib } from './constants/do-spaces-service-lib.constant';
import { RemoveException } from './exceptions/remove.exception';
import { UploadException } from './exceptions/upload.exception';

describe('S3Service', () => {
  let service: S3Service;

  const s3Mock = {
    putObject: jest.fn(),
    deleteObject: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: S3Lib,
          useValue: s3Mock,
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    const file = {
      buffer: Buffer.from('file content'),
      mimetype: 'image/png',
      originalname: 'avatar.png',
    } as Express.Multer.File;

    const dto = {
      folder: 'user-id',
      name: 'avatar.png',
      file,
    };

    it('uploads a file and returns its path', async () => {
      s3Mock.putObject.mockImplementation(
        (_params: unknown, callback: (error?: Error) => void) => {
          callback(undefined);
        },
      );

      await expect(service.uploadFile(dto)).resolves.toEqual({
        path: 'user-id/avatar.png',
      });

      expect(s3Mock.putObject).toHaveBeenCalledTimes(1);
      expect(s3Mock.putObject).toHaveBeenCalledWith(
        {
          Bucket: 'my-bucket',
          Key: 'user-id/avatar.png',
          Body: file.buffer,
          ACL: 'public-read',
          ContentType: 'image/png',
        },
        expect.any(Function),
      );
    });

    it('throws UploadException when S3 returns an error', async () => {
      const s3Error = new Error('Upload failed');

      s3Mock.putObject.mockImplementation(
        (_params: unknown, callback: (error?: Error) => void) => {
          callback(s3Error);
        },
      );

      await expect(service.uploadFile(dto)).rejects.toBeInstanceOf(
        UploadException,
      );

      await expect(service.uploadFile(dto)).rejects.toThrow(s3Error.message);
    });

    it('does not mutate the file buffer', async () => {
      const originalBuffer = Buffer.from(file.buffer);

      s3Mock.putObject.mockImplementation(
        (_params: unknown, callback: (error?: Error) => void) => {
          callback(undefined);
        },
      );

      await service.uploadFile(dto);

      expect(file.buffer).toEqual(originalBuffer);
    });
  });

  describe('removeFile', () => {
    const dto = {
      path: 'user-id/avatar.png',
    };

    it('removes a file successfully', async () => {
      s3Mock.deleteObject.mockImplementation(
        (_params: unknown, callback: (error?: Error) => void) => {
          callback(undefined);
        },
      );

      await expect(service.removeFile(dto)).resolves.toBeUndefined();

      expect(s3Mock.deleteObject).toHaveBeenCalledTimes(1);
      expect(s3Mock.deleteObject).toHaveBeenCalledWith(
        {
          Bucket: 'my-bucket',
          Key: 'user-id/avatar.png',
        },
        expect.any(Function),
      );
    });

    it('throws RemoveException when S3 returns an error', async () => {
      const s3Error = new Error('Remove failed');

      s3Mock.deleteObject.mockImplementation(
        (_params: unknown, callback: (error?: Error) => void) => {
          callback(s3Error);
        },
      );

      await expect(service.removeFile(dto)).rejects.toBeInstanceOf(
        RemoveException,
      );

      await expect(service.removeFile(dto)).rejects.toThrow(s3Error.message);
    });
  });
});
