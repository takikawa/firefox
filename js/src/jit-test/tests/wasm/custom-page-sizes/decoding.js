// |jit-test| skip-if: !wasmCustomPageSizesEnabled()

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

wasmEvalText(`(module
    (memory 0 65536 (pagesize 1))
  )
`);

const maxPageCount = 1 << 16;

function checkPageCount(pageSize, pageCount) {
    function instantiate() {
        return wasmEvalText(`(module
            (memory 0 ${pageCount} (pagesize ${pageSize}))
        )`);
    }
    if (pageCount <= maxPageCount)
        instantiate();
    else
        assertErrorMessage(instantiate, WebAssembly.CompileError,
                           /maximum memory size too big/);
}

for (pageSize of [1, 65536])
    for (pageCount of [0, 1, 42, maxPageCount-1, maxPageCount, maxPageCount+1,
                       0xffffffff])
        checkPageCount(pageSize, pageCount);
