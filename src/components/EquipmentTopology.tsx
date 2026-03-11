import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

export const EquipmentTopology = () => {
    const option = useMemo(() => {
        return {
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c}'
            },
            series: [
                {
                    type: 'graph',
                    layout: 'none',
                    symbolSize: 50,
                    roam: true,
                    label: {
                        show: true,
                        position: 'bottom',
                        color: '#e5e7eb'
                    },
                    edgeSymbol: ['circle', 'arrow'],
                    edgeSymbolSize: [4, 10],
                    edgeLabel: {
                        fontSize: 12
                    },
                    data: [
                        { name: '输入轴', x: 0, y: 150, itemStyle: { color: '#52c41a' }, symbolSize: 60 },
                        { name: '第一级太阳轮', x: 200, y: 150, itemStyle: { color: '#52c41a' } },
                        { name: '第一级行星轮', x: 200, y: 50, itemStyle: { color: '#faad14' } }, // 模拟预警态
                        { name: '第一级内齿圈', x: 200, y: 250, itemStyle: { color: '#52c41a' } },
                        { name: '第二级太阳轮', x: 400, y: 150, itemStyle: { color: '#52c41a' } },
                        { name: '第二级行星轮阶段', x: 400, y: 50, itemStyle: { color: '#f5222d' }, symbolSize: 70 }, // 模拟故障态
                        { name: '输出轴', x: 600, y: 150, itemStyle: { color: '#52c41a' }, symbolSize: 60 }
                    ],
                    links: [
                        { source: '输入轴', target: '第一级太阳轮' },
                        { source: '第一级太阳轮', target: '第一级行星轮' },
                        { source: '第一级太阳轮', target: '第一级内齿圈' },
                        { source: '第一级太阳轮', target: '第二级太阳轮' },
                        { source: '第二级太阳轮', target: '第二级行星轮阶段' },
                        { source: '第二级太阳轮', target: '输出轴' },
                    ],
                    lineStyle: {
                        opacity: 0.9,
                        width: 2,
                        curveness: 0.2,
                        color: '#9ca3af'
                    }
                }
            ]
        };
    }, []);

    return (
        <div className="w-full h-full min-h-[300px]">
            <ReactECharts option={option} className="w-full h-full" />
        </div>
    );
};
