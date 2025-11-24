import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'antd';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    // 模拟登陆逻辑
    if (email === 'admin@hsbc.com' && password === '123456') {
        // 登陆成功：保存 token 到 localStorage（或 sessionStorage），然后跳回 from 或 /app/home
        const fakeToken = 'fake-jwt-token';
        localStorage.setItem('authToken', fakeToken);
        // 保存当前登录用户的邮箱（用于默认邮件收件人）
        localStorage.setItem('authUser', email);
        const from = (location.state as any)?.from?.pathname || '/app/home';
        navigate(from, { replace: true });
    } else {
        alert('登录失败，请检查邮箱和密码');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0b3b61 0%, #0f4f7a 60%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        color: '#0b2340'
      }}
    >
      <div
        style={{
          width: 400,
          background: '#ffffff',
          borderRadius: 8,
          padding: 28,
          boxShadow: '0 8px 24px rgba(3, 17, 34, 0.2)',
          borderLeft: '4px solid #0b66b2'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0b3b61' }}>汇丰智能文件管理系统</div>
          <div style={{ fontSize: 12, color: '#6b7b8a' }}>请使用企业邮箱登录</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              boxSizing: 'border-box',
              borderRadius: 4,
              border: '1px solid #d9e2ea'
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              boxSizing: 'border-box',
              borderRadius: 4,
              border: '1px solid #d9e2ea'
            }}
          />
        </div>

        <div style={{ marginTop: 6 }}>
          <Button
            type="primary"
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '10px 12px',
              boxSizing: 'border-box',
              backgroundColor: '#0b66b2',
              borderColor: '#0b66b2'
            }}
          >
            登录
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;         