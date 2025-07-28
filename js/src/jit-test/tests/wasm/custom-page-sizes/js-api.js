// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

{
  let instance = wasmEvalText(`(module
      (memory (export "mem") 0 1 (pagesize 1))
    )
  `);

  assertErrorMessage(
    () => wasmEvalText(`(module
        (memory (import "m" "mem") 0 1 (pagesize 65536))
      )
    `, { m: { mem: instance.exports.mem } }),
    WebAssembly.LinkError,
    /imported Memory with incompatible page size/
  )
}

{
  let instance = wasmEvalText(`(module
      (memory (export "mem") 0 1 (pagesize 65536))
    )
  `);

  assertErrorMessage(
    () => wasmEvalText(`(module
        (memory (import "m" "mem") 0 1 (pagesize 1))
      )
    `, { m: { mem: instance.exports.mem } }),
    WebAssembly.LinkError,
    /imported Memory with incompatible page size/
  )
}

{
  let instance = wasmEvalText(`(module
      (memory (export "mem") 0 1)
    )
  `);

  assertErrorMessage(
    () => wasmEvalText(`(module
        (memory (import "m" "mem") 0 1 (pagesize 1))
      )
    `, { m: { mem: instance.exports.mem } }),
    WebAssembly.LinkError,
    /imported Memory with incompatible page size/
  )
}
