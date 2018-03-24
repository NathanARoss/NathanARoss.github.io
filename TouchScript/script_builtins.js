const VARIABLE_REFERENCE = 0;
const FUNCTION_DEFINITION = 1;
const FUNCTION_CALL = 2;
const ARGUMENT_HINT = 3;
const MAPPED_STRING = 4;

const KEYWORD = 0;
const SYMBOL = 1;
const NUMERIC_LITERAL = 2;
const STRING_LITERAL = 3;
const COMMENT = 4;


let CLASSES = [
  {name: null, size: 0},
  {name: "Any", size: 0},
  {name: "Int8", size: 1},
  {name: "UInt8", size: 1},
  {name: "Int16", size: 2},
  {name: "UInt16", size: 2},
  {name: "Int32", size: 4},
  {name: "UInt32", size: 4},
  {name: "Int64", size: 8},
  {name: "UInt64", size: 8},
  {name: "Float", size: 4},
  {name: "Double", size: 8},
  {name: "System", size: 0},
  {name: "Math", size: 0},
  {name: "Canvas", size: 0},
];

let CLASS_TABLE = {};
CLASS_TABLE.Hidden = 0;
for (let i = 1; i < CLASSES.length; ++i) {
  let key = CLASSES[i].name;
  CLASS_TABLE[key] = i;
}



/* The .js property prepresents the equivalent javascript function to use when translating.
   A value of null means that the function exists only within the script.
*/
let FUNCTIONS = [
  {name: "Int8", scope: CLASS_TABLE.Int8, returnType: CLASS_TABLE.Int8, js: "Number",
    parameters: makeParameterObject("Any", "toConvert")
  },
  {name: "Uint8", scope: CLASS_TABLE.UInt8, returnType: CLASS_TABLE.Uint8, js: "Number",
    parameters: makeParameterObject("Any", "toConvert")
  },
  {name: "Int16", scope: CLASS_TABLE.Int16, returnType: CLASS_TABLE.Int16, js: "Number",
    parameters: makeParameterObject("Any", "toConvert")
  },
  {name: "Uint16", scope: CLASS_TABLE.UInt16, returnType: CLASS_TABLE.Uint16, js: "Number",
    parameters: makeParameterObject("Any", "toConvert")
  },
  {name: "Int32", scope: CLASS_TABLE.Int32, returnType: CLASS_TABLE.Int32, js: "Number",
    parameters: makeParameterObject("Any", "toConvert")
  },
  {name: "Uint32", scope: CLASS_TABLE.UInt32, returnType: CLASS_TABLE.Uint32, js: "Number",
    parameters: makeParameterObject("Any", "toConvert")
  },
  {name: "Int64", scope: CLASS_TABLE.Int64, returnType: CLASS_TABLE.Int64, js: "Number",
    parameters: makeParameterObject("Any", "toConvert")
  },
  {name: "Uint64", scope: CLASS_TABLE.UInt64, returnType: CLASS_TABLE.Uint64, js: "Number",
    parameters: makeParameterObject("Any", "toConvert")
  },
  {name: "print", scope: CLASS_TABLE.System, returnType: CLASS_TABLE.Hidden, js: "console.log",
    parameters: makeParameterObject("Any", "item")
  },
  {name: "drawCircle", scope: CLASS_TABLE.Canvas, returnType: CLASS_TABLE.Hidden, js: "drawCircle",
    parameters: makeParameterObject("Double", "x", "Double", "y", "Double", "r")
  },
  {name: "cos", scope: CLASS_TABLE.Math, returnType: CLASS_TABLE.Double, js: "Math.cos",
    parameters: makeParameterObject("Double", "theta")
  },
  {name: "sin", scope: CLASS_TABLE.Math, returnType: CLASS_TABLE.Double, js: "Math.sin",
    parameters: makeParameterObject("Double", "theta")
  },
  {name: "min", scope: CLASS_TABLE.Math, returnType: CLASS_TABLE.Double, js: "Math.min",
    parameters: makeParameterObject("Double", "a", "Double", "b")
  },
  {name: "max", scope: CLASS_TABLE.Math, returnType: CLASS_TABLE.Double, js: "Math.max",
    parameters: makeParameterObject("Double", "a", "Double", "b")
  },
  
  {name: "initalize", scope: CLASS_TABLE.Hidden, returnType: CLASS_TABLE.Hidden, js: "state.initialize",
    parameters: makeParameterObject("Double", "width", "Double", "height")
  },
  {name: "onDraw", scope: CLASS_TABLE.Hidden, returnType: CLASS_TABLE.Hidden, js: "state.onDraw",
    parameters: makeParameterObject("Double", "width", "Double", "height", "Double", "time")
  },
]

let FUNCTION_TABLE = {};
for (let i = 0; i < FUNCTIONS.length; ++i) {
  let scope = CLASSES[FUNCTIONS[i].scope].name;
  scope = scope || "Hidden";
  let key = scope + "." + FUNCTIONS[i].name;
  FUNCTION_TABLE[key] = i;
}

function makeParameterObject() {
  if (arguments.length & 1 !== 0)
    console.log("Warning.  makeParameterObject() called with an odd number of arguments");
  
  let parameters = [];
  
  for (let i = 0; i < arguments.length; i += 2) {
    let type = CLASS_TABLE[arguments[i]];
    let name = arguments[i + 1];
    parameters.push({"type": type, "name": name});
  }
  
  return parameters;
}




const SYMBOLS = [
  "=",
  "==",
  "!=",
  "===",
  "!==",
  ">",
  ">=",
  "<",
  "<=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
  "&",
  "|",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "^=",
  "&=",
  "|=",
  "!",
  "&&",
  "||",
  "~",
  "(",
  ")",
  "[",
  "]",
  ".",
  ","
];

const SYMBOL_TABLE = {};
for (let i = 0; i < SYMBOLS.length; ++i) {
  let key = SYMBOLS[i];
  SYMBOL_TABLE[key] = i;
}



const KEYWORDS = [
  "func",
  "let",
  "var",
  "if",
  "for",
  "in",
  "while",
  "until",
  "switch",
  "case",
  "default",
  "return",
  "break",
  "continue",
  "true",
  "false",
]

const JS_KEYWORDS = [
  "",
  "const",
  "let",
  "if",
  "for",
  "in",
  "while",
  "until",
  "switch",
  "case",
  "default",
  "return",
  "break",
  "continue",
  "true",
  "false",
]

const KEYWORD_TABLE = {};
for (let i = 0; i < KEYWORDS.length; ++i) {
  let key = KEYWORDS[i];
  KEYWORD_TABLE[key] = i;
}