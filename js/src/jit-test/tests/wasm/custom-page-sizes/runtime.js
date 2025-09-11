// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

// Test access to an index from a local.
{
  let instance = wasmEvalText(`(module
      (memory i32 10 10 (pagesize 1))
      (func (export "f") (param i32) (result i32)
        (i32.store (local.get 0) (i32.const 42))
        (i32.load (local.get 0))
      )
    )
  `);

  assertEq(instance.exports.f(5), 42);
}

// Test constant memory access.
{
  let instance = wasmEvalText(`(module
      (memory i32 10 10 (pagesize 1))
      (func (export "f") (result i32)
        (i32.store (i32.const 5) (i32.const 42))
        (i32.load (i32.const 5))
      )
    )
  `);

  assertEq(instance.exports.f(), 42);
}

// Test bounds checking under 4GB.
{
  let instance = wasmEvalText(`(module
      (memory i64 5000 10000 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 11000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i64 5000 128000 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 64000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i64 5000 10000 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 6000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i32 5000 10000 (pagesize 1))
      (func (export "f")
        (i32.store (i32.const 11000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i32 5000 128000 (pagesize 1))
      (func (export "f")
        (i32.store (i32.const 64000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i32 5000 10000 (pagesize 1))
      (func (export "f")
        (i32.store (i32.const 6000) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i32 4294967295 4294967295 (pagesize 1))
      (func (export "f") (param i32)
        (i32.store8 (local.get 0) (i32.const 42))
      )
    )
  `);

  instance.exports.f(1);
  instance.exports.f(3000);
  instance.exports.f(4294967292);
  instance.exports.f(4294967293);
  instance.exports.f(4294967294);
  assertErrorMessage(() => instance.exports.f(4294967295), WebAssembly.RuntimeError, "index out of bounds");
}

{
  let instance = wasmEvalText(`(module
      (memory i32 4294967295 4294967295 (pagesize 1))
      (func (export "f") (param i32)
        (i32.store16 (local.get 0) (i32.const 42))
      )
    )
  `);

  instance.exports.f(1);
  instance.exports.f(3000);
  instance.exports.f(4294967292);
  instance.exports.f(4294967293);
  assertErrorMessage(() => instance.exports.f(4294967294), WebAssembly.RuntimeError, "index out of bounds");
  assertErrorMessage(() => instance.exports.f(4294967295), WebAssembly.RuntimeError, "index out of bounds");
}

// Ensure bounds checking above 4GB works as expected.
{
  let instance = wasmEvalText(`(module
      (memory i64 4294967299 4294967299 (pagesize 1))
      (func (export "f")
        (i32.store (i64.const 4294967300) (i32.const 42))
      )
    )
  `);

  assertErrorMessage(() => instance.exports.f(), WebAssembly.RuntimeError, "index out of bounds");
}
