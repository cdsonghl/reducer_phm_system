import React from 'react';
import { Table, Button, Card, Tag, Input, Space } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';

const SystemManagement = () => {
    const columns = [
        { title: '资产编号', dataIndex: 'device_sn', key: 'device_sn', width: 120 },
        { title: '设备型号', dataIndex: 'model_type', key: 'model_type' },
        { title: '部署位置', dataIndex: 'location', key: 'location' },
        {
            title: '状态',
            key: 'status',
            dataIndex: 'status',
            render: (status: string) => {
                let color = status === '在线' ? 'green' : (status === '离线' ? 'red' : 'volcano');
                return <Tag color={color}>{status}</Tag>;
            }
        },
        { title: '最近维保时间', dataIndex: 'last_maintenance', key: 'last_maintenance' },
        { title: '操作', key: 'action', render: () => <a className="text-brand-primary">编辑</a> },
    ];

    const data = [
        { key: '1', device_sn: 'ZJ-Heli-A1', model_type: '两级行星直升机主减速器', location: '1号试车台', status: '在线', last_maintenance: '2023-11-05' },
        { key: '2', device_sn: 'ZJ-Heli-A2', model_type: '两级行星直升机主减速器', location: '备用仓库', status: '离线', last_maintenance: '2023-01-12' },
    ];

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-brand-primary">系统与资产控制中心 (MySQL 业务台账)</h1>

            <Card bordered={false} className="mb-4">
                <div className="flex justify-between mb-4">
                    <Space>
                        <Input placeholder="输入资产编号或型号" prefix={<SearchOutlined />} style={{ width: 250 }} />
                        <Button type="primary" className="bg-brand-primary border-brand-primary">查询检索</Button>
                    </Space>
                    <Button icon={<PlusOutlined />} type="dashed">新增监控实体</Button>
                </div>
                <Table columns={columns} dataSource={data} pagination={{ pageSize: 5 }} size="small" />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card title="角色与权限网关 (IAM)" bordered={false} className="h-full">
                    <ul className="text-sm text-gray-400 space-y-3">
                        <li className="flex justify-between border-b border-gray-800 pb-2">
                            <span>Admin (超级管理员)</span> <Tag color="blue">全局读写与系统重置</Tag>
                        </li>
                        <li className="flex justify-between border-b border-gray-800 pb-2">
                            <span>Algorithm Expert (算法专家)</span> <Tag color="cyan">MCP算法上下行与参数控制</Tag>
                        </li>
                        <li className="flex justify-between pb-2">
                            <span>Operator (现场运维员)</span> <Tag color="magenta">大屏只读与接转维修工单</Tag>
                        </li>
                    </ul>
                </Card>

                <Card title="平台接口 API 配置状态" bordered={false} className="h-full">
                    <div className="space-y-4 text-sm">
                        <div>
                            <p className="text-gray-300 font-bold mb-1">ERP/MES 外部接口对接</p>
                            <Input value="https://api.factory-erp.internal/v1/sync" disabled />
                        </div>
                        <div>
                            <p className="text-gray-300 font-bold mb-1">通知网关 (钉钉 / 企业微信 Webhook)</p>
                            <Input value="https://oapi.dingtalk.com/robot/send?access_token=..." disabled />
                        </div>
                    </div>
                </Card>
            </div>

        </div>
    );
};
export default SystemManagement;
