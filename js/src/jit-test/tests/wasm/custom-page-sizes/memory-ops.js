// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

// Growing
{
  const configs = [
    { max: "", shared: "" },
    { max: "65536", shared: "" },
    { max: "65536", shared: "shared" },
  ];
  for (const { max, shared } of configs) {
    let instance = wasmEvalText(`(module
      (memory 0 ${max} ${shared} (pagesize 1))
      (func (export "f") (param i32) (result i32)
        (i32.load8_u (local.get 0))
      )
      (func (export "grow") (param i32) (result i32)
        (memory.grow (local.get 0))
      )
      (func (export "size") (param i32) (result i32)
        memory.size 0
      )
    )`);

    assertErrorMessage(() => instance.exports.f(0), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(1000) !== -1, true);
    assertEq(instance.exports.size(), 1000);
    instance.exports.f(0);
    instance.exports.f(999);
    assertErrorMessage(() => instance.exports.f(1000), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(3000) !== -1, true);
    assertEq(instance.exports.size(), 4000);
    instance.exports.f(1000);
    instance.exports.f(3999);
    assertErrorMessage(() => instance.exports.f(4000), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(96) !== -1, true);
    assertEq(instance.exports.size(), 4096);
    instance.exports.f(4000);
    instance.exports.f(4095);
    assertErrorMessage(() => instance.exports.f(4096), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(5904) !== -1, true);
    assertEq(instance.exports.size(), 10000);
    instance.exports.f(4096);
    instance.exports.f(4097);
    instance.exports.f(9999);
    assertErrorMessage(() => instance.exports.f(10000), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(6384) !== -1, true);
    assertEq(instance.exports.size(), 16384);
    instance.exports.f(10000);
    instance.exports.f(16383);
    assertErrorMessage(() => instance.exports.f(16384), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(49152) !== -1, true);
    assertEq(instance.exports.size(), 65536);
    instance.exports.f(16384);
    instance.exports.f(16385);
    instance.exports.f(65535);
    assertErrorMessage(() => instance.exports.f(65536), WebAssembly.RuntimeError, "index out of bounds");
  }
}

// Fill
{
  const configs = [
    { max: "", shared: "" },
    { max: "65536", shared: "" },
    { max: "65536", shared: "shared" },
  ];
  for (const { max, shared } of configs) {
    let instance = wasmEvalText(`(module
      (memory (export "mem") 0 ${max} ${shared} (pagesize 1))
      (func (export "f") (param i32 i32 i32) (result)
        (memory.fill (local.get 0) (local.get 1) (local.get 2))
      )
      (func (export "grow") (param i32) (result i32)
        (memory.grow (local.get 0))
      )
    )`);

    assertErrorMessage(() => instance.exports.f(0, 42, 1), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f(0, 42, 400), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(1000) !== -1, true);
    instance.exports.f(0, 42, 400);
    let buf = new Int8Array(instance.exports.mem.buffer);
    for (let i = 0; i < 400; i++) {
      assertEq(buf.at(i), 42);
    }

    assertErrorMessage(() => instance.exports.f(998, 42, 3), WebAssembly.RuntimeError, "index out of bounds");
  }
}

// Copy
{
  const configs = [
    { max: "", shared: "" },
    { max: "65536", shared: "" },
    { max: "65536", shared: "shared" },
  ];
  for (const { max, shared } of configs) {
    let instance = wasmEvalText(`(module
      (memory (export "mem") 0 ${max} ${shared} (pagesize 1))
      (func (export "f") (param i32 i32 i32) (result)
        (memory.copy (local.get 0) (local.get 1) (local.get 2))
      )
      (func (export "grow") (param i32) (result i32)
        (memory.grow (local.get 0))
      )
    )`);

    assertErrorMessage(() => instance.exports.f(0, 1, 1), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f(0, 400, 1), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(1000) !== -1, true);
    let buf = new Int8Array(instance.exports.mem.buffer);
    buf.fill(42, 0, 400);
    instance.exports.f(600, 40, 200);
    for (let i = 600; i < 640; i++) {
      assertEq(buf.at(i), 42);
    }

    assertErrorMessage(() => instance.exports.f(998, 0, 3), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f(0, 998, 3), WebAssembly.RuntimeError, "index out of bounds");
  }
}

// Init
{
  const configs = [
    { max: "", shared: "" },
    { max: "65536", shared: "" },
    { max: "65536", shared: "shared" },
  ];
  for (const { max, shared } of configs) {
    let instance = wasmEvalText(`(module
      (data $d "\\2A\\2A\\2A")
      (memory (export "mem") 0 ${max} ${shared} (pagesize 1))
      (func (export "f") (param i32 i32 i32) (result)
        (memory.init $d (local.get 0) (local.get 1) (local.get 2))
      )
      (func (export "grow") (param i32) (result i32)
        (memory.grow (local.get 0))
      )
    )`);

    assertErrorMessage(() => instance.exports.f(1, 0, 1), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f(400, 0, 1), WebAssembly.RuntimeError, "index out of bounds");

    assertEq(instance.exports.grow(1000) !== -1, true);
    let buf = new Int8Array(instance.exports.mem.buffer);
    instance.exports.f(200, 0, 3);
    assertEq(buf.at(200), 42);
    assertEq(buf.at(201), 42);
    assertEq(buf.at(202), 42);

    assertErrorMessage(() => instance.exports.f(998, 0, 3), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f(0, 998, 3), WebAssembly.RuntimeError, "index out of bounds");
  }
}
