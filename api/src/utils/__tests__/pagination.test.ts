import {
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  defaultPagination,
  paginationClause,
  parsePagination,
} from '../pagination';

describe('parsePagination', () => {
  it('falls back to the default page when nothing is supplied', () => {
    expect(parsePagination({})).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
    expect(parsePagination(undefined)).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  });

  it('reads numeric query strings', () => {
    expect(parsePagination({ limit: '25', offset: '50' })).toEqual({
      limit: 25,
      offset: 50,
    });
  });

  it('clamps limit to the maximum page size', () => {
    expect(parsePagination({ limit: String(MAX_PAGE_SIZE + 1000) })).toEqual({
      limit: MAX_PAGE_SIZE,
      offset: 0,
    });
  });

  it('caps an oversized explicit default', () => {
    expect(parsePagination({}, MAX_PAGE_SIZE * 2).limit).toBe(MAX_PAGE_SIZE);
  });

  it('ignores non-integer, negative and empty values', () => {
    expect(parsePagination({ limit: 'abc', offset: 'xyz' })).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
    expect(parsePagination({ limit: '0', offset: '-5' })).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
    expect(parsePagination({ limit: '', offset: '1.5' })).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  });

  it('uses the first value when a param is repeated', () => {
    expect(parsePagination({ limit: ['10', '20'] })).toEqual({
      limit: 10,
      offset: 0,
    });
  });
});

describe('paginationClause', () => {
  it('numbers placeholders from the given start index', () => {
    expect(paginationClause({ limit: 10, offset: 20 }, 5)).toEqual({
      clause: 'LIMIT $5 OFFSET $6',
      values: [10, 20],
    });
  });

  it('defaults to a full first page', () => {
    expect(defaultPagination()).toEqual({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0,
    });
  });
});
