let nextVariable = 0;
let variableNames = {};

let nextNumericLiteral = 0;
let numericLiterals = {};

let nextStringLiteral = 0;
let stringLiterals = {};

let nextComment = 0;
let comments = {};

let script = []

script.push( [
  getKeyword("let"),
  makeItem(VARIABLE_REFERENCE, CLASS_TABLE.Int32, makeVariable("myVar")),
  getSymbol("="),
  makeItem(FUNCTION_CALL, CLASS_TABLE.Int32, FUNCTION_TABLE.Int32),
  getSymbol("("),
  makeItem(VARIABLE_REFERENCE, CLASS_TABLE.Hidden, makeVariable("oldVar")),
  getSymbol("*"),
  makeItem(VARIABLE_REFERENCE, CLASS_TABLE.Hidden, makeVariable("olderVar")),
  getSymbol(")"),
] );

script.push( [
  makeItem(FUNCTION_CALL, FUNCTIONS[FUNCTION_TABLE.print].scope, FUNCTION_TABLE.print),
  makeItem(VARIABLE_REFERENCE, CLASS_TABLE.Hidden, 0)
] );

script.push( [] );

script.push( [
  getKeyword("func"),
  makeItem(FUNCTION_DEFINITION, FUNCTIONS[FUNCTION_TABLE.doStuffs].scope, FUNCTION_TABLE.doStuffs),
] );



function makeItem(format, meta, value) {
  format |= 0;
  meta |= 0;
  value |= 0;
  
  return format << 29 | meta << 16 | value;
}

function getKeyword(keyword) {
  return CONSTANT_STRING << 29 | KEYWORD << 16 | KEYWORD_TABLE[keyword];
}

function getSymbol(symbol) {
  return CONSTANT_STRING << 29 | SYMBOL << 16 | SYMBOL_TABLE[symbol];
}

function makeVariable(name) {
  variableNames[nextVariable] = name;
  return nextVariable++;
}



function getRowCount() {
  return script.length;
}



function getItemCount(row) {
  row = row|0;
  
  if (row < 0 || row >= script.length) {
    console.log("attempting to get item count of row " + row);
    return 0;
  }
  
  return script[row].length;
}



function getItem(row, col) {
  row = row|0;
  col = col|0;
  
  if (row < 0 || row >= script.length || col < 0 || col >= script[row].length) {
    console.log("attempting to get item of row " + row + " col " + col);
    return "error";
  }
  
  let item = script[row][col];
  let format = item >>> 29;
  let meta = (item >>> 16) & 0x1FFF; //second-least sig 13 bits
  let value = item & 0xFFFF; //least sig 16 bits
  
  switch (format) {
    case VARIABLE_REFERENCE:
    {
      let name = variableNames[value];
      if (name === undefined) {
        name = "var" + value;
      }
      
      if (meta === 0) {
        return name;
      } else {
        let type = CLASSES[meta].name;
        return "<span class='keyword'>" + type + "</span><br>" + name;
      }
      break;
    }
    
    case FUNCTION_DEFINITION:
    {
      let func = FUNCTIONS[value];
      
      if (meta === 0) {
        return func.name;
      } else {
        let type = CLASSES[meta].name;
        return "<span class='keyword'>" + type + "</span><br><span class='method-declaration'>" + func.name + "</span>";
      }
      break;
    }
    
    case FUNCTION_CALL:
    {
      let func = FUNCTIONS[value];
      
      if (meta === 0) {
        return func.name;
      } else {
        let type = CLASSES[meta].name;
        return "<span class='keyword'>" + type + "</span><br>" + func.name;
      }
      break;
    }
    
    case ARGUMENT_HINT:
      return "argument hint";
      
    case CONSTANT_STRING:
      switch (meta) {
        case KEYWORD:
          return "<span class='keyword'>" + KEYWORDS[value] + "</span>";
          
        case SYMBOL:
          return SYMBOLS[value];
          
        case NUMERIC_LITERAL:
          return "Numeric iteral";
        
        case STRING_LITERAL:
          return "String literal";
        
        case COMMENT:
          return "comment";

        default:
          return "constant string.<br>meta: " + secondImpression;
      }
      
      break;
    
    default:
      return "format<br>" + firstImpression;
  }
}