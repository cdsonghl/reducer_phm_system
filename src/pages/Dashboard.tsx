
import { Card, Table, Tag } from 'antd';
import DigitalTwin from '../components/DigitalTwin';
import { DEFAULT_HIGHLIGHT_PARTS, DEVICE2_HIGHLIGHT_PARTS } from '../components/digitalTwinConfig';
import { HealthIndexChart } from '../components/HealthIndexChart';

// 设备配置
const DEVICES = [
    {
        id: 'A-001',
        name: '一号减速箱',
        highlightParts: DEFAULT_HIGHLIGHT_PARTS,
        healthDrop: 0,
        seed: 1,
    },
    {
        id: 'B-002',
        name: '二号减速箱',
        highlightParts: DEVICE2_HIGHLIGHT_PARTS,
        healthDrop: 12,
        seed: 7,
    },
];

const alertColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 180 },
    { title: '故障设备', dataIndex: 'device', key: 'device', width: 120 },
    { title: '设备编号', dataIndex: 'deviceId', key: 'deviceId', width: 100 },
    { title: '触发信号', dataIndex: 'component', key: 'component' },
    {
        title: '级别', dataIndex: 'level', key: 'level', width: 90,
        render: (level: string) => {
            const color = level === 'Critical' ? 'red' : level === 'Warning' ? 'orange' : 'green';
            return <Tag color={color}>{level}</Tag>;
        }
    },
    { title: '诊断结果', dataIndex: 'detail', key: 'detail' },
];

const alertData = [
    { key: '0', time: '2026-02-09 15:37:17', device: '一号减速箱', deviceId: 'A-001', component: 'Z轴振动信号异常', level: 'Critical', detail: '输入轴轴承故障（GALN算法）' },
    { key: '1', time: '2025-12-22 15:29:05', device: '二号减速箱', deviceId: 'B-002', component: 'X轴振动信号异常', level: 'Critical', detail: '一级小齿轮断齿（GALN算法）' },
    { key: '2', time: '2025-12-10 10:22:15', device: '一号减速箱', deviceId: 'A-001', component: 'X轴振动信号异常', level: 'Warning', detail: '二级大齿轮点蚀（GALN算法）' },
    { key: '3', time: '2023-10-25 10:28:12', device: '一号减速箱', deviceId: 'A-001', component: '温度包络阈值', level: 'Warning', detail: '1号太阳轮侧温节点报告温度持续攀升逾 3°C/min。' },
    { key: '4', time: '2023-10-25 08:15:00', device: '二号减速箱', deviceId: 'B-002', component: '31维统计特征(均方根余量)', level: 'Info', detail: '振动波峰因载荷波动产生瞬时偏移，已通过自适应聚类吸收。' },
];

const Dashboard = () => {
    return (
        <div className="space-y-4">
            {/* 顶部状态栏 */}
            <div className="flex justify-end text-sm text-gray-400">
                实时帧率: 60Hz | 边缘节点: Online
            </div>

            {/* 两台设备并排展示 */}
            <div className="grid grid-cols-2 gap-4">
                {DEVICES.map(device => (
                    <div key={device.id} className="space-y-3">
                        {/* 设备标题 */}
                        <div className="flex items-center gap-3">
                            <span className="text-base font-semibold text-gray-200">{device.name}</span>
                            <Tag color="blue">{device.id}</Tag>
                        </div>

                        {/* 数字孪生体 */}
                        <Card
                            title={device.name}
                            bordered={false}
                            size="small"
                            className="h-[300px]"
                            bodyStyle={{ height: 'calc(100% - 46px)', padding: 0 }}
                        >
                            <DigitalTwin
                                highlightParts={device.highlightParts}
                                compact
                            />
                        </Card>

                        {/* 健康指标趋势 */}
                        <Card
                            title="设备健康指标"
                            bordered={false}
                            size="small"
                            className="h-[280px]"
                            bodyStyle={{ height: 'calc(100% - 46px)', padding: '8px' }}
                        >
                            <HealthIndexChart healthDrop={device.healthDrop} seed={device.seed} />
                        </Card>
                    </div>
                ))}
            </div>

            {/* 实时告警日志 */}
            <Card title="实时事件告警流日志 (Event Alert)" bordered={false}>
                <Table
                    columns={alertColumns}
                    dataSource={alertData}
                    pagination={false}
                    size="small"
                />
            </Card>
        </div>
    );
};

export default Dashboard;
