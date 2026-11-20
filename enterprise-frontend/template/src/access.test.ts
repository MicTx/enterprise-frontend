import access from './access';

describe('access 权限真源', () => {
  it('未登录全 false', () => {
    expect(access(undefined)).toEqual({
      isLoggedIn: false,
      canAdmin: false,
      canManageProjects: false,
    });
  });

  it('admin 角色隐含功能级权限', () => {
    const result = access({
      currentUser: { id: 'u-001', name: '系统管理员', role: 'admin' },
    });
    expect(result).toEqual({
      isLoggedIn: true,
      canAdmin: true,
      canManageProjects: true,
    });
  });

  it('普通用户按权限码解析功能级权限', () => {
    const granted = access({
      currentUser: {
        id: 'u-002',
        name: '张三',
        role: 'user',
        permissions: ['projects:manage'],
      },
    });
    expect(granted.canAdmin).toBe(false);
    expect(granted.canManageProjects).toBe(true);

    const denied = access({
      currentUser: { id: 'u-003', name: '李四', role: 'user' },
    });
    expect(denied.canManageProjects).toBe(false);
  });
});
