/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TextbookFileService } from './textbook-file.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

jest.mock('fs');

describe('TextbookFileService', () => {
  let service: TextbookFileService;
  const mockUploadDir = '/test/iksm';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextbookFileService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(mockUploadDir),
          },
        },
      ],
    }).compile();

    service = module.get<TextbookFileService>(TextbookFileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUploadDir', () => {
    it('should return upload directory', () => {
      const dir = service.getUploadDir();
      expect(dir).toBe(mockUploadDir);
    });
  });

  describe('shouldIgnoreFile', () => {
    it('should ignore hidden files', () => {
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('.hidden'),
      ).toBe(true);
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('normal.xlsx'),
      ).toBe(false);
    });

    it('should ignore temp files', () => {
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('_temp.xlsx'),
      ).toBe(true);
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('tmp_backup.csv'),
      ).toBe(true);
    });

    it('should ignore non-target files', () => {
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('document.pdf'),
      ).toBe(true);
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('image.png'),
      ).toBe(true);
    });

    it('should accept target files', () => {
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('math.xlsx'),
      ).toBe(false);
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('math.csv'),
      ).toBe(false);
      expect(
        (
          service as unknown as { shouldIgnoreFile: (f: string) => boolean }
        ).shouldIgnoreFile('math.md'),
      ).toBe(false);
    });
  });

  describe('getFileType', () => {
    it('should detect xlsx files', () => {
      expect(service.getFileType('math.xlsx')).toBe('xlsx');
      expect(service.getFileType('math.XLSX')).toBe('xlsx');
    });

    it('should detect csv files', () => {
      expect(service.getFileType('math.csv')).toBe('csv');
      expect(service.getFileType('math.CSV')).toBe('csv');
    });

    it('should return null for unknown types', () => {
      expect(service.getFileType('math.txt')).toBeNull();
      expect(service.getFileType('math.pdf')).toBeNull();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      expect(service.fileExists('math.xlsx')).toBe(true);
    });

    it('should return false for non-existing file', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(service.fileExists('nonexistent.xlsx')).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('should return file info for existing file', () => {
      const mockStats = {
        size: 1024,
        mtime: new Date('2024-01-15'),
      };
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue(mockStats as any);

      const info = service.getFileInfo('math.xlsx');

      expect(info).toEqual({
        exists: true,
        size: 1024,
        modifiedAt: new Date('2024-01-15'),
      });
    });

    it('should return null for non-existing file', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const info = service.getFileInfo('nonexistent.xlsx');
      expect(info).toBeNull();
    });
  });
});
