import { useState } from 'react';
import { Card, Table, Tag, Select } from 'antd';
import { HealthIndexChart } from '../components/HealthIndexChart';

const { Option } = Select;

// 从系统与资产控制中心中拉取的已注册设备清单
// 包含 Dashboard 中大屏预设的差异化参数，以保持数据源一致
const REGISTERED_DEVICES = [
    {
        id: 'A-001',
        sn: 'ZJ-Heli-A1',
        name: '一号减速箱',
        model_type: '两级行星直升机主减速器',
        location: '1号试车台',
        healthDrop: 0,
        seed: 1,
    },
    {
        id: 'B-002',
        sn: 'ZJ-Heli-A2',
        name: '二号减速箱',
        model_type: '两级行星直升机主减速器',
        location: '备用仓库',
        healthDrop: 12,
        seed: 7,
    },
];

const HealthStatus = () => {
    // 默认选择第一台设备
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>(REGISTERED_DEVICES[0].id);

    const activeDevice = REGISTERED_DEVICES.find(d => d.id === selectedDeviceId) ?? REGISTERED_DEVICES[0];

    // 模拟告警列表数据（这里可以根据 deviceId 过滤或动态展示，暂维持静态展示或稍加区分）
    const alertColumns = [
        { title: '告警时间', dataIndex: 'time', key: 'time' },
        { title: '规则/测点', dataIndex: 'rule', key: 'rule' },
        {
            title: '级别',
            dataIndex: 'level',
            key: 'level',
            render: (level: string) => {
                const color = level === '严重' ? '#f5222d' : level === '警告' ? '#faad14' : '#1890ff';
                return <Tag color={color}>{level}</Tag>;
            }
        },
        { title: '告警描述', dataIndex: 'desc', key: 'desc' }
    ];

    const alertData = activeDevice.id === 'A-001' ? [
        { key: '3', time: '2025-07-10 10:22:15', rule: 'X轴振动信号异常', level: '警告', desc: '二级大齿轮点蚀（GALN算法）' },
        { key: '2', time: '2023-10-25 10:28:12', rule: '温度包络阈值', level: '警告', desc: '输入轴测温节点报告温度持续攀升逾 3°C/min。' },
    ] : [
        { key: '1', time: '2025-08-22 15:29:05', rule: 'X轴振动信号异常', level: '严重', desc: '一级小齿轮断齿（GALN算法）' },
        { key: '4', time: '2023-10-25 08:15:00', rule: '31维统计特征 (均方根)', level: '提示', desc: '振动波峰因载荷波动产生瞬时偏移。' },
    ];

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <Select
                    value={selectedDeviceId}
                    onChange={setSelectedDeviceId}
                    style={{ width: 320 }}
                    size="large"
                >
                    {REGISTERED_DEVICES.map(d => (
                        <Option key={d.id} value={d.id}>
                            [{d.sn}] {d.name} - {d.location}
                        </Option>
                    ))}
                </Select>
                <p className="text-gray-400 text-sm">此模块基于联自适应直方图与 31 项衍生特征构建时变转速健康指标，并执行自动告警研判流。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                {/* 左面：指标趋势图 */}
                <Card title="量化健康指标趋势 (综合特征汇聚)" className="h-full flex flex-col" bodyStyle={{ flex: 1, padding: '8px' }}>
                    {/* 直接复用 Dashboard 的组件和相同参数，完全保持数据一致 */}
                    <HealthIndexChart healthDrop={activeDevice.healthDrop} seed={activeDevice.seed} />
                </Card>

                {/* 右面：异常告警表 */}
                <Card title={`异常检测与告警跟踪 (${activeDevice.name})`} className="h-full flex flex-col" bodyStyle={{ flex: 1, overflow: 'auto' }}>
                    <Table
                        columns={alertColumns}
                        dataSource={alertData}
                        pagination={false}
                        size="middle"
                        className="w-full"
                    />
                </Card>
            </div>
        </div>
    );
};

export default HealthStatus;
