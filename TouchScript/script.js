let nextVariable = 0;
let variableNames = {};

let nextNumericLiteral = 0;
let numericLiterals = {};

let nextStringLiteral = 0;
let stringLiterals = {};

let nextComment = 0;
let comments = {};

let script = parseScript(
`var width , height , radius
var x , y , vX , vY

func onResize ( newWidth , newHeight ) {
 width = newWidth
 height = newHeight
 radius = Math.min ( width , height ) / 16
}
func initalize ( ) {
 x = width / 2
 y = height / 2
 vX = width / 40
 vY = height / 25
}
func onDraw ( time ) {
 vY += 1
 x += vX
 y += vY
 
 if ( x < radius ) {
  vX = vX * -0.99
  x = radius
 } if ( y < radius ) {
  vY = vY * -0.99
  y = radius
 } if ( x > width - radius ) {
  vX = vX * -0.99
  x = width - radius
 } if ( y > height - radius ) {
  vY = vY * -0.99
  y = height - radius
 }
 Canvas.drawCircle ( x , y , radius )
}`)



function parseScript(script) {
  let data = [];
  let lines = script.split('\n');
  
  for (let row = 0; row < lines.length; ++row) {
    let tokens = lines[row].match(/(?:\/\*(?:[^*]|(?:\*+(?:[^*\/])))*\*+\/)|(?:\/\/.*)|(?:[^\s"]+|"[^"]*")+/g);
    
    let isStartingScope = 0;
    if (tokens) {
      if (tokens[0] === "}")
        tokens.shift();
      
      if (tokens[tokens.length - 1] === "{") {
        isStartingScope = 1;
        tokens.pop();
      }
    }
    
    let indentation = lines[row].search(/\S|$/); //count leading spaces
    data[row] = [indentation | isStartingScope << 31];
    
    if (tokens !== null) {
      for (let i = 0; i < tokens.length; ++i) {
        let token = tokens[i];
        
        //figure out what this token refers to
        if(token.charAt(0) === '"') {
          stringLiterals[nextStringLiteral] = token.substring(1, token.length - 1);
          data[row].push( makeItem(STRING_LITERAL, nextStringLiteral++) );
        }
        else if(!isNaN(token)) {
          numericLiterals[nextNumericLiteral] = token;
          data[row].push( makeItem(NUMERIC_LITERAL, nextNumericLiteral++) );
        }
        else if (SYMBOL_TABLE[token] !== undefined) {
          data[row].push( makeItem(SYMBOL, SYMBOL_TABLE[token]) );
        }
        else if (KEYWORD_TABLE[token] !== undefined) {
          data[row].push( makeItem(KEYWORD, KEYWORD_TABLE[token]) );
        }
        else if (token.charAt(0) === "/" && token.charAt(1) === "*") {
          comments[nextComment] = token.substring(2, token.length - 2);
          data[row].push( makeItem(COMMENT, nextComment++));
        }
        else if (token.charAt(0) === "/" && token.charAt(1) === "/") {
          comments[nextComment] = token.substring(2, token.length);
          data[row].push( makeItem(COMMENT, nextComment++));
        }
        else {
          let identifier = token.includes(".") ? token : "Hidden." + token;
          let funcId = FUNCTION_TABLE[identifier];
  
          if (funcId !== undefined) {
            if (i > 0 && tokens[i - 1] === "func") {
              data[row].push( makeItemWithMeta(FUNCTION_DEFINITION, FUNCTIONS[funcId].returnType, funcId) );
            } else {
              data[row].push( makeItem(FUNCTION_CALL, funcId) );
            }
          } else {
            let indexOf = token.indexOf(":");
            let name = (indexOf === -1) ? token : token.substring(0, indexOf);
            
            let id = -1;
            for (let i = 0, keys = Object.keys(variableNames); i < keys.length; ++i) {
              if (variableNames[i] === name) {
                id = i;
                break;
              }
            }
            
            if (id === -1) {
              variableNames[nextVariable] = name;
              id = nextVariable++;
            }
            
            let type = (indexOf === -1) ? CLASS_TABLE.Hidden : CLASS_TABLE[token.substring(indexOf + 1)];
            
            data[row].push( makeItemWithMeta(VARIABLE_REFERENCE, type, id) );
          }
        }
      }
    }
  }
  
  return data;
}

function makeItemWithMeta(format, meta, value) {
  format &= 0xF;
  meta &= 0xFFF;
  value &= 0xFFFF;
  
  return format << 28 | meta << 16 | value;
}

function makeItem(format, value) {
  format &= 0xF;
  value &= 0xFFFFFFF;
  
  return format << 28 | value;
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
  let format = item >>> 28; //4 bits
  let data = item & 0xFFFFFFF; //28 bits
  let meta = data >>> 16; //12 bits
  let value = item & 0xFFFF; //16 bits
  
  switch (format) {
    case VARIABLE_REFERENCE:
    {
      let name = variableNames[value];
      if (name === undefined) {
        name = "var" + value;
      }
      
      if (meta === CLASS_TABLE.Hidden) {
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
      
      if (meta === CLASS_TABLE.Hidden) {
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
      
      if (func.scope === CLASS_TABLE.Hidden) {
        return "<span class='method-call'>" + func.name + "</span>";
      } else {
        
        return "<span class='keyword'>" + CLASSES[func.scope].name + "</span><br><span class='method-call'>" + func.name + "</span>";
      }
      break;
    }
    
    case ARGUMENT_HINT:
      return "argument hint";
    
    case ARGUMENT_LABEL:
      return "argument label";
    
    case SYMBOL:
      return SYMBOLS[data];

    case KEYWORD:
      return "<span class='keyword'>" + KEYWORDS[data] + "</span>";
      
    case NUMERIC_LITERAL:
      return "<span class='number'>" + numericLiterals[data] + "</span>";
    
    case STRING_LITERAL:
      return '<span class="string">"' + stringLiterals[data] + '"</span>';
    
    case COMMENT:
      return "<span class='comment'>" + comments[data] + "</span>";
    
    default:
      return "format<br>" + format;
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
    js += " ".repeat(indentation);
    
    let rowData = script[row];
    for (let col = 1; col < rowData.length; ++col) {
        let item = script[row][col];
        let format = item >>> 28;
        let value = item & 0xFFFF; //least sig 16 bits
        
        switch (format) {
          case VARIABLE_REFERENCE:
          {
            js += "v" + value + " ";
            break;
          }
          
          case FUNCTION_DEFINITION:
          {
            let func = FUNCTIONS[value];
            
            let funcName;
            if (func.js !== null) {
              funcName = func.js;
            } else {
              funcName = "f" + value;
            }
            
            js += funcName + " = function ";
            break;
          }
          
          case FUNCTION_CALL:
          {
            let func = FUNCTIONS[value];
            
            let funcName;
            if (func.js !== null) {
              funcName = func.js;
            } else {
              funcName = "f" + value;
            }
            
            js += funcName + " ";
            break;
          }
          
          case ARGUMENT_HINT:
            return "/*argument hint*/";
          
          case ARGUMENT_LABEL:
            return "/*argument label*/";
            
          case SYMBOL:
            js += SYMBOLS[value] + " ";
            break;
            
          case KEYWORD:
            if (JS_KEYWORDS[value] !== null)
              js += JS_KEYWORDS[value] + " ";
            break;
            
          case NUMERIC_LITERAL:
            js += numericLiterals[value] + " ";
            break;
          
          case STRING_LITERAL:
            js += '"' + stringLiterals[value] + '" ';
            break;
          
          case COMMENT:
            js += "/*" + comments[value] + "*/ ";
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
        js += "}";
      }
    }
    
    if (row == script.length - 1 && indentation > 0) {
      js += "}".repeat(indentation);
    }
    
    js += "\n";
  }
  
  console.log(js);
  
  return Function(js);
}