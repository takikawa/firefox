// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

// Worker coordination code, see atomicity.js.
let COORD_BUSY = 0;
let COORD_NUMLOC = 1;
let COORD_DID_ERROR = 2;
let COORD_DONE = 3;

let coord = new Int32Array(new SharedArrayBuffer((COORD_DONE+1)*4));

function spawn(text) {
    text = `
var _coord = new Int32Array(getSharedObject());
Atomics.store(_coord, ${COORD_BUSY}, 0);
function receive() {
  while (!Atomics.load(_coord, ${COORD_BUSY}) &&
         !Atomics.load(_coord, ${COORD_DID_ERROR}))
      ;
  let x = getSharedObject();
  Atomics.store(_coord, ${COORD_BUSY}, 0);
  return x;
}
` + text;
    setSharedObject(coord.buffer);
    Atomics.store(coord, COORD_BUSY, 1);
    evalInWorker(text);
    while (Atomics.load(coord, COORD_BUSY))
        ;
}

function send(x) {
  while(Atomics.load(coord, COORD_BUSY) &&
        !Atomics.load(coord, COORD_DID_ERROR));
      ;
  setSharedObject(x);
  Atomics.store(coord, COORD_BUSY, 1);
  while(Atomics.load(coord, COORD_BUSY) &&
        !Atomics.load(coord, COORD_DID_ERROR));
      ;
}

// Test shared memory operations with workers.
let text = `(module
  (memory (export "memory") 1 64 shared (pagesize 1))
  (func (export "c") (result i32) memory.size)
  (func (export "g") (result i32) (memory.grow (i32.const 31)))
  (func (export "l8") (param i32) (result i32) (i32.load8_u (local.get 0)))
  (func (export "l16") (param i32) (result i32) (i32.load16_u (local.get 0)))
  (func (export "l32") (param i32) (result i32) (i32.load (local.get 0)))
  (func (export "l64") (param i32) (result i64) (i64.load (local.get 0)))
  (func (export "s") (param i32) (param i32) (i32.store (local.get 0) (local.get 1))))`;

let mod = new WebAssembly.Module(wasmTextToBinary(text));
let ins = new WebAssembly.Instance(mod);
let exp = ins.exports;
let mem = exp.memory;

spawn(`
  function assertErrorMessage(thunk, type, msg) {
    try {
      thunk();
    } catch (e) {
      assertEq(true, e instanceof type);
      assertEq(e.message, msg);
      return;
    }
    throw(new Error("did not throw"));
  }

  try {
    let mod = new WebAssembly.Module(wasmTextToBinary(\`
      (module
        (memory (import "env" "memory") 1 64 shared (pagesize 1))
        (func (export "c") (result i32) memory.size)
        (func (export "l8") (param i32) (result i32) (i32.load8_u (local.get 0)))
        (func (export "l16") (param i32) (result i32) (i32.load16_u (local.get 0)))
        (func (export "l32") (param i32) (result i32) (i32.load (local.get 0)))
        (func (export "l64") (param i32) (result i64) (i64.load (local.get 0)))
        (func (export "s") (param i32) (param i32) (i32.store (local.get 0) (local.get 1))))
    \`));

    let imports = {env: {memory: receive()}};
    let instance = new WebAssembly.Instance(mod, imports);
    assertEq(instance.exports.c(), 1);
    assertEq(instance.exports.l8(0), 0);
    assertErrorMessage(() => instance.exports.l8(1),
                       WebAssembly.RuntimeError,
                       "index out of bounds");

    // Tell main thread to do a memory.grow.
    receive();
    // Wait for grow to finish.
    receive();

    // Size & bounds should be updated.
    assertEq(instance.exports.c(), 32);
    assertEq(instance.exports.l8(1), 0);
    assertEq(instance.exports.l8(31), 0);
    assertEq(instance.exports.l16(30), 0);
    assertEq(instance.exports.l32(28), 0);
    assertEq(instance.exports.l64(24), 0n);
    assertErrorMessage(() => instance.exports.l8(32),
                       WebAssembly.RuntimeError,
                       "index out of bounds");
    assertErrorMessage(() => instance.exports.l16(31),
                       WebAssembly.RuntimeError,
                       "index out of bounds");
    assertErrorMessage(() => instance.exports.l32(29),
                       WebAssembly.RuntimeError,
                       "index out of bounds");
    assertErrorMessage(() => instance.exports.l64(25),
                       WebAssembly.RuntimeError,
                       "index out of bounds");
    assertErrorMessage(() => instance.exports.l8(64),
                       WebAssembly.RuntimeError,
                       "index out of bounds");

    // Grow again
    receive();
    receive();

    assertEq(instance.exports.c(), 63);
    assertEq(instance.exports.l8(62), 0);
    assertEq(instance.exports.l16(61), 0);
    assertEq(instance.exports.l32(58), 0);
    assertEq(instance.exports.l64(54), 0n);
    assertErrorMessage(() => instance.exports.l8(63),
                       WebAssembly.RuntimeError,
                       "index out of bounds");
    assertErrorMessage(() => instance.exports.l16(62),
                       WebAssembly.RuntimeError,
                       "index out of bounds");
    assertErrorMessage(() => instance.exports.l32(60),
                       WebAssembly.RuntimeError,
                       "index out of bounds");
    assertErrorMessage(() => instance.exports.l64(56),
                       WebAssembly.RuntimeError,
                       "index out of bounds");
  } catch (e) {
    print(e.message);
    Atomics.store(_coord, ${COORD_DID_ERROR}, 1);
  }

  Atomics.store(_coord, ${COORD_DONE}, 1);
`);

try {
  // Send shared memory to worker.
  send(mem);

  // Check size & access.
  assertEq(exp.c(), 1);
  assertEq(exp.l8(0), 0);
  assertErrorMessage(() => exp.l8(1),
                     WebAssembly.RuntimeError,
                     "index out of bounds");

  // Coordinate on testing pre/post-grow
  send(1);
  exp.g();
  send(1);

  // Check size & bound after grow.
  assertEq(exp.c(), 32);
  assertEq(exp.l8(1), 0);
  assertEq(exp.l8(31), 0);
  assertEq(exp.l16(30), 0);
  assertEq(exp.l32(27), 0);
  assertEq(exp.l64(23), 0n);
  assertErrorMessage(() => exp.l8(32),
                     WebAssembly.RuntimeError,
                     "index out of bounds");
  assertErrorMessage(() => exp.l16(31),
                     WebAssembly.RuntimeError,
                     "index out of bounds");
  assertErrorMessage(() => exp.l32(29),
                     WebAssembly.RuntimeError,
                     "index out of bounds");
  assertErrorMessage(() => exp.l64(25),
                     WebAssembly.RuntimeError,
                     "index out of bounds");
  assertErrorMessage(() => exp.l8(64),
                     WebAssembly.RuntimeError,
                     "index out of bounds");

  send(1);
  exp.g();
  send(1);

  // Check size & bound after 2nd grow.
  assertEq(exp.c(), 63);
  assertEq(exp.l8(62), 0);
  assertEq(exp.l16(61), 0);
  assertEq(exp.l32(58), 0);
  assertEq(exp.l64(54), 0n);
  assertErrorMessage(() => exp.l8(63),
                     WebAssembly.RuntimeError,
                     "index out of bounds");
  assertErrorMessage(() => exp.l16(62),
                     WebAssembly.RuntimeError,
                     "index out of bounds");
  assertErrorMessage(() => exp.l32(60),
                     WebAssembly.RuntimeError,
                     "index out of bounds");
  assertErrorMessage(() => exp.l64(56),
                     WebAssembly.RuntimeError,
                     "index out of bounds");
  assertErrorMessage(() => exp.l8(64),
                     WebAssembly.RuntimeError,
                     "index out of bounds");

  // Can't grow again
  assertEq(exp.g(), -1);

  // Wait for worker to finish.
  while (!Atomics.load(coord, COORD_DONE)) { }
  assertEq(Atomics.load(coord, COORD_DID_ERROR), 0);
} catch (e) {
  // Unblock worker if we errored.
  Atomics.store(coord, COORD_DID_ERROR, 1);
  throw e;
}
