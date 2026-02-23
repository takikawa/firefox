// |jit-test| --setpref=wasm_memory_control=true; skip-if: !wasmMemoryControlEnabled(); skip-if: !wasmCustomPageSizesEnabled()

// Test memory.discard with custom page sizes. Currently the combination of these
// proposed features isn't fully specified and the standard page size limitations are
// applied.
{
  const configs = [
    { max: "", shared: "" },
    { max: "65536", shared: "" },
    { max: "65536", shared: "shared" },
  ];
  for (const { max, shared } of configs) {
    let instance = wasmEvalText(`(module
      (memory (export "mem") 0 ${max} ${shared} (pagesize 1))
      (func (export "f") (param i32 i32) (result)
        (memory.discard (local.get 0) (local.get 1))
      )
      (func (export "grow") (param i32) (result i32)
        (memory.grow (local.get 0))
      )
    )`);

    instance.exports.f(0, 0);
    assertErrorMessage(() => instance.exports.f(0, 65536), WebAssembly.RuntimeError, "index out of bounds");
    assertErrorMessage(() => instance.exports.f(0, 3), WebAssembly.RuntimeError, "unaligned memory access");
    assertErrorMessage(() => instance.exports.f(1, 3), WebAssembly.RuntimeError, "unaligned memory access");
    assertErrorMessage(() => instance.exports.f(400, 3), WebAssembly.RuntimeError, "unaligned memory access");

    assertEq(instance.exports.grow(65536) !== -1, true);

    assertErrorMessage(() => instance.exports.f(0, 63001), WebAssembly.RuntimeError, "unaligned memory access");
    assertErrorMessage(() => instance.exports.f(63001, 0), WebAssembly.RuntimeError, "unaligned memory access");
    assertErrorMessage(() => instance.exports.f(63001, 63001), WebAssembly.RuntimeError, "unaligned memory access");
    instance.exports.f(65536, 0);
    instance.exports.f(0, 65536);
    assertErrorMessage(() => instance.exports.f(0, 65537), WebAssembly.RuntimeError, "unaligned memory access");
    assertErrorMessage(() => instance.exports.f(0, 131072), WebAssembly.RuntimeError, "index out of bounds");
  }
}
