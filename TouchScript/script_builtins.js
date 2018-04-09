"use strict";

const VARIABLE_REFERENCE = 0;
const FUNCTION_DEFINITION = 1;
const FUNCTION_CALL = 2;
const ARGUMENT_HINT = 3;
const ARGUMENT_LABEL = 4;
const SYMBOL = 5;
const KEYWORD = 6;
const NUMERIC_LITERAL = 7;
const STRING_LITERAL = 8;
const COMMENT = 9;




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
    parameters: makeParameterObject("toConvert:Any")
  },
  {name: "Uint8", scope: CLASS_TABLE.UInt8, returnType: CLASS_TABLE.Uint8, js: "Number",
    parameters: makeParameterObject("toConvert:Any")
  },
  {name: "Int16", scope: CLASS_TABLE.Int16, returnType: CLASS_TABLE.Int16, js: "Number",
    parameters: makeParameterObject("toConvert:Any")
  },
  {name: "Uint16", scope: CLASS_TABLE.UInt16, returnType: CLASS_TABLE.Uint16, js: "Number",
    parameters: makeParameterObject("toConvert:Any")
  },
  {name: "Int32", scope: CLASS_TABLE.Int32, returnType: CLASS_TABLE.Int32, js: "Number",
    parameters: makeParameterObject("toConvert:Any")
  },
  {name: "Uint32", scope: CLASS_TABLE.UInt32, returnType: CLASS_TABLE.Uint32, js: "Number",
    parameters: makeParameterObject("toConvert:Any")
  },
  {name: "Int64", scope: CLASS_TABLE.Int64, returnType: CLASS_TABLE.Int64, js: "Number",
    parameters: makeParameterObject("toConvert:Any")
  },
  {name: "Uint64", scope: CLASS_TABLE.UInt64, returnType: CLASS_TABLE.Uint64, js: "Number",
    parameters: makeParameterObject("toConvert:Any")
  },
  {name: "print", scope: CLASS_TABLE.System, returnType: CLASS_TABLE.Hidden, js: "console.log",
    parameters: makeParameterObject("item:Any")
  },
  {name: "drawCircle", scope: CLASS_TABLE.Canvas, returnType: CLASS_TABLE.Hidden, js: "drawCircle",
    parameters: makeParameterObject("x:Double", "y:Double", "r:Double")
  },
  {name: "cos", scope: CLASS_TABLE.Math, returnType: CLASS_TABLE.Double, js: "Math.cos",
    parameters: makeParameterObject("theta:Double")
  },
  {name: "sin", scope: CLASS_TABLE.Math, returnType: CLASS_TABLE.Double, js: "Math.sin",
    parameters: makeParameterObject("theta:Double")
  },
  {name: "min", scope: CLASS_TABLE.Math, returnType: CLASS_TABLE.Double, js: "Math.min",
    parameters: makeParameterObject("a:Double", "b:Double")
  },
  {name: "max", scope: CLASS_TABLE.Math, returnType: CLASS_TABLE.Double, js: "Math.max",
    parameters: makeParameterObject("a:Double", "b:Double")
  },
]

let FUNCTION_TABLE = {};
for (let i = 0; i < FUNCTIONS.length; ++i) {
  let scope = CLASSES[FUNCTIONS[i].scope].name;
  let key = FUNCTIONS[i].name;
  if (scope)
    key = `${scope}.${key}`;
    
  FUNCTION_TABLE[key] = i;
}

function makeParameterObject() {
  let parameters = Array(arguments.length);
  
  for (let i = 0; i < arguments.length; ++i) {
    let name_type = arguments[i].split(":");
    parameters.push({"type": CLASS_TABLE[name_type[1]], "name": name_type[0]});
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
  null,
  "const",
  "let",
  "if (",
  "for (",
  "in",
  "while (",
  "until (",
  "switch (",
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




let sampleScripts = [];

sampleScripts[0] =
`var width , height , radius
var x , y , vX , vY

func onResize newWidth:Double newHeight:Double {
  width = newWidth
  height = newHeight
  radius = Math.min ( width , height ) / 16
}
func initialize {
  x = width / 2
  y = height / 2
  vX = width / 40
  vY = height / 25
}
func onDraw time:Double {
  vY += 1
  x += vX
  y += vY
 
  if x < radius {
    vX = vX * -0.99
    x = radius
  } if y < radius {
    vY = vY * -0.99
    y = radius
  } if x > width - radius {
    vX = vX * -0.99
    x = width - radius
  } if y > height - radius {
    vY = vY * -0.99
    y = height - radius
  }
  Canvas.drawCircle ( x , y , radius )
}`;

sampleScripts[1] =
`var width, height, radius

func pattern x:Double {
  return Math.sin(x / width * 4) * height / 2 + height / 2
}
func onResize newWidth:Double newHeight:Double {
  width = newWidth
  height = newHeight
  radius = Math.min(width, height) / 16
}
func initialize {
  //nothing needed
}
func onDraw time:Double {
  var x = -radius
  while x < width + radius {
    let y = pattern(x + time / 1000 * width / 16)
    Canvas.drawCircle(x, y, radius)
    x += radius / 4
  }
}`;

sampleScripts[2] =
`let message = "Hello World"
System.print(message)
`