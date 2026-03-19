export type HighlightPart = {
  name: string;
  label: string;
  color: string;
  severity: "warning" | "critical";
};

// Default highlight configuration (device A)
export const DEFAULT_HIGHLIGHT_PARTS: HighlightPart[] = [
  { name: "低速轴-大齿轮-2", label: "二级大齿轮", color: "#f5222d", severity: "critical" },
];

// Device B uses a different fault highlight target
export const DEVICE2_HIGHLIGHT_PARTS: HighlightPart[] = [
  { name: "低速轴-小齿轮-2", label: "一级小齿轮", color: "#f5222d", severity: "critical" },
];
