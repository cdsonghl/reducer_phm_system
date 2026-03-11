import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LineChartOutlined,
    ApiOutlined,
    SettingOutlined,
    DashboardOutlined,
    ToolOutlined,
    DatabaseOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: '可视化监控 (大屏)',
        },
        {
            key: '/acquisition',
            icon: <DatabaseOutlined />,
            label: '数据采集模块',
        },
        {
            key: '/processing',
            icon: <SettingOutlined />,
            label: '数据预处理',
        },
        {
            key: '/health',
            icon: <LineChartOutlined />,
            label: '健康状态评估',
        },
        {
            key: '/diagnosis',
            icon: <ToolOutlined />,
            label: '故障诊断',
        },
        {
            key: '/system',
            icon: <ApiOutlined />,
            label: '系统支撑管理',
        },
    ];

    return (
        <Layout className="min-h-screen">
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
                className="border-r border-gray-800"
            >
                <div className="h-16 flex items-center justify-center m-4 text-white font-bold text-lg border-b border-gray-700">
                    {collapsed ? 'PHM' : '减速器 PHM 系统'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    className="bg-transparent"
                />
            </Sider>
            <Layout>
                <Header className="h-16 bg-panel border-b border-gray-800 px-6 flex items-center justify-between">
                    <div className="text-gray-300 text-lg font-medium">PHM 云端平台层分析监测域</div>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-400 text-sm">当前状态: 运行中</span>
                        <div className="h-8 w-8 rounded-full bg-brand-primary flex items-center justify-center text-white cursor-pointer hover:bg-blue-500">
                            Admin
                        </div>
                    </div>
                </Header>
                <Content className="m-4 p-4 min-h-[280px] bg-panel rounded-lg border border-gray-800 overflow-auto">
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
