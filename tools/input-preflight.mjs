import inputSchema from "../public/evaluation-input.schema.json" with { type: "json" };

// Structural validation only. The deployed evaluator decides standing and authority.
// The schema is loaded locally; $id and $schema are identifiers, never network calls.
const own = (value, key) => Object.hasOwn(value, key);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const pointer = (base, key) => `${base}/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`;
const supported = new Set(["$schema", "$id", "title", "description", "$comment", "$defs", "$ref", "type", "required", "properties", "additionalProperties", "items", "enum", "const", "minLength", "pattern", "format"]);
const types = new Set(["null", "boolean", "object", "array", "number", "integer", "string"]);
const scalar = (value) => value === null || ["string", "number", "boolean"].includes(typeof value);

function fail(path, reason, schemaError = false) {
  const error = new Error(`${schemaError ? "Unsupported DIP input schema" : "Invalid DIP input"} at ${JSON.stringify(path)}: ${reason}`);
  error.code = schemaError ? "DIP_INPUT_SCHEMA_UNSUPPORTED" : "DIP_INPUT_INVALID";
  error.path = path;
  error.reason = reason;
  throw error;
}

// Fail at load time if a schema revision introduces an assertion this validator
// does not implement. Never silently weaken a newly published input contract.
function inspect(node, root, path = "") {
  if (!object(node)) fail(path, "schema must be an object", true);
  for (const key of Object.keys(node)) {
    if (!supported.has(key)) fail(pointer(path, key), "unsupported schema keyword", true);
  }
  if (own(node, "type")) {
    const declared = Array.isArray(node.type) ? node.type : [node.type];
    if (!declared.length || declared.some((type) => !types.has(type))) fail(pointer(path, "type"), "unsupported type", true);
  }
  if (own(node, "required") && (!Array.isArray(node.required) || node.required.some((key) => typeof key !== "string"))) fail(pointer(path, "required"), "required must list property names", true);
  if (own(node, "enum") && (!Array.isArray(node.enum) || !node.enum.length || node.enum.some((value) => !scalar(value)))) fail(pointer(path, "enum"), "only nonempty scalar enums are supported", true);
  if (own(node, "const") && !scalar(node.const)) fail(pointer(path, "const"), "only scalar constants are supported", true);
  if (own(node, "minLength") && (!Number.isInteger(node.minLength) || node.minLength < 0)) fail(pointer(path, "minLength"), "minLength must be a nonnegative integer", true);
  if (own(node, "format") && node.format !== "date-time") fail(pointer(path, "format"), "only date-time format is supported", true);
  if (own(node, "pattern")) {
    if (typeof node.pattern !== "string") fail(pointer(path, "pattern"), "pattern must be a regular expression string", true);
    try { new RegExp(node.pattern, "u"); } catch { fail(pointer(path, "pattern"), "invalid regular expression", true); }
  }
  if (own(node, "additionalProperties") && typeof node.additionalProperties !== "boolean") fail(pointer(path, "additionalProperties"), "only boolean additionalProperties is supported", true);
  for (const key of ["properties", "$defs"]) {
    if (!own(node, key)) continue;
    if (!object(node[key])) fail(pointer(path, key), "expected a schema map", true);
    for (const [name, child] of Object.entries(node[key])) inspect(child, root, pointer(pointer(path, key), name));
  }
  if (own(node, "items")) inspect(node.items, root, pointer(path, "items"));
  if (own(node, "$ref")) resolve(node.$ref, pointer(path, "$ref"), root);
}

function resolve(ref, path, root) {
  if (typeof ref !== "string" || !ref.startsWith("#/") || /~(?![01])|%/.test(ref)) fail(path, "only local JSON-pointer references are supported", true);
  let node = root;
  for (const part of ref.slice(2).split("/")) {
    const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
    if (!object(node) || !own(node, key)) fail(path, "unresolved schema reference", true);
    node = node[key];
  }
  if (!object(node)) fail(path, "reference must identify a schema object", true);
  return node;
}

function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return object(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

// Matches the public official-result verifier's timestamp profile, including
// calendar validity and explicit timezone. Leap seconds are not accepted by
// that verifier. This is format validation, not a freshness or authority check.
function validTimestamp(value) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/i.exec(value);
  if (!parts) return false;
  const [, year, month, day, hour, minute, second, offsetHour = 0, offsetMinute = 0] = parts.map((part) => part === undefined ? undefined : Number(part));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  return Number.isFinite(Date.parse(value));
}

function compile(node, root, ancestors = new Set()) {
  if (ancestors.has(node)) fail("", "recursive schema references are unsupported", true);
  const next = new Set(ancestors).add(node);
  const reference = own(node, "$ref") ? compile(resolve(node.$ref, "/$ref", root), root, next) : null;
  const properties = new Map(Object.entries(node.properties ?? {}).map(([key, child]) => [key, compile(child, root, next)]));
  const item = own(node, "items") ? compile(node.items, root, next) : null;
  const declared = own(node, "type") ? (Array.isArray(node.type) ? node.type : [node.type]) : null;
  const pattern = own(node, "pattern") ? new RegExp(node.pattern, "u") : null;
  return (value, path) => {
    if (reference) reference(value, path);
    if (declared && !declared.some((type) => matchesType(value, type))) fail(path, `expected type ${declared.join(" or ")}`);
    if (node.enum && !node.enum.includes(value)) fail(path, "value is not in the allowed enum");
    if (own(node, "const") && value !== node.const) fail(path, "value does not match the required constant");
    if (typeof value === "string") {
      if (own(node, "minLength") && Array.from(value).length < node.minLength) fail(path, "string is shorter than minLength");
      if (pattern && !pattern.test(value)) fail(path, "string does not match the required pattern");
      if (node.format === "date-time" && !validTimestamp(value)) fail(path, "string is not a valid date-time");
    }
    if (object(value)) {
      for (const key of node.required ?? []) {
        if (!own(value, key)) fail(pointer(path, key), "required property is missing");
      }
      for (const key of Object.keys(value)) {
        const child = properties.get(key);
        if (child) child(value[key], pointer(path, key));
        else if (node.additionalProperties === false) fail(pointer(path, key), "additional property is not allowed");
      }
    }
    if (Array.isArray(value) && item) value.forEach((child, index) => item(child, pointer(path, index)));
  };
}

// Reject values JSON.stringify would omit, rewrite, or obtain through getters.
// This does not coerce input, fill fields, or invent a grant of authority.
function requireJson(value, path = "", ancestors = new Set()) {
  if (value === null || ["string", "boolean"].includes(typeof value)) return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (typeof value !== "object" || value === null) fail(path, "expected a finite JSON value");
  if (ancestors.has(value)) fail(path, "cyclic value is not JSON");
  const array = Array.isArray(value);
  if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path, "expected a plain JSON object");
  if (Object.getOwnPropertySymbols(value).length) fail(path, "symbol properties are not JSON");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const next = new Set(ancestors).add(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (array && key === "length") continue;
    if (!own(descriptor, "value") || !descriptor.enumerable) fail(pointer(path, key), "expected an enumerable JSON data property");
    if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)) fail(pointer(path, key), "extra array properties are not JSON");
    requireJson(descriptor.value, pointer(path, key), next);
  }
  if (array && Object.keys(descriptors).length !== value.length + 1) fail(path, "sparse arrays are not JSON");
}

/** Compile the explicitly supported structural subset, failing on other keywords. */
export function compileSchema(schema) {
  inspect(schema, schema);
  const validate = compile(schema, schema);
  return (input) => {
    requireJson(input);
    validate(input, "");
    return input;
  };
}

const validate = compileSchema(inputSchema);

/** Validate locally before payment authorization; return the same untouched input. */
export function validateDipInput(input) {
  return validate(input);
}
