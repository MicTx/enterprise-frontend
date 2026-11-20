import { apiClient } from './apiClient';

jest.mock('@umijs/max', () => ({
  request: jest.fn(),
}));

import { request } from '@umijs/max';

const mockedRequest = jest.mocked(request);

describe('apiClient dataField 解包契约', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('响应体含 data 字段时解包返回业务载荷', async () => {
    mockedRequest.mockResolvedValue({ data: { token: 'demo-admin' } });
    await expect(apiClient.post('/auth/login', {})).resolves.toEqual({
      token: 'demo-admin',
    });
    expect(mockedRequest).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        skipErrorHandler: true,
      }),
    );
  });

  it('无 data 字段的响应原样返回', async () => {
    mockedRequest.mockResolvedValue({ ok: true });
    await expect(apiClient.delete('/projects/p-001')).resolves.toEqual({
      ok: true,
    });
  });

  it('五类方法都带 method 与 skipErrorHandler', async () => {
    mockedRequest.mockResolvedValue({ data: null });
    await apiClient.get('/me');
    await apiClient.post('/projects', {});
    await apiClient.put('/projects/1', {});
    await apiClient.patch('/projects/1', {});
    await apiClient.delete('/projects/1');
    // request 重载面较宽，收窄读 calls 的第二参
    const calls = mockedRequest.mock.calls as unknown as Array<
      [string, { method?: string; skipErrorHandler?: boolean }]
    >;
    expect(calls.map((call) => call[1]?.method)).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ]);
    for (const call of calls) {
      expect(call[1]?.skipErrorHandler).toBe(true);
    }
  });
});
