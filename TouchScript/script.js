let nextVariable = 0;
let variableNames = {};

let nextNumericLiteral = 0;
let numericLiterals = {};

let nextStringLiteral = 0;
let stringLiterals = {};

let nextComment = 0;
let comments = {};

let script = parseScript(sampleScripts[1])



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
        else if (i > 0 && tokens[i - 1] === "func") {
          let newFunc = {};
          
          newFunc.scope = "Hidden";
          newFunc.name = token;
          newFunc.returnType = "Hidden";
          
          let indexOf = token.indexOf(":");
          if (indexOf !== -1) {
            newFunc.name = token.substring(0, indexOf);
            newFunc.returnType = token.substring(indexOf + 1);
          }
          
          //detect which functions are called from outside
          newFunc.js = newFunc.name;
          if (newFunc.scope === "Hidden") {
            switch (newFunc.name) {
              case "onResize":
              case "initialize":
              case "onDraw":
                newFunc.js = "state." + newFunc.name;
            }
          }
          
          //console.log("new function. name: " + newFunc.name + " returnType: " + newFunc.returnType + " js: " + newFunc.js);
          
          //the remaining tokens are parameters
          newFunc.parameters = [];
          for (let j = i + 1; j < tokens.length; ++j) {
            let parameter = {};
            let indexOf = tokens[j].indexOf(":");
            parameter.name = tokens[j].substring(0, indexOf);
            parameter.type = tokens[j].substring(indexOf + 1);
            newFunc.parameters.push(parameter);
            
            //console.log("parameter name: " + parameter.name + " type: " + parameter.type);
          }
          
          let funcId = FUNCTIONS.length;
          FUNCTIONS.push(newFunc);
          FUNCTION_TABLE[newFunc.scope + "." + newFunc.name] = funcId;
          data[row].push( makeItemWithMeta(FUNCTION_DEFINITION, newFunc.returnType, funcId) );
        }
        else {
          //figure out whether the identifier is a variable name or a function name
          let funcName = token.includes(".") ? token : "Hidden." + token;
          if (FUNCTION_TABLE[funcName] !== undefined) {
            let funcId = FUNCTION_TABLE[funcName];
            data[row].push( makeItemWithMeta(FUNCTION_CALL, FUNCTIONS[funcId].scope, funcId) );
          }
          else {
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
      let name = variableNames[value] || "var" + value;
      
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
      
      if (meta === CLASS_TABLE.Hidden) {
        return "<span class='method-call'>" + func.name + "</span>";
      } else {
        let type = CLASSES[meta].name;
        return "<span class='keyword'>" + type + "</span><br><span class='method-call'>" + func.name + "</span>";
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
    
    let needsEndParenthesis = false;
    let needsCommas = false;
    
    let rowData = script[row];
    for (let col = 1; col < rowData.length; ++col) {
        let item = script[row][col];
        let format = item >>> 28;
        let value = item & 0xFFFF; //least sig 16 bits
        
        //if the first item is a keyword that begins a parenthesis
        if (format === KEYWORD) {
          let keyword = JS_KEYWORDS[value];
          if (keyword && keyword.charAt(keyword.length - 1) === "(") {
            needsEndParenthesis = true;
          }
        }
        
        //append an end parenthesis to the end of the line
        
        switch (format) {
          case VARIABLE_REFERENCE:
          {
            if (needsCommas)
              js += "v" + value + ", ";
            else
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
            
            js += funcName + " = function ( ";
            needsEndParenthesis = true;
            needsCommas = true;
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
            return "/*argument hint*/ ";
          
          case ARGUMENT_LABEL:
            return "/*argument label*/ ";
            
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
    
    if (needsEndParenthesis)
      js += ") ";
    
    if (isStartingScope(row))
      js += "{ ";
    
    if (row < script.length - 1) {
      let nextIndentation = getIndentation(row + 1);
      let expectedIndentation = indentation + isStartingScope(row);
      if (nextIndentation < expectedIndentation) {
        js += "}";
      }
    }
    
    if (row == script.length - 1 && indentation > 0)
      js += "}".repeat(indentation);
    
    js += "\n";
  }
  
  console.log(js);
  
  return Function(js);
}