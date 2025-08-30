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

// Missing page size.
assertErrorMessage(() => wasmEvalBinary(moduleWithSections([ {name:memoryId, body:[0x01, 0x08, 0x00]} ])), WebAssembly.CompileError, /failed to decode custom page size/);

// Too many bytes after page size.
assertErrorMessage(() => wasmEvalBinary(moduleWithSections([ {name:memoryId, body:[0x01, 0x08, 0x00, 0x10, 0x01]} ])), WebAssembly.CompileError, /byte size mismatch in memory section/);

// Tables shouldn't have page sizes.
assertErrorMessage(() => wasmEvalBinary(moduleWithSections([ {name:tableId, body:[0x01, FuncRefCode, 0x08, 0x00, 0x10]} ])), WebAssembly.CompileError, /unexpected bits set in flags: 8/);

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
