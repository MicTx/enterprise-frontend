// 应用初始态类型真源：currentUser 形状在此集中声明。
export interface CurrentUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

export interface InitialState {
  currentUser?: CurrentUser;
}
