import React, { useState } from 'react';
import { Card, Form, Button, Table, Tabs, Tag, Slider, InputNumber, Select, message, Upload } from 'antd';
import { UploadOutlined, RobotOutlined, CheckCircleOutlined, SearchOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

const FaultDiagnosis = () => {
    const [form] = Form.useForm();
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const [mcpAlgorithms, setMcpAlgorithms] = useState([
        { key: '1', name: '高斯注力机制轻量化网络', version: 'v1.2.0', status: 'Standby', source: '官方内置' },
        { key: '2', name: 'DCNN_ResNet50_Custom', version: 'v0.9.1-beta', status: 'Standby', source: '用户二次开发(MCP上传)' },
    ]);

    const [selectedModelKeys, setSelectedModelKeys] = useState<React.Key[]>([]);
    const [activeModelKey, setActiveModelKey] = useState<string>('');
    const [isMatching, setIsMatching] = useState(false);
    const [matchResult, setMatchResult] = useState<{ score: number; success: boolean } | null>(null);

    // Tab 2: Specific Anomaly Diagnosis State
    const assessmentTasks = [
        { key: '0', time: '2026-02-09 15:37:17', device: 'BP-14减速箱', component: 'Z轴振动信号异常', detail: '输入轴轴承故障' },
        { key: '1', time: '2025-12-22 15:29:05', device: '二号减速箱', component: 'X轴振动信号异常', detail: '一级小齿轮断齿' }
    ];
    const [selectedTaskKey, setSelectedTaskKey] = useState<React.Key>('0');
    const [selectedDiagnosisModel, setSelectedDiagnosisModel] = useState<string>('1');
    const activeTask = assessmentTasks.find(t => t.key === selectedTaskKey) || assessmentTasks[0];

    // 点选表格行——仅切换參数面板，不改变模型状态 (Tab 1)
    const handleSelectModel = (selectedRowKeys: React.Key[]) => {
        if (selectedRowKeys.length === 0) return;
        const targetKey = selectedRowKeys[0].toString();
        setSelectedModelKeys(selectedRowKeys);
        setActiveModelKey(targetKey);
        form.resetFields();
        setMatchResult(null);
    };

    // 停用：Active → Standby (Tab 1)
    const handleDeactivate = (key: string) => {
        setMcpAlgorithms(prev => prev.map(a => a.key === key ? { ...a, status: 'Standby' } : a));
        message.info('已将该模型转为 Standby 状态。');
    };

    // 删除模型 (Tab 1)
    const handleDeleteModel = (key: string) => {
        setMcpAlgorithms(prev => prev.filter(a => a.key !== key));
        if (activeModelKey === key) {
            setActiveModelKey('');
            setSelectedModelKeys([]);
            form.resetFields();
        }
        message.success('模型已取消注册。');
    };

    const handleAutoMatch = () => {
        setIsMatching(true);
        setMatchResult(null);
        setTimeout(() => {
            setIsMatching(false);
            const score = Math.floor(Math.random() * 20) + 80;
            if (score >= 80) {
                setMatchResult({ score, success: true });
                if (activeModelKey === '1') {
                    form.setFieldsValue({
                        meshOrder: ['1', '3.5'],
                        clsWeight: 1.0,
                        focalWeight: 2.0,
                        clsLRate: 0.001,
                        bwLRate: 0.001,
                        epoch: 50
                    });
                } else if (activeModelKey === '2') {
                    form.setFieldsValue({
                        clsLRate: 0.001,
                        convWindowWidth: 32,
                        epoch: 50
                    });
                }
                message.success(`匹配成功，重合度 ${score}%，已自动应用超参数。`);
            } else {
                setMatchResult({ score, success: false });
                message.warning(`匹配度仅为 ${score}%，请手动设置参数。`);
            }
        }, 1500);
    };

    const handleDeploy = () => {
        if (!activeModelKey) return;
        setIsDiagnosing(true);
        setTimeout(() => {
            setIsDiagnosing(false);
            setMcpAlgorithms(prev => prev.map(a => a.key === activeModelKey ? { ...a, status: 'Active' } : a));
            message.success('算法长期监控任务已下发执行。');
        }, 2000);
    };

    const handleDiagnoseTask = () => {
        if (!selectedDiagnosisModel) {
            message.warning('请选择诊断算法');
            return;
        }
        setIsDiagnosing(true);
        setShowResult(false);
        setTimeout(() => {
            setIsDiagnosing(false);
            setShowResult(true);
            message.success('诊断分析完成，已生成报告。');
        }, 2000);
    };

    const chartOption = {
        title: { text: '两级减速箱各部件异常概率', textStyle: { color: '#e5e7eb', fontSize: 13 }, top: 0, left: 'center' },
        radar: {
            center: ['50%', '55%'],
            radius: '65%',
            indicator: [
                { name: '一级小齿轮', max: 100 },
                { name: '一级大齿轮', max: 100 },
                { name: '二级小齿轮', max: 100 },
                { name: '二级大齿轮', max: 100 },
                { name: '轴承组', max: 100 },
            ],
            axisName: { color: '#9ca3af' },
            splitArea: { areaStyle: { color: ['transparent'] } },
            splitLine: { lineStyle: { color: '#374151' } }
        },
        series: [{
            name: '各部件受损概率',
            type: 'radar',
            areaStyle: { color: 'rgba(245, 34, 45, 0.4)' },
            lineStyle: { color: '#f5222d' },
            itemStyle: { color: '#f5222d' },
            data: [{ value: activeTask.key === '0' ? [11, 7, 7, 3, 73] : activeTask.key === '1' ? [92, 18, 12, 22, 15] : [5, 12, 18, 88, 10] }]
        }]
    };

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-brand-primary">故障诊断与运维决策</h1>

            <Tabs
                defaultActiveKey="1"
                className="text-gray-300"
                items={[
                    {
                        key: '1',
                        label: '算法实例化与参数配置',
                        children: (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card title="MCP 算法一键下发与二次开发管理" className="h-full">
                                    <Table
                                        rowSelection={{
                                            type: 'radio',
                                            selectedRowKeys: selectedModelKeys,
                                            onChange: handleSelectModel,
                                        }}
                                        onRow={(record) => ({
                                            onClick: () => handleSelectModel([record.key]),
                                            style: { cursor: 'pointer' },
                                        })}
                                        dataSource={mcpAlgorithms}
                                        columns={[
                                            { title: '注册模型名称', dataIndex: 'name' },
                                            { title: '来源', dataIndex: 'source' },
                                            {
                                                title: '状态', width: 80,
                                                render: (_, r) => <Tag color={r.status === 'Active' ? 'green' : 'default'}>{r.status}</Tag>
                                            },
                                            {
                                                title: '停用', width: 60,
                                                render: (_, r) => (
                                                    <Button
                                                        size="small"
                                                        type="link"
                                                        disabled={r.status !== 'Active'}
                                                        onClick={(e) => { e.stopPropagation(); handleDeactivate(r.key); }}
                                                    >停用</Button>
                                                )
                                            },
                                            {
                                                title: '删除', width: 60,
                                                render: (_, r) => (
                                                    <Button
                                                        size="small"
                                                        type="link"
                                                        danger
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteModel(r.key); }}
                                                    >删除</Button>
                                                )
                                            },
                                        ]}
                                        pagination={false}
                                        size="small"
                                        className="mb-4"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Upload accept=".txt,.log,.json,.md,.csv" showUploadList={false} beforeUpload={(file) => { message.success(`文件 ${file.name} 上传成功，等待MCP注册...`); return false; }}>
                                            <Button icon={<UploadOutlined />}>上传自定义模型 (MCP协议)</Button>
                                        </Upload>
                                    </div>
                                </Card>

                                <Card title="算法超参数配置" className="h-full">
                                    <div className="flex items-center gap-4 mb-4">
                                        <Button
                                            type="dashed"
                                            icon={<SearchOutlined />}
                                            onClick={handleAutoMatch}
                                            loading={isMatching}
                                        >
                                            自动匹配相似工况
                                        </Button>
                                        {matchResult && (
                                            <span className={`text-sm ${matchResult.success ? 'text-green-400' : 'text-yellow-400'}`}>
                                                重合度 {matchResult.score}%
                                            </span>
                                        )}
                                    </div>
                                    <Form
                                        form={form}
                                        layout="vertical"
                                        disabled={!activeModelKey}
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            {activeModelKey === '1' && (
                                                <>
                                                    <Form.Item label="啮合阶次 (可输入任意值，按回车添加)" name="meshOrder" className="col-span-2 mb-3">
                                                        <Select mode="tags" placeholder="输入啮合阶次，按回车确认" />
                                                    </Form.Item>
                                                    <Form.Item label="分类权重" name="clsWeight" className="mb-3">
                                                        <InputNumber style={{ width: '100%' }} step={0.1} placeholder="为空时使用默认值" />
                                                    </Form.Item>
                                                    <Form.Item label="聚焦权重" name="focalWeight" className="mb-3">
                                                        <InputNumber style={{ width: '100%' }} step={0.1} placeholder="为空时使用默认值" />
                                                    </Form.Item>
                                                    <Form.Item label="分类优化学习率" name="clsLRate" className="mb-3">
                                                        <InputNumber style={{ width: '100%' }} step={0.0001} placeholder="为空时使用默认值" />
                                                    </Form.Item>
                                                    <Form.Item label="带宽优化学习率" name="bwLRate" className="mb-3">
                                                        <InputNumber style={{ width: '100%' }} step={0.0001} placeholder="为空时使用默认值" />
                                                    </Form.Item>
                                                </>
                                            )}

                                            {activeModelKey === '2' && (
                                                <>
                                                    <Form.Item label="分类优化学习率" name="clsLRate" className="col-span-2 mb-3">
                                                        <InputNumber style={{ width: '100%' }} step={0.0001} placeholder="为空时使用默认值" />
                                                    </Form.Item>
                                                    <Form.Item label="卷积窗宽度" name="convWindowWidth" className="col-span-2 mb-3">
                                                        <InputNumber style={{ width: '100%' }} step={1} placeholder="为空时使用默认值" />
                                                    </Form.Item>
                                                </>
                                            )}
                                        </div>
                                        <Form.Item label="迭代微调轮次 (Epochs)" name="epoch" className="mb-4">
                                            <Slider min={10} max={200} marks={{ 10: '10', 50: '50', 200: '200' }} />
                                        </Form.Item>
                                        <Button type="primary" className="w-full bg-brand-warning border-none hover:bg-yellow-500 font-bold" loading={isDiagnosing} onClick={handleDeploy} disabled={selectedModelKeys.length === 0}>
                                            保存配置并下发长期监控任务
                                        </Button>
                                    </Form>
                                </Card>
                            </div>
                        )
                    },
                    {
                        key: '2',
                        label: '故障部位推理与维修建议',
                        children: (
                            <div className="space-y-4">
                                {/* 顶部：待评估任务选择和算法选择 */}
                                <Card title="第一步：配置单次诊断任务" bordered={false} className="w-full">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="flex-1">
                                            <h3 className="font-bold mb-3 text-gray-400">选择待分析异常记录：</h3>
                                            <Table
                                                rowSelection={{
                                                    type: 'radio',
                                                    selectedRowKeys: [selectedTaskKey],
                                                    onChange: (keys) => { setSelectedTaskKey(keys[0]); setShowResult(false); },
                                                }}
                                                onRow={(record) => ({
                                                    onClick: () => { setSelectedTaskKey(record.key); setShowResult(false); },
                                                    style: { cursor: 'pointer' }
                                                })}
                                                dataSource={assessmentTasks}
                                                columns={[
                                                    { title: '告警时间', dataIndex: 'time', width: 180 },
                                                    { title: '故障设备', dataIndex: 'device', width: 120 },
                                                    { title: '触发信号', dataIndex: 'component', width: 150 },
                                                    { title: '预警内容', dataIndex: 'detail' }
                                                ]}
                                                pagination={false}
                                                size="small"
                                            />
                                        </div>
                                        <div className="w-full md:w-1/3 flex flex-col justify-between">
                                            <div>
                                                <h3 className="font-bold mb-3 text-gray-400">选择诊断算法：</h3>
                                                <Select
                                                    value={selectedDiagnosisModel}
                                                    onChange={(val) => { setSelectedDiagnosisModel(val); setShowResult(false); }}
                                                    style={{ width: '100%', marginBottom: '16px' }}
                                                    options={mcpAlgorithms.map(m => ({ label: m.name + (m.status === 'Active' ? ' (运行中)' : ''), value: m.key }))}
                                                />
                                            </div>
                                            <Button type="primary" size="large" className="w-full bg-brand-warning border-none hover:bg-yellow-500 font-bold h-12 text-lg shadow-lg" loading={isDiagnosing} onClick={handleDiagnoseTask}>
                                                诊断并生成报告
                                            </Button>
                                        </div>
                                    </div>
                                </Card>

                                {showResult && (
                                    <div className="bg-[#0b1426] p-4 rounded-lg border border-gray-800">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            <Card title="诊断结果量化分析 (多尺度特征空间推演)" bordered={false} className="lg:col-span-2 h-full bg-[#111d35] border-none">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="text-6xl text-brand-danger"><CheckCircleOutlined /></div>
                                                    <div>
                                                        <h2 className="text-2xl font-bold text-brand-danger">
                                                            {activeTask.key === '0' ? '输入轴轴承 存在严重故障' : activeTask.key === '1' ? '一级小齿轮 存在严重故障' : '二级大齿轮 存在严重故障'}
                                                        </h2>
                                                        <p className="text-gray-400 mt-1">诊断机理信度: {activeTask.key === '0' ? '0.963' : activeTask.key === '1' ? '0.942' : '0.915'} | 预测模式: {activeTask.detail}</p>
                                                    </div>
                                                </div>
                                                <div className="h-[300px]">
                                                    <ReactECharts option={chartOption} className="h-full w-full" />
                                                </div>
                                            </Card>

                                            <Card title="智能维修建议报告" bordered={false} className="h-full border border-blue-900 bg-blue-950/20">
                                                <div className="flex items-start gap-3">
                                                    <RobotOutlined className="text-2xl text-brand-primary mt-1 shadow-glow" />
                                                    <div className="text-sm text-gray-300 leading-relaxed font-mono relative min-h-[300px]">
                                                        <p className="mb-2"><strong>分析报告：</strong>基于时变工况特征与深度网络判定，分析判定 {activeTask.device} 的 {activeTask.key === '0' ? '输入轴轴承外圈出现明显局部剥落故障，伴有轴向高频冲击调制。' : activeTask.key === '1' ? '一级小齿轮出现断齿裂纹演化趋势，伴有强烈冲击。' : '二级大齿轮出现齿面综合点蚀，包含高频调制。'}</p>
                                                        <p className="mb-2 mt-4 text-brand-warning"><strong>建议方案：</strong></p>
                                                        <ul className="list-disc pl-4 space-y-2 mb-2 text-gray-400">
                                                            <li>申请开盖窗口，使用专业内窥镜进行齿根及轴承检查。</li>
                                                            <li>开展润滑油铁谱分析，量化微粒剥落。</li>
                                                            <li>若内窥镜和油液分析后发现异常，建议取下输入轴轴承进行深入检查以及更换</li>
                                                            <li>建议及时提交对应部位的备件库申领单。</li>
                                                        </ul>
                                                        <p className="text-xs text-brand-primary absolute bottom-0 right-0 w-full text-right pt-2 border-t border-blue-900/50">生成源: 本地私有化领域大模型</p>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }
                ]}
            />
        </div>
    );
};

export default FaultDiagnosis;
