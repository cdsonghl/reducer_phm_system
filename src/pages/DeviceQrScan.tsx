import { useEffect, useRef, useState } from "react";
import { Button, Card, Input, Space, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";

const SCANNER_ELEMENT_ID = "phm-device-qr-reader";

function parseDeviceIdFromQrContent(content: string): string | null {
  const raw = content.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { device_id?: unknown };
    if (typeof parsed.device_id === "string" && parsed.device_id.trim()) {
      return parsed.device_id.trim();
    }
  } catch {
    // Ignore non-JSON payload.
  }

  const parseUrl = (value: string): string | null => {
    try {
      const url = new URL(value, window.location.origin);
      const deviceId = url.searchParams.get("device_id");
      if (deviceId && deviceId.trim()) {
        return deviceId.trim();
      }
      const matched = url.pathname.match(/\/health\/device\/([^/]+)/i);
      if (matched?.[1]) {
        return decodeURIComponent(matched[1]).trim();
      }
    } catch {
      return null;
    }
    return null;
  };

  const fromUrl = parseUrl(raw);
  if (fromUrl) return fromUrl;

  const fromQuery = raw.match(/(?:\?|&)device_id=([^&]+)/i);
  if (fromQuery?.[1]) {
    return decodeURIComponent(fromQuery[1]).trim();
  }

  if (/^[A-Za-z0-9_-]{2,64}$/.test(raw)) {
    return raw;
  }

  return null;
}

const DeviceQrScan = () => {
  const navigate = useNavigate();
  const [manualInput, setManualInput] = useState("");
  const [lastResult, setLastResult] = useState<string>("");
  const [scannerVersion, setScannerVersion] = useState(0);
  const handledRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const scanner = new Html5QrcodeScanner(
      SCANNER_ELEMENT_ID,
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        rememberLastUsedCamera: true,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        if (!isMounted || handledRef.current) return;
        handledRef.current = true;
        setLastResult(decodedText);

        const deviceId = parseDeviceIdFromQrContent(decodedText);
        if (!deviceId) {
          handledRef.current = false;
          message.error("二维码内容无法识别为设备信息，请使用设备专属二维码");
          return;
        }

        message.success(`已识别设备 ${deviceId}，正在跳转状态页`);
        void scanner
          .clear()
          .catch(() => undefined)
          .finally(() => {
            navigate(`/health?device_id=${encodeURIComponent(deviceId)}`);
          });
      },
      () => {
        // Ignore frame-level parse errors.
      }
    );

    return () => {
      isMounted = false;
      handledRef.current = false;
      void scanner.clear().catch(() => undefined);
    };
  }, [navigate, scannerVersion]);

  const handleManualGo = () => {
    const deviceId = parseDeviceIdFromQrContent(manualInput);
    if (!deviceId) {
      message.error("请输入设备ID或包含 device_id 的状态页链接");
      return;
    }
    navigate(`/health?device_id=${encodeURIComponent(deviceId)}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-primary">扫码查看设备状态</h1>

      <Card bordered={false} title="摄像头扫码">
        <div key={scannerVersion} id={SCANNER_ELEMENT_ID} className="w-full max-w-[520px] min-h-[320px]" />
        <div className="mt-3 flex items-center gap-2">
          <Button
            onClick={() => {
              handledRef.current = false;
              setScannerVersion((v) => v + 1);
            }}
          >
            重新扫描
          </Button>
          <Typography.Text type="secondary">二维码建议包含：/health?device_id=设备ID</Typography.Text>
        </div>
      </Card>

      <Card bordered={false} title="手动输入兜底">
        <Space.Compact className="w-full max-w-[640px]">
          <Input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="输入设备ID，或粘贴二维码内容"
            onPressEnter={handleManualGo}
          />
          <Button type="primary" onClick={handleManualGo}>
            查看状态
          </Button>
        </Space.Compact>
      </Card>

      {lastResult ? (
        <Card bordered={false} title="最近一次识别结果">
          <Typography.Text copyable>{lastResult}</Typography.Text>
        </Card>
      ) : null}
    </div>
  );
};

export default DeviceQrScan;

