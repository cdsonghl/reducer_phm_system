import { useEffect, Suspense, useState, useMemo, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';

export type HighlightPart = {
    name: string;
    label: string;
    color: string;
    severity: 'warning' | 'critical';
};

// 默认高亮配置（设备1）
export const DEFAULT_HIGHLIGHT_PARTS: HighlightPart[] = [
    { name: '低速轴-大齿轮-2', label: '二级大齿轮', color: '#f5222d', severity: 'critical' },
];

// 设备2 高亮配置（不同故障部位）
export const DEVICE2_HIGHLIGHT_PARTS: HighlightPart[] = [
    { name: '低速轴-小齿轮-2', label: '一级小齿轮', color: '#f5222d', severity: 'critical' },
];

// 需要半透明化的零件名称（精确匹配或前缀匹配）
const TRANSLUCENT_PART_NAMES = [
    '中速轴端盖-闷盖-3',
    '低速轴端盖-闷盖-2',
    '低速轴端盖-透盖-2',
    '中速轴端盖-闷盖-4',
    '高速轴端盖-闷盖-2',
    '高速轴端盖-透盖-2',
    '窥视盖-1',
    '放油螺塞-1',
    '通气孔-1',
];

interface ReducerModelProps { highlightParts: HighlightPart[]; }

function ReducerModel({ highlightParts }: ReducerModelProps) {
    const { scene: rawScene } = useGLTF('/reducer.glb');
    // 克隆场景，避免两个实例共用同一对象造成材质相互覆盖
    const scene = useMemo(() => rawScene.clone(true), [rawScene]);

    useEffect(() => {
        scene.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;

            const partConfig = highlightParts.find(p => p.name === obj.name);

            if (partConfig) {
                // 故障高亮部件
                obj.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(partConfig.color),
                    emissive: new THREE.Color(partConfig.color),
                    emissiveIntensity: 0.5,
                    metalness: 0.6,
                    roughness: 0.3,
                    transparent: true,
                    opacity: 0.9,
                });
            } else if (obj.name.includes('螺栓') || TRANSLUCENT_PART_NAMES.some(n => obj.name.includes(n))) {
                // 指定零件及所有螺栓：半透明化
                obj.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color('#aac0d6'),
                    metalness: 0.4,
                    roughness: 0.5,
                    transparent: true,
                    opacity: 0.25,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                });
            } else if (obj.name === '上箱体1-2') {
                // 上箱体虚化——半透明玻璃效果
                obj.material = new THREE.MeshPhysicalMaterial({
                    color: new THREE.Color('#88aacc'),
                    metalness: 0.1,
                    roughness: 0.05,
                    transmission: 0.85,
                    thickness: 1.5,
                    transparent: true,
                    opacity: 0.18,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                });
            } else {
                // 普通部件 — 工业金属灰
                const original = Array.isArray(obj.material) ? obj.material[0] : obj.material;
                obj.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color('#7a8fa8'),
                    metalness: 0.65,
                    roughness: 0.45,
                    map: (original as THREE.MeshStandardMaterial)?.map ?? null,
                });
            }

            obj.castShadow = true;
            obj.receiveShadow = true;
        });
    }, [scene, highlightParts]);

    const highSpeedParts = useRef<THREE.Object3D[]>([]);
    const midSpeedParts = useRef<THREE.Object3D[]>([]);
    const lowSpeedParts = useRef<THREE.Object3D[]>([]);

    // Z_AXIS 作为传动中心线
    const Z_AXIS = useMemo(() => new THREE.Vector3(0, 0, 1), []);

    useEffect(() => {
        const high: THREE.Object3D[] = [];
        const mid: THREE.Object3D[] = [];
        const low: THREE.Object3D[] = [];

        scene.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            const n = obj.name;

            // 排除外壳、螺栓、端盖等静止密封件
            if (n.includes('箱体') || n.includes('螺母') || n.includes('垫圈') || n.includes('螺塞') ||
                n.includes('窥视盖') || n.includes('通气孔') || n.includes('端盖') || n.includes('M') || n.includes('washers')) {
                return;
            }

            if (n.includes('高速')) {
                high.push(obj);
            } else if (n.includes('中间') || n.includes('小齿轮') || n.includes('12-8-40')) {
                mid.push(obj);
            } else if (n.includes('低速') || n.includes('16-10-63') || n.includes('12-8-70')) {
                low.push(obj);
            }
        });

        highSpeedParts.current = high;
        midSpeedParts.current = mid;
        lowSpeedParts.current = low;
    }, [scene]);

    useFrame((_, delta) => {
        // 沿所有传动件统一的中心轴（世界Z轴）旋转，避免几何坐标翻滚
        highSpeedParts.current.forEach(obj => {
            obj.rotateOnWorldAxis(Z_AXIS, delta * 4);
        });
        midSpeedParts.current.forEach(obj => {
            obj.rotateOnWorldAxis(Z_AXIS, -delta * 1.5);
        });
        lowSpeedParts.current.forEach(obj => {
            obj.rotateOnWorldAxis(Z_AXIS, delta * 0.5);
        });
    });

    return <primitive object={scene} dispose={null} />;
}

function CameraSetup() {
    const { camera } = useThree();
    useEffect(() => {
        camera.position.set(0.4, 0.25, 0.7);
    }, [camera]);
    return null;
}

interface DigitalTwinProps {
    highlightParts?: HighlightPart[];
    compact?: boolean; // 紧凑模式（减小图例字号）
}

export default function DigitalTwin({ highlightParts = DEFAULT_HIGHLIGHT_PARTS, compact = false }: DigitalTwinProps) {
    const [ready, setReady] = useState(false);

    return (
        <div className="relative w-full h-full min-h-[280px] rounded-lg overflow-hidden">
            {/* 图例面板 */}
            <div className="absolute top-2 left-2 z-10 space-y-1 pointer-events-none">
                {highlightParts.map(p => (
                    <div
                        key={p.name}
                        className="flex items-center gap-1.5 bg-black/65 backdrop-blur-sm px-2 py-0.5 rounded text-xs"
                    >
                        <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                                backgroundColor: p.color,
                                boxShadow: `0 0 5px ${p.color}`,
                                animation: p.severity === 'critical' ? 'pulse 1.5s infinite' : 'none',
                            }}
                        />
                        <span className={`text-gray-300 ${compact ? 'text-[10px]' : 'text-xs'}`}>{p.label}</span>
                        <span
                            className="ml-0.5 px-1 rounded text-[9px] font-medium"
                            style={{ backgroundColor: p.color + '28', color: p.color }}
                        >
                            {p.severity === 'critical' ? '异常' : '预警'}
                        </span>
                    </div>
                ))}
            </div>

            {/* 操作提示 */}
            <div className="absolute bottom-1.5 right-2 z-10 text-[10px] text-gray-500 bg-black/50 px-1.5 py-0.5 rounded pointer-events-none">
                左键旋转 · 滚轮缩放
            </div>

            {!ready && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-950">
                    <div className="text-blue-400 text-sm animate-pulse">正在加载模型...</div>
                </div>
            )}

            <Canvas
                shadows
                gl={{ antialias: true }}
                style={{ background: 'linear-gradient(145deg, #070c18 0%, #0d1828 100%)', width: '100%', height: '100%' }}
                onCreated={() => setReady(true)}
            >
                <CameraSetup />
                <ambientLight intensity={0.6} />
                <directionalLight position={[4, 8, 4]} intensity={1.5} castShadow />
                <directionalLight position={[-3, 2, -4]} intensity={0.4} color="#5599ff" />
                <pointLight position={[0, 1, 0]} intensity={0.5} />

                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={0.15}
                    maxDistance={4}
                    autoRotate
                    autoRotateSpeed={0.5}
                />

                <Suspense fallback={
                    <Html center>
                        <span className="text-blue-400 text-sm animate-pulse">加载中...</span>
                    </Html>
                }>
                    <ReducerModel highlightParts={highlightParts} />
                    <Environment preset="warehouse" />
                </Suspense>
            </Canvas>
        </div>
    );
}

useGLTF.preload('/reducer.glb');
