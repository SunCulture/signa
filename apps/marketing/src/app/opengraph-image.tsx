import { ImageResponse } from "next/og";

export const alt = "Signa document signing infrastructure";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "#ffffff",
          color: "#16304f",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(110deg, #d9eaf5 0%, #9be3c8 58%, #ef7d52 100%)",
            bottom: "-90px",
            display: "flex",
            height: "360px",
            left: "-80px",
            position: "absolute",
            transform: "rotate(-7deg)",
            width: "1400px",
          }}
        />
        <div style={{ display: "flex", fontSize: 36, fontWeight: 800 }}>
          Signa
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "940px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-4px",
              lineHeight: 0.98,
            }}
          >
            Document signing infrastructure you can own
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 500,
              marginTop: 28,
            }}
          >
            Build, send, embed, and verify trusted signing workflows.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
