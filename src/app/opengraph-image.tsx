import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DinkMap — NYC public pickleball court crowd map";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          background:
            "linear-gradient(135deg, #f4faf6 0%, #e0f1e6 60%, #cfe9d6 100%)",
          fontFamily: "system-ui",
          color: "#0e2e26",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(90deg, rgba(15,111,72,0.07) 1px, transparent 1px), linear-gradient(0deg, rgba(15,111,72,0.07) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18, zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 20,
              background: "linear-gradient(180deg, #1f8f5f, #0f6f48)",
              boxShadow: "0 12px 30px rgba(15,111,72,0.35)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 35% 30%, #ffffff 0%, #fde07a 55%, #f5b400 100%)",
                border: "4px solid #ffffff",
                display: "flex",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: -1,
              display: "flex",
            }}
          >
            DinkMap
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.04,
              maxWidth: 980,
              display: "flex",
            }}
          >
            Find the busiest NYC pickleball courts.
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#3d5a52",
              maxWidth: 900,
              display: "flex",
            }}
          >
            Live-ish crowd reads from weather, time, and verified court-side reports.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 36,
            zIndex: 1,
          }}
        >
          {[
            { label: "Low", color: "#19b86a" },
            { label: "Moderate", color: "#f4bf35" },
            { label: "Busy", color: "#ff7b39" },
            { label: "Packed", color: "#e63f5f" },
          ].map((tag) => (
            <div
              key={tag.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(15,46,38,0.08)",
                fontSize: 24,
                fontWeight: 600,
                color: "#0e2e26",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: tag.color,
                  display: "flex",
                }}
              />
              {tag.label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
