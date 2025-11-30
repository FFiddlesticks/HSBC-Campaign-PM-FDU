import React from 'react';
import { Layout, Menu, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { GLOBAL_TAB } from './const/common';
import './index.css'

const { Header, Content, Sider } = Layout;

const LayoutPage: React.FC = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const navigator=useNavigate();
  const location = useLocation();
  const selectedKeys = [location.pathname.replace('/', '')];

  return (
    <Layout>
      <Header style={{ display: 'flex', alignItems: 'center',height:50 ,color:'white',paddingLeft:20}}>
        Argus - 智能文件管理系统
      </Header>
      <Layout className='layout'>
        <Sider width={200} style={{ background: colorBgContainer }}>
          <Menu
            mode="inline"
            style={{ height: '400px', borderRight: 0 }}
            items={GLOBAL_TAB}
            selectedKeys={selectedKeys}
            onClick={(item)=>{
              navigator(item.key)
            }}
          />
        </Sider>
        <Layout style={{ padding: '24px 24px' }}>
          <Content className='content'>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default LayoutPage;
