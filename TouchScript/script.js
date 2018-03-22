let nextVariable = 0;
let variableNames = {};

let nextNumericLiteral = 0;
let numericLiterals = {};

let nextStringLiteral = 0;
let stringLiterals = {};

let nextComment = 0;
let comments = {};

let script = []

/*
script.push( [
  makeIndentation(0, 0, 1),
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
*/

script.push( [
  makeIndentation(0, 0, 1),
  makeItem(FUNCTION_CALL, FUNCTIONS[FUNCTION_TABLE.print].scope, FUNCTION_TABLE.print),
  getSymbol("("),
  makeStringLiteral("Hello World"),
  getSymbol(")")
] );

script.push( [
  makeIndentation(0, 0, 1)
] );

let timeVar = makeVariable("time");
let widthVar = makeVariable("width");
let heightVar = makeVariable("height");
script.push( [
  makeIndentation(0, 1, 1),
  getKeyword("func"),
  makeItem(FUNCTION_DEFINITION, FUNCTIONS[FUNCTION_TABLE.onDraw].returnType, FUNCTION_TABLE.onDraw),
  getSymbol("("),
  timeVar,
  getSymbol(","),
  widthVar,
  getSymbol(","),
  heightVar,
  getSymbol(")")
] );

let xVar = makeVariable("x");
script.push( [
  makeIndentation(1, 0, 1),
  getKeyword("let"),
  xVar,
  getSymbol("="),
  getSymbol("("),
  makeItem(FUNCTION_CALL, FUNCTIONS[FUNCTION_TABLE.cos].scope, FUNCTION_TABLE.cos),
  getSymbol("("),
  timeVar,
  getSymbol(")"),
  getSymbol("*"),
  makeNumericLiteral("0.5"),
  getSymbol("+"),
  makeNumericLiteral("0.5"),
  getSymbol(")"),
  getSymbol("*"),
  widthVar,
] )

let yVar = makeVariable("y");
script.push( [
  makeIndentation(1, 0, 1),
  getKeyword("let"),
  yVar,
  getSymbol("="),
  getSymbol("("),
  makeItem(FUNCTION_CALL, FUNCTIONS[FUNCTION_TABLE.sin].scope, FUNCTION_TABLE.sin),
  getSymbol("("),
  timeVar,
  getSymbol(")"),
  getSymbol("*"),
  makeNumericLiteral("0.5"),
  getSymbol("+"),
  makeNumericLiteral("0.5"),
  getSymbol(")"),
  getSymbol("*"),
  heightVar,
] )

script.push( [
  makeIndentation(1, 0, 1),
  makeItem(FUNCTION_CALL, FUNCTIONS[FUNCTION_TABLE.drawCircle].scope, FUNCTION_TABLE.drawCircle),
  getSymbol("("),
  xVar,
  getSymbol(","),
  yVar,
  getSymbol(","),
  timeVar,
  getSymbol(")"),
] );


function makeItem(format, meta, value) {
  format |= 0;
  meta |= 0;
  value |= 0;
  
  return format << 29 | meta << 16 | value;
}

function makeIndentation(level, startsScope, appendable) {
  level = level & 0xFFFF;
  startsScope = startsScope & 1;
  appendable = appendable & 1;
  
  return level | startsScope << 31 | appendable << 30;
}

function getKeyword(keyword) {
  return MAPPED_STRING << 29 | KEYWORD << 16 | KEYWORD_TABLE[keyword];
}

function getSymbol(symbol) {
  return MAPPED_STRING << 29 | SYMBOL << 16 | SYMBOL_TABLE[symbol];
}

function makeVariable(name) {
  variableNames[nextVariable] = name;
  return nextVariable++;
}

function makeNumericLiteral(literal) {
  numericLiterals[nextNumericLiteral] = literal;
  return MAPPED_STRING << 29 | NUMERIC_LITERAL << 16 | nextNumericLiteral++;
}

function makeStringLiteral(literal) {
  stringLiterals[nextStringLiteral] = literal;
  return MAPPED_STRING << 29 | STRING_LITERAL << 16 | nextStringLiteral++;
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
  
  return script[row].length - 1;
}



function getItem(row, col) {
  row = row|0;
  col = (col|0) + 1;
  
  if (row < 0 || row >= script.length || col < 1 || col >= script[row].length) {
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
        return "<span class='method-declaration'>" + func.name + "</span>";
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
      
    case MAPPED_STRING:
      switch (meta) {
        case KEYWORD:
          return "<span class='keyword'>" + KEYWORDS[value] + "</span>";
          
        case SYMBOL:
          return SYMBOLS[value];
          
        case NUMERIC_LITERAL:
          return "<span class='number'>" + numericLiterals[value] + "</span>";
        
        case STRING_LITERAL:
          return '<span class="string">"' + stringLiterals[value] + '"</span>';
        
        case COMMENT:
          return "<span class='comment'>" + comments[value] + "</span>";

        default:
          return "constant string.<br>meta: " + secondImpression;
      }
      
      break;
    
    default:
      return "format<br>" + firstImpression;
  }
}


function getIndentation(row) {
  row |= 0;
  return script[row][0] & 0xFFFF;
}

function isStartingScope(row) {
  row |= 0;
  return script[row][0] >>> 31;
}


/*
Temporary function.  Generates an array of javascript strings from the script
containing each defined function and returns it for use in Function()
*/
function getJavaScript() {
  let js = "";
  
  for (let row = 0; row < script.length; ++row) {
    let indentation = getIndentation(row);
    
    let rowData = script[row];
    for (let col = 1; col < rowData.length; ++col) {
        let item = script[row][col];
        let format = item >>> 29;
        let meta = (item >>> 16) & 0x1FFF; //second-least sig 13 bits
        let value = item & 0xFFFF; //least sig 16 bits
        
        switch (format) {
          case VARIABLE_REFERENCE:
          {
            js += "var" + value + " ";
            break;
          }
          
          case FUNCTION_DEFINITION:
          {
            let func = FUNCTIONS[value];
            
            //if a script function call interacts with outside JS, write it verbatim
            let funcName;
            if (func.js !== null) {
              funcName = func.js;
            } else {
              funcName = "func" + value;
            }
            
            js += funcName + " = function ";
            break;
          }
          
          case FUNCTION_CALL:
          {
            let func = FUNCTIONS[value];
            
            //if a script function call interacts with outside JS, write it verbatim
            let funcName;
            if (func.js !== null) {
              funcName = func.js;
            } else {
              funcName = "func" + value;
            }
            
            js += funcName + " ";
            break;
          }
          
          case ARGUMENT_HINT:
            return "argument hint";
            
          case MAPPED_STRING:
            switch (meta) {
              case KEYWORD:
                js += JS_KEYWORDS[value] + " ";
                break;
                
              case SYMBOL:
                js += SYMBOLS[value] + " ";
                break;
                
              case NUMERIC_LITERAL:
                js += numericLiterals[value] + " ";
                break;
              
              case STRING_LITERAL:
                js += '"' + stringLiterals[value] + '" ';
                break;
              
              case COMMENT:
                //js += comments[value] + " ";
                break;
      
              default:
                js += "constant string meta: " + secondImpression;
                break;
            }
            
            break;
          
          default:
            js += "format " + firstImpression;
        }
    }
    
    //handle opening and closing scopes
    if (isStartingScope(row)) {
      js += "{ ";
    }
    
    if (row < script.length - 1) {
      let nextIndentation = getIndentation(row + 1);
      let expectedIndentation = indentation + isStartingScope(row);
      if (nextIndentation < expectedIndentation) {
        js += " }";
      }
    }
    
    if (row == script.length - 1 && indentation !== 0) {
      js += " }";
    }
    
    js += "\n";
  }
  
  console.log(js);
  
  return Function(js);
}