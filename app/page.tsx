const mono = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "72px 24px",
        fontFamily: "Georgia, serif",
        lineHeight: 1.55,
      }}
    >
      <p style={{ ...mono, fontSize: 12, letterSpacing: ".12em" }}>
        WHEELER HUBBELL PUBLISHING, INC.
      </p>
      <h1 style={{ fontSize: 48, lineHeight: 1.05, marginBottom: 16 }}>
        Decision Integrity Protocol
      </h1>
      <p style={{ fontSize: 20 }}>
        A machine-payable execution surface for the sealed DIP v1.0.0-rc.1
        reference evaluator.
      </p>
      <hr style={{ margin: "40px 0" }} />
      <p>
        <strong>Paid endpoint:</strong> <code style={mono}>POST /api/evaluate</code>
      </p>
      <p>
        <strong>Current payment network:</strong> Base Sepolia testnet.
      </p>
      <p>
        <strong>Structural schema:</strong>{" "}
        <a href="/dip-v1.schema.json">/dip-v1.schema.json</a>
      </p>
      <p>
        <strong>Machine-readable rights terms:</strong>{" "}
        <a href="/rsl.xml">/rsl.xml</a>
      </p>
      <p style={mono}>
        RC1 SHA-256: 6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263
      </p>
      <hr style={{ margin: "40px 0" }} />
      <p>
        This surface does not issue a WHP Standing Mark, legal certification,
        safety certification, or universal truth verdict. It returns only the
        bounded result produced by the identified RC1 evaluator for the supplied
        input.
      </p>
    </main>
  );
}
