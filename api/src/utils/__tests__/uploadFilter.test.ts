import { Request } from 'express';
import { uploadFileFilter, ALLOWED_UPLOAD_TYPES } from '../uploadFilter';

type FilterCallback = (error: Error | null, acceptFile?: boolean) => void;

const filter = uploadFileFilter as unknown as (
  req: Request,
  file: { originalname: string; mimetype: string },
  cb: FilterCallback,
) => void;

const run = (originalname: string, mimetype: string) => {
  const cb = jest.fn();
  filter({} as Request, { originalname, mimetype }, cb);
  return cb;
};

const rejectionOf = (originalname: string, mimetype: string) =>
  run(originalname, mimetype).mock.calls[0][0] as Error & { status?: number };

describe('uploadFileFilter', () => {
  it('accepts every extension/MIME pair in the allowlist', () => {
    for (const [extension, mimeTypes] of Object.entries(ALLOWED_UPLOAD_TYPES)) {
      for (const mimeType of mimeTypes) {
        expect(run(`report${extension}`, mimeType)).toHaveBeenCalledWith(
          null,
          true,
        );
      }
    }
  });

  it('accepts an uppercase extension', () => {
    expect(run('SCAN.PDF', 'application/pdf')).toHaveBeenCalledWith(null, true);
  });

  it('rejects an extension outside the allowlist', () => {
    const cb = run('payload.exe', 'application/x-msdownload');

    expect(cb).toHaveBeenCalledTimes(1);
    const [error, accepted] = cb.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Unsupported file type/);
    expect(accepted).toBeUndefined();
  });

  it('rejects markup and scripts browsers would execute', () => {
    expect(rejectionOf('xss.html', 'text/html')).toBeInstanceOf(Error);
    expect(rejectionOf('xss.htm', 'text/html')).toBeInstanceOf(Error);
    expect(rejectionOf('xss.svg', 'image/svg+xml')).toBeInstanceOf(Error);
    expect(rejectionOf('xss.js', 'text/javascript')).toBeInstanceOf(Error);
  });

  it('rejects a file with no extension', () => {
    expect(rejectionOf('Dockerfile', 'text/plain')).toBeInstanceOf(Error);
  });

  it('rejects an allowed extension carrying a disallowed MIME type', () => {
    expect(rejectionOf('logo.png', 'text/html')).toBeInstanceOf(Error);
  });

  it('rejects a disallowed extension hidden behind an allowed MIME type', () => {
    expect(rejectionOf('shell.sh', 'text/plain')).toBeInstanceOf(Error);
  });

  it('only inspects the final extension of a double-extension name', () => {
    expect(rejectionOf('invoice.pdf.exe', 'application/pdf')).toBeInstanceOf(
      Error,
    );
    expect(run('invoice.exe.pdf', 'application/pdf')).toHaveBeenCalledWith(
      null,
      true,
    );
  });

  it('tags the rejection with a 400 status for the error handler', () => {
    expect(rejectionOf('payload.exe', 'application/x-msdownload').status).toBe(
      400,
    );
  });
});
