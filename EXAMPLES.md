# DIP Public Examples

These examples explain the observable DIP contract. They are **illustrative and unofficial**. They do not contain a WHP signature, do not establish that a production execution service is active, and are not substitutes for the complete input schema.

## Example A — authorized advisory transition

### Declared state

A customer report is admitted as a primary source for a named account. Its standing is bounded to that account, attributed to the customer, explicitly unverified, and currently capable of `INFORM` force.

A declared policy permits an identified adjudicator to promote that submitted report into advisory review input. A current warrant is supplied that:

- identifies the same policy and policy version;
- applies to the same account target;
- applies in the same fraud-review jurisdiction;
- authorizes changes to the relevant authority and operation-capability dimensions; and
- permits force no greater than `RECOMMEND`.

The proposed transition changes the report from `SUBMITTED` to `ADVISORY` and expands operation-specific capability from `INFORM` to `INFORM + RECOMMEND`. The material changes cite the warrant. The requesting actor separately carries permission to request `RECOMMEND` in the fraud-review jurisdiction.

### Requested force

```json
{
  "requestedForce": "RECOMMEND",
  "againstTarget": "account:123",
  "inJurisdiction": "fraud-review",
  "purpose": "Recommend manual review"
}
```

### Observable result

```json
{
  "resultClass": "AUTHORIZED",
  "grantedForce": "RECOMMEND",
  "requestedForce": "RECOMMEND",
  "halts": []
}
```

The result is bounded. It authorizes only the represented `RECOMMEND` force under the supplied configuration. It does not establish that the customer report is true, authorize stronger action, or create authority outside the identified target and jurisdiction.

## Example B — actor permission without informational authority

Use the same actor permission, but do **not** establish informational standing capable of `CONSTRAIN` force. Then request:

```json
{
  "requestedForce": "CONSTRAIN",
  "againstTarget": "account:123",
  "inJurisdiction": "fraud-review"
}
```

An actor's permission to request or perform an operation does not itself elevate the information supporting that operation.

### Observable result

```json
{
  "resultClass": "DENIED",
  "grantedForce": null,
  "haltReason": "ACTOR_PERMISSION_WITHOUT_INFORMATIONAL_AUTHORITY"
}
```

That denial means only that **this proposed force is unsupported by this informational standing under this configuration**. It is not a judgment that the actor, account, report, or every possible future transition is globally invalid.

## Complete machine contract

A production caller must construct the complete request defined by:

`public/evaluation-input.schema.json`

A returned official result must satisfy:

`public/official-result.schema.json`

and the independent verification procedure in:

`OFFICIAL_RESULT_VERIFICATION.md`
