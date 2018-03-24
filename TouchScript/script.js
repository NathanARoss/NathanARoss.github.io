let nextVariable = 0;
let variableNames = {};

let nextNumericLiteral = 0;
let numericLiterals = {};

let nextStringLiteral = 0;
let stringLiterals = {};

let nextComment = 0;
let comments = {};

let script = parseScript(
`var x , y , vX , vY

func initalize ( _width , _height ) {
 x = _width / 2
 y = _height / 2
 vX = _width / 40
 vY = _height / 25
}
func onDraw ( width , height , time ) {
 let radius = Math.min ( width , height ) / 16
 
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
          data[row].push( makeItem(MAPPED_STRING, STRING_LITERAL, nextStringLiteral++) );
        }
        else if(!isNaN(token)) {
          numericLiterals[nextNumericLiteral] = token;
          data[row].push( makeItem(MAPPED_STRING, NUMERIC_LITERAL, nextNumericLiteral++) );
        }
        else if (SYMBOL_TABLE[token] !== undefined) {
          data[row].push( makeItem(MAPPED_STRING, SYMBOL, SYMBOL_TABLE[token]) );
        }
        else if (KEYWORD_TABLE[token] !== undefined) {
          data[row].push( makeItem(MAPPED_STRING, KEYWORD, KEYWORD_TABLE[token]) );
        }
        else if (token.charAt(0) === "/" && token.charAt(1) === "*") {
          comments[nextComment] = token.substring(2, token.length - 2);
          data[row].push( makeItem(MAPPED_STRING, COMMENT, nextComment++));
        }
        else if (token.charAt(0) === "/" && token.charAt(1) === "/") {
          comments[nextComment] = token.substring(2, token.length);
          data[row].push( makeItem(MAPPED_STRING, COMMENT, nextComment++));
        }
        else {
          let identifier = token.includes(".") ? token : "Hidden." + token;
          let funcId = FUNCTION_TABLE[identifier];
  
          if (funcId !== undefined) {
            if (i > 0 && tokens[i - 1] === "func") {
              data[row].push( makeItem(FUNCTION_DEFINITION, FUNCTIONS[funcId].returnType, funcId) );
            } else {
              data[row].push( makeItem(FUNCTION_CALL, FUNCTIONS[funcId].scope, funcId) );
            }
          } else {
            let indexOf = token.indexOf(":");
            let variableName = (indexOf === -1) ? token : token.substring(0, indexOf);
            
            let id = -1;
            Object.keys(variableNames).some(function(key) {
              if (variableNames[key] === variableName) {
                id = key;
                return true;
              }
            });
            
            if (id === -1) {
              variableNames[nextVariable] = variableName;
              id = nextVariable++;
            }
            
            let type = (indexOf === -1) ? CLASS_TABLE.Hidden : CLASS_TABLE[token.substring(indexOf + 1)];
            
            data[row].push( makeItem(VARIABLE_REFERENCE, type, id) );
          }
        }
      }
    }
  }
  
  return data;
}

function makeItem(format, meta, value) {
  format |= 0;
  meta |= 0;
  value |= 0;
  
  return format << 29 | meta << 16 | value;
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
        return "<span class='method-call'>" + func.name + "</span>";
      } else {
        let type = CLASSES[meta].name;
        return "<span class='keyword'>" + type + "</span><br><span class='method-call'>" + func.name + "</span>";
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
    
    if (row == script.length - 1 && indentation > 0) {
      js += " }".repeat(indentation);
    }
    
    js += "\n";
  }
  
  console.log(js);
  
  return Function(js);
}