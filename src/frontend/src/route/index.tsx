import React from 'react';
import { lazy } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';

const Home = lazy(() => import('../page/home'))  //路由懒加载
const Upload = lazy(() => import('../page/upload'))
const Query = lazy(() => import('../page/query'))
const LayoutPage = lazy(() => import('../LayoutPage'))
import {
    LaptopOutlined,
} from '@ant-design/icons'
import LoginPage from '../page/login';
// 进入页面时先跳转到登录页面，只有登录成功后才能进入其他页面

// 简单的路由鉴权守卫：检查 localStorage/sessionStorage 中的认证标识
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = Boolean(
        localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || localStorage.getItem('isLoggedIn')
    );
    const location = useLocation();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return children;
};

export const routeItmes = [
    // 公开路由：登录页
    {
        path: '/login',
        element: <LoginPage />,
        tag: '登录',
        icon: <LaptopOutlined />
    },
    // 根路径直接跳转到登录页（未登录时不会渲染 LayoutPage）
    {
        path: '/',
        element: <Navigate to="/login" replace />,
    },
    // 受保护路由：所有需要 Layout 的页面都挂在 /app 下，只有登录后才能访问
    {
        path: '/app',
        element: <RequireAuth><LayoutPage /></RequireAuth>,
        children: [
            {
                index: true,
                element: <Navigate to="home" replace />,
            },
            {
                path: 'home',
                element: <Home />,
                tag: '首页',
                icon: <LaptopOutlined />
            },
            {
                path: 'upload',
                element: <Upload />,
                tag: '上传',
                icon: <LaptopOutlined />
            },
            {
                path: 'query',
                element: <Query />,
                tag: '查询',
                icon: <LaptopOutlined />
            }
        ],
    },
]

const router = createBrowserRouter(routeItmes);
export default router