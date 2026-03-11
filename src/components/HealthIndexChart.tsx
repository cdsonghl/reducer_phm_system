import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const START_DATE = new Date('2025-07-01');

// seededRand: 基于 index+seed 的伪随机，保证每次渲染不变
function seededRand(i: number, seed: number) {
    const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x); // 0~1
}

// 生成带波动的静态健康数据
// healthDrop: 整体下移（设备1=0，设备2=更大）
// seed: 不同设备用不同种子，波形不同
function makeData(healthDrop: number, seed: number) {
    // 基准趋势：从100缓慢下降，终值50+左右
    const base = [
        100, 98.5, 96.8, 94.9, 92.6, 90.0, 87.1, 84.0, 80.6, 77.0,
        73.3, 69.5, 65.8, 62.2, 58.8, 55.7, 53.0, 51.0, 49.5, 48.8,
    ];

    return base.map((v, i) => {
        // 加入 ±3 的随机波动
        const noise = (seededRand(i, seed) - 0.5) * 6;
        const value = Math.min(100, Math.max(0, v - healthDrop + noise));
        const d = new Date(START_DATE);
        d.setDate(d.getDate() + i * 10);
        const time = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { time, value: +value.toFixed(1) };
    });
}

interface Props {
    healthDrop?: number;
    seed?: number;
}

export const HealthIndexChart = ({ healthDrop = 0, seed = 1 }: Props) => {
    const data = useMemo(() => makeData(healthDrop, seed), [healthDrop, seed]);

    const option = useMemo(() => ({
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        grid: { left: '4%', right: '4%', bottom: '14%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(i => i.time),
            axisLine: { lineStyle: { color: '#9ca3af' } },
            axisLabel: { rotate: 30, color: '#9ca3af', fontSize: 10, interval: 4 }
        },
        yAxis: {
            type: 'value', min: 0, max: 100,
            axisLine: { lineStyle: { color: '#9ca3af' } },
            splitLine: { lineStyle: { color: '#374151' } }
        },
        visualMap: {
            top: 5, right: 5,
            pieces: [
                { gte: 60, lte: 100, color: '#52c41a' },  // 绿
                { gte: 20, lt: 60, color: '#faad14' },  // 黄
                { gte: 0, lt: 20, color: '#f5222d' },  // 红
            ],
            outOfRange: { color: '#999' }
        },
        series: [{
            name: '健康评估指标',
            type: 'line',
            smooth: true,
            symbol: 'none',
            data: data.map(i => i.value),
            markLine: {
                silent: true,
                data: [
                    { yAxis: 60, lineStyle: { color: '#faad14', type: 'dashed' } },
                    { yAxis: 20, lineStyle: { color: '#f5222d', type: 'dashed' } },
                ],
                label: { color: '#9ca3af', fontSize: 10 },
            },
            areaStyle: { opacity: 0.12 }
        }]
    }), [data]);

    return (
        <div className="w-full h-full min-h-[220px]">
            <ReactECharts option={option} style={{ height: '100%', minHeight: 220 }} notMerge lazyUpdate />
        </div>
    );
};
