import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #1f8f5f 0%, #0a4f33 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 124,
            height: 124,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 30%, #ffffff 0%, #fde07a 55%, #f5b400 100%)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
            border: "6px solid #ffffff",
          }}
        >
          <div
            style={{
              fontFamily: "system-ui",
              fontSize: 76,
              fontWeight: 800,
              color: "#0f6f48",
              letterSpacing: -2,
            }}
          >
            D
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
