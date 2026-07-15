import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as xlsx from 'xlsx';
import { TextbookFilePair, FrameworkType } from './types/textbook.types';

@Injectable()
export class TextbookFileService {
  private readonly logger = new Logger(TextbookFileService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    // 上传目录默认为项目根目录下的 iksm 文件夹
    this.uploadDir =
      this.configService.get<string>('IKSM_DIR') ||
      path.join(process.cwd(), '..', '..', 'iksm');

    // 确保目录存在
    this.ensureDirectoryExists(this.uploadDir);
  }

  /**
   * 获取上传目录路径
   */
  getUploadDir(): string {
    return this.uploadDir;
  }

  /**
   * 确保目录存在
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`创建目录: ${dirPath}`);
    }
  }

  /**
   * 扫描教材文件目录，返回所有文件对
   */
  scanTextbookFiles(): Map<string, TextbookFilePair> {
    const filePairs = new Map<string, TextbookFilePair>();

    if (!fs.existsSync(this.uploadDir)) {
      this.logger.warn(`教材目录不存在: ${this.uploadDir}`);
      return filePairs;
    }

    const files = fs.readdirSync(this.uploadDir);

    // 按文件名前缀分组
    const fileGroups = new Map<
      string,
      { framework?: string; content?: string }
    >();

    for (const file of files) {
      // 忽略隐藏文件、临时文件和非目标文件
      if (this.shouldIgnoreFile(file)) {
        continue;
      }

      const ext = path.extname(file).toLowerCase();
      const baseName = path.basename(file, ext);

      if (!fileGroups.has(baseName)) {
        fileGroups.set(baseName, {});
      }

      const group = fileGroups.get(baseName)!;

      if (ext === '.xlsx' || ext === '.csv') {
        // 如果同时存在 xlsx 和 csv，优先使用 xlsx
        if (!group.framework || ext === '.xlsx') {
          group.framework = file;
        }
      } else if (ext === '.md') {
        group.content = file;
      }
    }

    // 构建文件对映射
    for (const [baseName, group] of fileGroups) {
      if (group.framework) {
        const frameworkPath = path.join(this.uploadDir, group.framework);
        const frameworkExt = path.extname(group.framework).toLowerCase();
        const frameworkType: FrameworkType =
          frameworkExt === '.xlsx' ? 'xlsx' : 'csv';

        const stats = fs.statSync(frameworkPath);

        filePairs.set(baseName, {
          frameworkPath: group.framework,
          frameworkType,
          contentPath: group.content,
          lastModifiedAt: stats.mtime,
        });
      }
    }

    this.logger.log(`扫描到 ${filePairs.size} 个教材文件对`);
    return filePairs;
  }

  /**
   * 判断是否应该忽略的文件
   */
  private shouldIgnoreFile(file: string): boolean {
    // 忽略以 . 开头的隐藏文件
    if (file.startsWith('.')) {
      return true;
    }

    // 忽略以 _ 或 tmp 开头的临时文件
    if (file.startsWith('_') || file.startsWith('tmp')) {
      return true;
    }

    // 只处理 .xlsx, .csv, .md 文件
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.csv' && ext !== '.md') {
      return true;
    }

    return false;
  }

  /**
   * 保存上传的文件
   * @param fileName 原始文件名
   * @param buffer 文件内容
   * @returns 保存后的文件路径
   */
  async saveFile(fileName: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.uploadDir, fileName);

    try {
      await fs.promises.writeFile(filePath, buffer);
      this.logger.log(`文件已保存: ${filePath}`);
      return filePath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`保存文件失败: ${errorMessage}`);
      throw new BadRequestException(`保存文件失败: ${errorMessage}`);
    }
  }

  /**
   * 删除文件
   * @param fileName 文件名
   */
  async deleteFile(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileName);

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`文件已删除: ${filePath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`删除文件失败: ${errorMessage}`);
      throw new BadRequestException(`删除文件失败: ${errorMessage}`);
    }
  }

  /**
   * 保存临时上传文件，返回完整路径
   */
  async saveTempFile(buffer: Buffer, extension: string): Promise<string> {
    const tempDir = os.tmpdir();
    const fileName = `.tmp-${crypto.randomUUID()}${extension}`;
    const filePath = path.join(tempDir, fileName);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  /**
   * 删除临时文件
   */
  async deleteTempFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // 忽略删除失败
    }
  }

  /**
   * 获取文件的完整路径
   */
  getFilePath(fileName: string): string {
    return path.join(this.uploadDir, fileName);
  }

  /**
   * 检查文件是否存在
   */
  fileExists(fileName: string): boolean {
    const filePath = path.join(this.uploadDir, fileName);
    return fs.existsSync(filePath);
  }

  /**
   * 获取文件信息
   */
  getFileInfo(
    fileName: string,
  ): { exists: boolean; size: number; modifiedAt: Date } | null {
    const filePath = path.join(this.uploadDir, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    return {
      exists: true,
      size: stats.size,
      modifiedAt: stats.mtime,
    };
  }

  /**
   * 在 xlsx 文件末尾追加新行
   * 保持原工作表结构（best-effort）
   */
  appendXlsxRows(
    fileName: string,
    headers: string[],
    rows: (string | number | undefined)[][],
  ): void {
    if (rows.length === 0) {
      return;
    }

    const filePath = this.getFilePath(fileName);
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`文件不存在: ${filePath}`);
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Determine the last row with data
    const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1');
    const lastRow = range.e.r;

    // Ensure we append after the last data row
    const newRowCount = rows.length;
    for (let i = 0; i < newRowCount; i++) {
      const row = rows[i];
      for (let j = 0; j < row.length; j++) {
        const cellAddress = xlsx.utils.encode_cell({
          r: lastRow + 1 + i,
          c: j,
        });
        const value = row[j] ?? '';
        worksheet[cellAddress] = {
          t: typeof value === 'number' ? 'n' : 's',
          v: value,
        };
      }
    }

    // Update range
    range.e.r = Math.max(range.e.r, lastRow + newRowCount);
    worksheet['!ref'] = xlsx.utils.encode_range(range);

    xlsx.writeFile(workbook, filePath);
    this.logger.log(`已追加 ${newRowCount} 行到 xlsx: ${filePath}`);
  }

  /**
   * 根据文件名获取文件类型
   */
  getFileType(fileName: string): FrameworkType | null {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.xlsx') {
      return 'xlsx';
    }
    if (ext === '.csv') {
      return 'csv';
    }
    return null;
  }
}
