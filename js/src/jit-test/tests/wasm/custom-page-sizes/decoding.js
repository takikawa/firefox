load(libdir + "wasm-binary.js");

wasmEvalText(`(module
    (memory 0 1 (pagesize 1))
  )
`);

wasmEvalText(`(module
    (memory 0 1 (pagesize 65536))
  )
`);

function checkInvalidPageSize(pageSize) {
  assertErrorMessage(() => wasmEvalText(`(module
      (memory 0 1 (pagesize ${pageSize}))
    )`),
    WebAssembly.CompileError, /bad custom page size/);
}

checkInvalidPageSize(8);
checkInvalidPageSize(128);
checkInvalidPageSize(131072);
