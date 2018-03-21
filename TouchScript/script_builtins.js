const VARIABLE_REFERENCE = 0;
const FUNCTION_DEFINITION = 1;
const FUNCTION_CALL = 2;
const ARGUMENT_HINT = 3;
const CONSTANT_STRING = 4;

const KEYWORD = 0;
const SYMBOL = 1;
const NUMERIC_LIERAL = 2;
const STRING_LITERAL = 3;
const COMMENT = 4;


let CLASSES = [
  {name: null, size: 0},
  {name: "Any", size: 0},
  {name: "Int8", size: 1},
  {name: "Uint8", size: 1},
  {name: "Int16", size: 2},
  {name: "Uint16", size: 2},
  {name: "Int32", size: 4},
  {name: "Uint32", size: 4},
  {name: "Int64", size: 8},
  {name: "UInt64", size: 8},
  {name: "Float", size: 4},
  {name: "Double", size: 8},
  {name: "System", size: 0},
  {name: "Math", size: 0},
  
  {name: "MyClass", size: 0},
];

let CLASS_TABLE = {};
CLASS_TABLE.Hidden = 0;
for (let i = 1; i < CLASSES.length; ++i) {
  let key = CLASSES[i].name;
  CLASS_TABLE[key] = i;
}




let FUNCTIONS = [
  {name: "Int8", scope: CLASS_TABLE.Int8, returnType: CLASS_TABLE.Int8,
    parameters: [CLASS_TABLE.Any, "toConvert"]
  },
  {name: "Uint8", scope: CLASS_TABLE.UInt8, returnType: CLASS_TABLE.Uint8,
    parameters: [CLASS_TABLE.Any, "toConvert"]
  },
  {name: "Int16", scope: CLASS_TABLE.Int16, returnType: CLASS_TABLE.Int16,
    parameters: [CLASS_TABLE.Any, "toConvert"]
  },
  {name: "Uint16", scope: CLASS_TABLE.UInt16, returnType: CLASS_TABLE.Uint16,
    parameters: [CLASS_TABLE.Any, "toConvert"]
  },
  {name: "Int32", scope: CLASS_TABLE.Int32, returnType: CLASS_TABLE.Int32,
    parameters: [CLASS_TABLE.Any, "toConvert"]
  },
  {name: "Uint32", scope: CLASS_TABLE.UInt32, returnType: CLASS_TABLE.Uint32,
    parameters: [CLASS_TABLE.Any, "toConvert"]
  },
  {name: "Int64", scope: CLASS_TABLE.Int64, returnType: CLASS_TABLE.Int64,
    parameters: [CLASS_TABLE.Any, "toConvert"]
  },
  {name: "Uint64", scope: CLASS_TABLE.UInt64, returnType: CLASS_TABLE.Uint64,
    parameters: [CLASS_TABLE.Any, "toConvert"]
  },
  {name: "print", scope: CLASS_TABLE.System, returnType: CLASS_TABLE.HIDDEN,
    parameters: [CLASS_TABLE.Any, "item"]
  },
  
  {name: "doStuffs", scope: CLASS_TABLE.MyClass, returnType: CLASS_TABLE.Int32,
    parameters: []
  }
]

let FUNCTION_TABLE = {};
for (let i = 0; i < FUNCTIONS.length; ++i) {
  let key = FUNCTIONS[i].name;
  FUNCTION_TABLE[key] = i;
}




const SYMBOLS = [
  "=",
  "==",
  "!=",
  "===",
  "!==",
  "+",
  "-",
  "*",
  "/",
  "!",
  "&&",
  "||",
  "~",
  "^",
  "&",
  "|",
  "(",
  ")",
  "[",
  "]",
  ".",
];

const SYMBOL_TABLE = {};
for (let i = 0; i < SYMBOLS.length; ++i) {
  let key = SYMBOLS[i];
  SYMBOL_TABLE[key] = i;
}



const KEYWORDS = [
  "func",
  "let",
  "for",
  "in",
  "while",
  "until",
]

const KEYWORD_TABLE = {};
for (let i = 0; i < KEYWORDS.length; ++i) {
  let key = KEYWORDS[i];
  KEYWORD_TABLE[key] = i;
}