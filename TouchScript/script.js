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
          data[row].push( makeSecondary(STRING_LITERAL, nextStringLiteral++) );
        }
        else if(!isNaN(token)) {
          numericLiterals[nextNumericLiteral] = token;
          data[row].push( makeSecondary(NUMERIC_LITERAL, nextNumericLiteral++) );
        }
        else if (SYMBOL_TABLE[token] !== undefined) {
          data[row].push( makeSecondary(SYMBOL, SYMBOL_TABLE[token]) );
        }
        else if (KEYWORD_TABLE[token] !== undefined) {
          data[row].push( makeSecondary(KEYWORD, KEYWORD_TABLE[token]) );
        }
        else if (token.charAt(0) === "/" && token.charAt(1) === "*") {
          comments[nextComment] = token.substring(2, token.length - 2);
          data[row].push( makeSecondary(COMMENT, nextComment++));
        }
        else if (token.charAt(0) === "/" && token.charAt(1) === "/") {
          comments[nextComment] = token.substring(2, token.length);
          data[row].push( makeSecondary(COMMENT, nextComment++));
        }
        else {
          let identifier = token.includes(".") ? token : "Hidden." + token;
          let funcId = FUNCTION_TABLE[identifier];
  
          if (funcId !== undefined) {
            if (i > 0 && tokens[i - 1] === "func") {
              data[row].push( makePrimary(FUNCTION_DEFINITION, FUNCTIONS[funcId].returnType, funcId) );
            } else {
              data[row].push( makeSecondary(FUNCTION_CALL, funcId) );
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
            
            data[row].push( makePrimary(VARIABLE_REFERENCE, type, id) );
          }
        }
      }
    }
  }
  
  return data;
}

function makePrimary(format, meta, value) {
  format &= 3;
  meta &= 0x3FFF;
  value &= 0xFFFF;
  
  return format << 30 | meta << 16 | value;
}

function makeSecondary(format, value) {
  format &= 0x3F;
  value &= 0xFFFFFF;
  
  return SECONDARY_FORMAT << 30 | format << 24 | value;
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
  let format = item >>> 30;
  
  switch (format) {
    case VARIABLE_REFERENCE:
    {
      let meta = (item >>> 16) & 0x3FFF; //second-least sig 14 bits
      let value = item & 0xFFFF; //least sig 16 bits
      
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
      let meta = (item >>> 16) & 0x3FFF; //second-least sig 14 bits
      let value = item & 0xFFFF; //least sig 16 bits
      
      let func = FUNCTIONS[value];
      
      if (meta === 0) {
        return "<span class='method-declaration'>" + func.name + "</span>";
      } else {
        let type = CLASSES[meta].name;
        return "<span class='keyword'>" + type + "</span><br><span class='method-declaration'>" + func.name + "</span>";
      }
      break;
    }
    
    case 2:
      return "primary format<br>2";
      break;
      
    case SECONDARY_FORMAT:
      switch ( (item >>> 24) & 63 ) {
        case KEYWORD:
          return "<span class='keyword'>" + KEYWORDS[item & 0xFFFFFF] + "</span>";
          
        case SYMBOL:
          return SYMBOLS[item & 0xFFFFFF];
          
        case NUMERIC_LITERAL:
          return "<span class='number'>" + numericLiterals[item & 0xFFFFFF] + "</span>";
        
        case STRING_LITERAL:
          return '<span class="string">"' + stringLiterals[item & 0xFFFFFF] + '"</span>';
        
        case COMMENT:
          return "<span class='comment'>" + comments[item & 0xFFFFFF] + "</span>";
          
        case FUNCTION_CALL:
        {
          let funcId = item & 0xFFFF; //least sig 16 bits
          let func = FUNCTIONS[funcId];
          
          if (func.scope === CLASS_TABLE.Hidden) {
            return "<span class='method-call'>" + func.name + "</span>";
          } else {
            
            return "<span class='keyword'>" + CLASSES[func.scope].name + "</span><br><span class='method-call'>" + func.name + "</span>";
          }
          break;
        }
        
        case ARGUMENT_HINT:
        {
          let argumentOrdinal = (item >>> 16) & 0xFF; //second-least sig 8 bits
          let funcId = item & 0xFFFF; //least sig 16 bits
          
          return "argument hint";
        }

        default:
          return "secondary format<br>" + secondImpression;
      }
      
      break;
    
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
    
    let rowData = script[row];
    for (let col = 1; col < rowData.length; ++col) {
        let item = script[row][col];
        let format = item >>> 30;
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
            
            //if a script function call interacts with outside JS, write it verbatim
            let funcName;
            if (func.js !== null) {
              funcName = func.js;
            } else {
              funcName = "f" + value;
            }
            
            js += funcName + " = function ";
            break;
          }
            
          case SECONDARY_FORMAT:
            switch ( (item >>> 24) & 63 ) {
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
                
              case FUNCTION_CALL:
              {
                let func = FUNCTIONS[value];
                
                //if a script function call interacts with outside JS, write it verbatim
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
                return "argument hint";
      
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