"use strict";

function getBuiltIns() {
  let CLASSES = [
    {name: "Hidden", size: 0},
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
  
  let CLASS_MAP = new Map();
  for (let i = 0; i < CLASSES.length; ++i) {
    CLASS_MAP.set(CLASSES[i].name, i);
  }
  
  
  function parseFunction(source, js) {
    if (!source.includes("->")) {
      source += "->Hidden";
    }
    
    let tokens = source.match(/[\w]+/g);
    
    let newFunc = {};
    newFunc.scope = CLASS_MAP.get(tokens[0]);
    newFunc.name = tokens[1];
    newFunc.returnType = CLASS_MAP.get(tokens[tokens.length - 1]);
    newFunc.js = js;
    
    newFunc.parameters = [];
    
    for (let i = 2; i < tokens.length - 1; i += 2) {
      newFunc.parameters.push({"name": tokens[i], "type": CLASS_MAP.get(tokens[i + 1])});
    }
    
    return newFunc;
  }
  
  /* The .js property prepresents the equivalent javascript function to use when translating. */
  let FUNCTIONS = [
    parseFunction("Int8.Int8(toConvert:Any)->Int8", "Number"),
    parseFunction("UInt8.UInt8(toConvert:Any)->UInt8", "Number"),
    parseFunction("Int16.Int16(toConvert:Any)->Int16", "Number"),
    parseFunction("UInt16.UInt16(toConvert:Any)->UInt16", "Number"),
    parseFunction("Int32.Int32(toConvert:Any)->Int32", "Number"),
    parseFunction("UInt32.UInt32(toConvert:Any)->UInt32", "Number"),
    parseFunction("Int64.Int64(toConvert:Any)->Int64", "Number"),
    parseFunction("UInt64.UInt64(toConvert:Any)->UInt64", "Number"),
      
    parseFunction("System.print(item:Any)", "console.log"),
    parseFunction("Canvas.drawCircle(x:Double, y:Double, r:Double)", "drawCircle"),
    parseFunction("Math.cos(theta:Double)->Double", "Math.cos"),
    parseFunction("Math.sin(theta:Double)->Double", "Math.sin"),
    parseFunction("Math.min(a:Double, b:Double)->Double", "Math.min"),
    parseFunction("Math.max(a:Double, b:Double)->Double", "Math.max"),
  ]
  
  let FUNCTION_MAP = new Map();
  for (let i = 0; i < FUNCTIONS.length; ++i) {
    let scope = CLASSES[FUNCTIONS[i].scope].name;
    let key = FUNCTIONS[i].name;
    if (scope)
      key = `${scope}.${key}`;
      
    FUNCTION_MAP.set(key, i);
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
  
  const SYMBOL_MAP = new Map();
  for (let i = 0; i < SYMBOLS.length; ++i) {
    SYMBOL_MAP.set(SYMBOLS[i], i);
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
  
  const KEYWORD_MAP = new Map();
  for (let i = 0; i < KEYWORDS.length; ++i) {
    KEYWORD_MAP.set(KEYWORDS[i], i);
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
  
  return [CLASSES, CLASS_MAP, FUNCTIONS, FUNCTION_MAP, SYMBOLS, SYMBOL_MAP, KEYWORDS, JS_KEYWORDS, KEYWORD_MAP, sampleScripts[0]];
}