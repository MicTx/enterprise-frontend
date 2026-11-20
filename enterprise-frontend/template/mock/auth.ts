// 登录与身份 mock（dev-only，umi 内置 mock 目录，不进构建产物）。
// 示例账号（仅本地演示，不用于生产）：
//   admin / admin123 → role=admin，permissions=['projects:manage']
//   viewer / viewer123 → role=user，permissions=[]

interface MockRequest {
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  params: Record<string, string>;
  headers: { authorization?: string };
}

interface MockResponse {
  status(code: number): MockResponse;
  json(payload: unknown): void;
}

interface DemoAccount {
  username: string;
  password: string;
  id: string;
  name: string;
  role: 'admin' | 'user';
  permissions: string[];
}

const ACCOUNTS: DemoAccount[] = [
  {
    username: 'admin',
    password: 'admin123',
    id: 'u-001',
    name: '系统管理员',
    role: 'admin',
    permissions: ['projects:manage'],
  },
  {
    username: 'viewer',
    password: 'viewer123',
    id: 'u-002',
    name: '只读用户',
    role: 'user',
    permissions: [],
  },
];

// mock token 只做身份区分（demo-<username>），无签名语义。
function accountFromToken(
  authorization: string | undefined,
): DemoAccount | undefined {
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token?.startsWith('demo-')) return undefined;
  return ACCOUNTS.find((a) => a.username === token.slice('demo-'.length));
}

export default {
  'POST /api/auth/login': (req: MockRequest, res: MockResponse) => {
    const { username, password } = (req.body ?? {}) as {
      username?: string;
      password?: string;
    };
    const account = ACCOUNTS.find(
      (a) => a.username === username && a.password === password,
    );
    if (!account) {
      res.status(401).json({
        success: false,
        errorCode: 'AUTH_INVALID',
        errorMessage: '用户名或密码错误',
        showType: 'SILENT',
      });
      return;
    }
    res.json({ data: { token: `demo-${account.username}` } });
  },

  'GET /api/me': (req: MockRequest, res: MockResponse) => {
    const account = accountFromToken(req.headers.authorization);
    if (!account) {
      res.status(401).json({
        success: false,
        errorCode: 'AUTH_REQUIRED',
        errorMessage: '未登录或会话已过期',
        showType: 'REDIRECT',
      });
      return;
    }
    const { username: _u, password: _p, ...user } = account;
    res.json({ data: user });
  },
};
