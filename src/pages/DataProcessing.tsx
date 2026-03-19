import { useState, useEffect, useMemo } from 'react';
import { Card, Form, Select, Switch, Button, notification } from 'antd';
import ReactECharts from 'echarts-for-react';

const { Option } = Select;

// 特征值配置：baseVal = 原始信号基准，denoiseOffset = 去噪后偏移
const FEATURES = [
    { key: 'rms', label: 'RMS（均方根值）', unit: 'g', baseVal: 0.85, rawNoise: 0.18, smoothK: 0.15 },
    { key: 'p2p', label: '峰峰值', unit: 'g', baseVal: 2.40, rawNoise: 0.55, smoothK: 0.40 },
    { key: 'energy', label: '绝对能量', unit: 'J', baseVal: 12.5, rawNoise: 2.50, smoothK: 1.80 },
];

function nowTimeStr() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

const MAX_POINTS = 60;

type DataPoint = { time: string; raw: number; denoised: number };

function makeInitData(baseVal: number, rawNoise: number, smoothK: number): DataPoint[] {
    return Array.from({ length: 20 }).map((_, i) => {
        const d = new Date(Date.now() - (20 - i) * 2000);
        const raw = baseVal + (Math.random() - 0.5) * rawNoise * 2;
        const denoised = baseVal + (Math.random() - 0.5) * smoothK * 2;
        return { time: d.toLocaleTimeString('zh-CN', { hour12: false }), raw, denoised };
    });
}

const DataProcessing = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [selectedFeature, setSelectedFeature] = useState<string>('rms');

    const featureCfg = FEATURES.find(f => f.key === selectedFeature) ?? FEATURES[0];

    const [streamData, setStreamData] = useState<DataPoint[]>(() =>
        makeInitData(featureCfg.baseVal, featureCfg.rawNoise, featureCfg.smoothK)
    );

    const handleFeatureChange = (nextFeature: string) => {
        setSelectedFeature(nextFeature);
        const nextCfg = FEATURES.find(f => f.key === nextFeature) ?? FEATURES[0];
        setStreamData(makeInitData(nextCfg.baseVal, nextCfg.rawNoise, nextCfg.smoothK));
    };

    // 每2秒追加新数据点
    useEffect(() => {
        const timer = setInterval(() => {
            setStreamData(prev => {
                const base = featureCfg.baseVal;
                const raw = base + (Math.random() - 0.5) * featureCfg.rawNoise * 2;
                const denoised = base + (Math.random() - 0.5) * featureCfg.smoothK * 2;
                const next = prev.length >= MAX_POINTS ? prev.slice(1) : prev;
                return [...next, { time: nowTimeStr(), raw, denoised }];
            });
        }, 2000);
        return () => clearInterval(timer);
    }, [featureCfg]);

    const chartOption = useMemo(() => ({
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: {
            data: ['原始值', '去噪后'],
            textStyle: { color: '#9ca3af' },
            bottom: 0,
        },
        grid: { left: '4%', right: '4%', bottom: '14%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: streamData.map(d => d.time),
            axisLine: { lineStyle: { color: '#9ca3af' } },
            axisLabel: { color: '#9ca3af', fontSize: 10, rotate: 30, interval: 4 },
        },
        yAxis: {
            type: 'value',
            name: featureCfg.unit,
            nameTextStyle: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: '#9ca3af' } },
            splitLine: { lineStyle: { color: '#374151' } },
        },
        series: [
            {
                name: '原始值',
                type: 'line',
                symbol: 'none',
                smooth: false,
                lineStyle: { color: '#6b7280', type: 'dashed', width: 1.5 },
                itemStyle: { color: '#6b7280' },
                data: streamData.map(d => +d.raw.toFixed(4)),
            },
            {
                name: '去噪后',
                type: 'line',
                symbol: 'none',
                smooth: true,
                lineStyle: { color: '#1890ff', width: 2 },
                itemStyle: { color: '#1890ff' },
                areaStyle: { color: '#1890ff', opacity: 0.07 },
                data: streamData.map(d => +d.denoised.toFixed(4)),
            },
        ],
    }), [streamData, featureCfg]);

    const handleApply = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            notification.success({
                message: '流处理配置已下发',
                description: 'Flink 窗口计算队列已更新，新特征提取策略生效。',
            });
        }, 1200);
    };

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-brand-primary">数据预处理与特征工程引擎</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 左侧：参数配置 */}
                <Card title="流处理窗口与去噪策略参数" className="h-full">
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{ windowSize: 1024, algorithm: 'wavelet', removeAnomaly: true }}
                    >
                        <Form.Item label="滑动计算窗口大小 (Sliding Window)" name="windowSize">
                            <Select>
                                <Option value={512}>512 pts</Option>
                                <Option value={1024}>1024 pts</Option>
                                <Option value={2048}>2048 pts</Option>
                                <Option value={4096}>4096 pts</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item label="数据去噪算法库" name="algorithm">
                            <Select>
                                <Option value="ma">1. 滑动平均法 (MA)</Option>
                                <Option value="sg">2. Savitzky-Golay 滤波</Option>
                                <Option value="svd">3. 奇异值分解去噪</Option>
                                <Option value="wavelet">4. 小波多尺度去噪 (Wavelet)</Option>
                                <Option value="emd">5. 经验模态分解 (EMD)</Option>
                                <Option value="eemd">6. 集成经验模态分解 (EEMD)</Option>
                            </Select>
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="异常极值裁切" name="removeAnomaly" valuePropName="checked">
                                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                            </Form.Item>
                            <Form.Item label="31项统计特征集联算" name="calcFeatures" valuePropName="checked">
                                <Switch defaultChecked checkedChildren="运行" unCheckedChildren="挂起" />
                            </Form.Item>
                        </div>

                        <Button type="primary" onClick={handleApply} loading={loading} className="w-full">
                            重置 Flink 实时算子拓扑
                        </Button>
                    </Form>
                </Card>

                {/* 右侧：实时特征值图表（占2列） */}
                <Card
                    title="特征值实时趋势（原始 vs 去噪，每2秒更新）"
                    className="h-full lg:col-span-2"
                    extra={
                        <Select
                            value={selectedFeature}
                            onChange={handleFeatureChange}
                            style={{ width: 160 }}
                            size="small"
                        >
                            {FEATURES.map(f => (
                                <Option key={f.key} value={f.key}>{f.label}</Option>
                            ))}
                        </Select>
                    }
                >
                    <ReactECharts
                        option={chartOption}
                        style={{ height: 340 }}
                        notMerge={true}
                        lazyUpdate={true}
                    />
                </Card>
            </div>
        </div>
    );
};

export default DataProcessing;
