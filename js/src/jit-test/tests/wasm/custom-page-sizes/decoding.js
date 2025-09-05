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

wasmEvalText(`(module
    (memory i32 0 65536 (pagesize 65536))
  )
`);

wasmEvalText(`(module
    (memory i32 0 4_294_967_295 (pagesize 1))
  )
`);

wasmEvalText(`(module
    (memory i64 0 4_294_967_296 (pagesize 1))
  )
`);

wasmEvalText(`(module
    (memory i64 0 18_446_744_073_709_551_615 (pagesize 1))
  )
`);

function maxPageCount(pageSize) {
    if (pageSize === 1)
      return 0xffffffff;
    return 1 << (32 - Math.log2(pageSize));
}

function checkPageCount(pageSize, pageCount) {
    function instantiate() {
        return wasmEvalText(`(module
            (memory 0 ${pageCount} (pagesize ${pageSize}))
        )`);
    }
    if (pageCount <= maxPageCount(pageSize))
        instantiate();
    else if (pageCount > 0xffffffff)
        // Unrepresentable in the text format as it's out of bounds
        assertErrorMessage(instantiate, SyntaxError,
                           /invalid u32 number/);
    else
        assertErrorMessage(instantiate, WebAssembly.CompileError,
                           /maximum memory size too big/);
}

for (pageSize of [1, 65536])
    for (pageCount of [0, 1, 42, maxPageCount(pageSize)-1,
                       maxPageCount(pageSize),
                       BigInt(maxPageCount(pageSize))+1n,
                       0xffffffff])
        checkPageCount(pageSize, pageCount);
