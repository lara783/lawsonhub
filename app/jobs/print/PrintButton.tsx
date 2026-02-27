"use client"

export function PrintButton() {
  return (
    <button
      className="btn"
      onClick={() => window.print()}
      style={{
        background: "#1B4F72",
        color: "white",
        border: "none",
        padding: "8px 16px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "13px",
        fontFamily: "Georgia, serif",
      }}
    >
      🖨️ Print / Save PDF
    </button>
  )
}
