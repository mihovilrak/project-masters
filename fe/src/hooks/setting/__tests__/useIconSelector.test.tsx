import { renderHook, act, waitFor } from '@testing-library/react';
import { useIconSelector } from '../useIconSelector';
import { getAvailableIcons } from '../../../api/activityTypes';
import logger from '../../../utils/logger';

// Mock the API calls
jest.mock('../../../api/activityTypes');

describe('useIconSelector', () => {
  const mockIcons = ['TaskAlt', 'BugReport', 'Code', 'Work', 'Build'];

  beforeEach(() => {
    jest.clearAllMocks();
    (getAvailableIcons as jest.Mock).mockResolvedValue(mockIcons);
  });

  it('should initialize with the provided initial value', () => {
    const { result } = renderHook(() => useIconSelector('initial-icon'));

    expect(result.current.value).toBe('initial-icon');
    expect(result.current.open).toBe(false);
  });

  it('should load icons on mount', async () => {
    const { result } = renderHook(() => useIconSelector(undefined));

    await waitFor(() => {
      expect(getAvailableIcons).toHaveBeenCalledTimes(1);
      expect(result.current.icons).toEqual(mockIcons);
    });
  });

  it('should handle API error gracefully', async () => {
    (getAvailableIcons as jest.Mock).mockRejectedValueOnce(
      new Error('API Error'),
    );

    const { result } = renderHook(() => useIconSelector(undefined));

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load icons',
        expect.any(Error),
      );
      expect(result.current.icons).toEqual([]);
    });
  });

  it('should handle dialog open state', () => {
    const { result } = renderHook(() => useIconSelector(undefined));

    act(() => {
      result.current.handleOpen();
    });
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.handleClose();
    });
    expect(result.current.open).toBe(false);
  });

  it('should handle icon selection', () => {
    const { result } = renderHook(() => useIconSelector(undefined));

    act(() => {
      result.current.handleOpen();
    });
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.handleSelect('new-icon');
    });
    expect(result.current.value).toBe('new-icon');
    expect(result.current.open).toBe(false);
  });

  it('should maintain selected value between renders', () => {
    const { result, rerender } = renderHook(() => useIconSelector('test-icon'));

    expect(result.current.value).toBe('test-icon');

    act(() => {
      result.current.handleSelect('new-icon');
    });
    expect(result.current.value).toBe('new-icon');

    rerender();
    expect(result.current.value).toBe('new-icon');
  });
});
