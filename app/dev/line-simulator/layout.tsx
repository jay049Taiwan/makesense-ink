export default function LineSimulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#f0f0f0", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {children}
    </div>
  );
}
