// |jit-test| skip-if: !wasmSimdEnabled() || !wasmCustomPageSizesEnabled()

// Variants of custom page size runtime tests that use SIMD operations.
{
  let instance = wasmEvalText(`(module
      (memory i32 20 20 (pagesize 1))
      (func (export "f") (param i32) (result i32)
        (i32x4.extract_lane 0 (v128.load (local.get 0)))
      )
    )
  `);

  instance.exports.f(1);
  instance.exports.f(4);
  assertErrorMessage(() => instance.exports.f(5), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(10), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(15), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(20), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i64 0 0 (pagesize 1))
      (func (export "f") (param i64) (result i32)
        (i32x4.extract_lane 0 (v128.load (local.get 0)))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(0n), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(1n), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(2n), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i64 16 16 (pagesize 1))
      (func (export "f") (param i64) (result i32)
        (i32x4.extract_lane 0 (v128.load (local.get 0)))
      )
    )
  `);

  instance.exports.f(0n);
  assertErrorMessage(() => instance.exports.f(1n), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(2n), WebAssembly.RuntimeError, "index out of bounds");
}
