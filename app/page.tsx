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
      <p style={{ fontSize: 22 }}>
        <strong>DIP is a decision-integrity protocol for evaluating whether a
        proposed action is authorized under defined standing, authority,
        warrants, constraints, and requested force. It returns a verifiable
        decision receipt.</strong>
      </p>
      <p style={{ fontSize: 19 }}>
        <strong>DIP does not grant authority.</strong> It evaluates whether
        asserted authority supports a specific proposed transition.
      </p>
      <hr style={{ margin: "40px 0" }} />
      <p>
        This public surface defines what an evaluation accepts, what it may
        return, the rules and limits that govern the result, the identity of the
        RC1 release, and how to verify that a result was officially issued by
        Wheeler Hubbell Publishing, Inc.
      </p>
      <p>
        It does <strong>not</strong> publish the evaluator implementation,
        canonical executable evaluator, private signing keys, payment
        configuration, deployment credentials, or private operational controls.
      </p>
      <p>
        <strong>Protocol:</strong> <a href="https://github.com/wheelerhubbell/DIP/blob/main/PROTOCOL.md">PROTOCOL.md</a>
      </p>
      <p>
        <strong>Evaluation input contract:</strong>{" "}
        <a href="/evaluation-input.schema.json">/evaluation-input.schema.json</a>
      </p>
      <p>
        <strong>Official result contract:</strong>{" "}
        <a href="/official-result.schema.json">/official-result.schema.json</a>
      </p>
      <p>
        <strong>Verification-key registry:</strong>{" "}
        <a href="/.well-known/whp-dip-keys.json">
          /.well-known/whp-dip-keys.json
        </a>
      </p>
      <p style={mono}>
        RC1 SHA-256: 6a73d326d071c8c297609b74a55f4bf6328012ff446ac83cc58fb9a6374c6263
      </p>
      <hr style={{ margin: "40px 0" }} />
      <p>
        <strong>Execution status:</strong> the production execution service is
        separate from this repository and is not represented as active until its
        private evaluator runtime, signing identity, settlement configuration,
        and verification path are actually provisioned and verified.
      </p>
      <p>
        An evaluation does not replace law, human judgment, organizational
        governance, or external authority. It does not issue a WHP Standing
        Mark, legal certification, safety certification, or universal truth
        verdict merely by running.
      </p>
    </main>
  );
}
