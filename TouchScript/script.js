"use strict";

let nextVariable = 0;
let variableNames = {};

let nextNumericLiteral = 0;
let numericLiterals = {};

let nextStringLiteral = 0;
let stringLiterals = {};

let nextComment = 0;
let comments = {};

let script = parseScript(sampleScripts[0])



function parseScript(source) {
  //define specific item values to test for later
  const FUNC = makeItem(KEYWORD, KEYWORD_TABLE.func);
  
  let wholeScript = [];
  let line = [0];
  let indentation = 0;
  
  let tokens = source.match(/(?:\/\*(?:[^*]|(?:\*+(?:[^*\/])))*\*+\/)|(?:\/\/.*)|(?:[^\s(,)=+\-*\/"]+|"[^"]*")+|[\n,()]|[=+\-\*\/]+/g);
  
  for (let i = 0; i < tokens.length; ++i) {
    let token = tokens[i];
    
    //figure out what this token refers to
    if (token === "\n") {
      wholeScript.push(line);
      line = [indentation];
    }
    else if (token === "{") {
      ++indentation;
      line[0] |= 1 << 31;
      
    }
    else if (token === "}") {
      --indentation;
      line[0] = (line[0] & 0xFFFF0000) | indentation;
    }
    else if (token.startsWith('"')) {
      stringLiterals[nextStringLiteral] = token.substring(1, token.length - 1);
      line.push( makeItem(STRING_LITERAL, nextStringLiteral++) );
    }
    else if (token.startsWith("//")) {
      comments[nextComment] = token.substring(2);
      line.push( makeItem(COMMENT, nextComment++));
    }
    else if (token.startsWith("/*")) {
      comments[nextComment] = token.substring(2, token.length - 2);
      line.push( makeItem(COMMENT, nextComment++));
    }
    else if(!isNaN(token)) {
      numericLiterals[nextNumericLiteral] = token;
      line.push( makeItem(NUMERIC_LITERAL, nextNumericLiteral++) );
    }
    else if (token in SYMBOL_TABLE) {
      line.push( makeItem(SYMBOL, SYMBOL_TABLE[token]) );
    }
    else if (token in KEYWORD_TABLE) {
      line.push( makeItem(KEYWORD, KEYWORD_TABLE[token]) );
    }
    else if (token in FUNCTION_TABLE) {
      let funcId = FUNCTION_TABLE[token];
      line.push( makeItemWithMeta(FUNCTION_CALL, FUNCTIONS[funcId].scope, funcId) );
    }
    else if (line[line.length - 1] === FUNC) {
      let newFunc = {};
      
      newFunc.scope = CLASS_TABLE.Hidden;
      
      let indexOf = token.indexOf(":");
      if (indexOf !== -1) {
        newFunc.name = token.substring(0, indexOf);
        newFunc.returnType = CLASS_TABLE[token.substring(indexOf + 1)];
      }
      else {
        newFunc.name = token;
        newFunc.returnType = CLASS_TABLE.Hidden;
      }
      
      //detect which functions are called from outside
      if (newFunc.scope === CLASS_TABLE.Hidden) {
        switch (newFunc.name) {
          case "onResize":
          case "initialize":
          case "onDraw":
            newFunc.js = newFunc.name;
        }
      }
      
      //console.log("new function. name: " + newFunc.name + " returnType: " + CLASSES[newFunc.returnType].name + " js: " + newFunc.js);
      
      //the remaining tokens are parameters
      newFunc.parameters = [];
      for (let j = i + 1; tokens[j] !== "\n"; ++j) {
        let indexOf = tokens[j].indexOf(":");
        let parameter = {};
        parameter.name = tokens[j].substring(0, indexOf);
        parameter.type = CLASS_TABLE[tokens[j].substring(indexOf + 1)];
        newFunc.parameters.push(parameter);
        
        //console.log("parameter name: " + parameter.name + " type: " + CLASSES[parameter.type].name);
      }
      
      let funcId = FUNCTIONS.length;
      FUNCTIONS.push(newFunc);
      let key = newFunc.scope ? `${CLASSES[newFunc.scope].name}.${newFunc.name}` : newFunc.name;
      FUNCTION_TABLE[key] = funcId;
      line.push( makeItemWithMeta(FUNCTION_DEFINITION, newFunc.returnType, funcId) );
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
      
      line.push( makeItemWithMeta(VARIABLE_REFERENCE, type, id) );
    }
  }
  
  return wholeScript;
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
    console.log(`attempting to get item count of row ${row}`);
    return 0;
  }
  
  return script[row].length - 1;
}



function getItem(row, col) {
  row = row|0;
  col = (col|0) + 1; //col paremeter starts at 0, but script[row][0] contains line metadata like indentation
  
  if (row < 0 || row >= script.length || col < 1 || col >= script[row].length)
    return [`${row}, ${col}`, "error", false];
  
  let item = script[row][col];
  let format = item >>> 28; //4 bits
  let data = item & 0xFFFFFFF; //28 bits
  let meta = data >>> 16; //12 bits
  let value = item & 0xFFFF; //16 bits
  
  switch (format) {
    case VARIABLE_REFERENCE:
    {
      let name = variableNames[value] || `var${value}`;
      
      if (meta === CLASS_TABLE.Hidden) {
        return [name, null, true];
      } else {
        let type = CLASSES[meta].name;
        return [`${type}<br>${name}`, "keyword-default", true];
      }
      break;
    }
    
    case FUNCTION_DEFINITION:
    {
      let func = FUNCTIONS[value];
      
      if (meta === CLASS_TABLE.Hidden) {
        return [func.name, "method-definition", true];
      } else {
        let type = CLASSES[meta].name;
        return [`${type}<br>${func.name}`, "keyword-def", true];
      }
      break;
    }
    
    case FUNCTION_CALL:
    {
      let func = FUNCTIONS[value];
      
      if (meta === CLASS_TABLE.Hidden) {
        return [func.name, "method-call", true];
      } else {
        let type = CLASSES[meta].name;
        return [`${type}<br>${func.name}`, "keyword-call", true];
      }
      break;
    }
    
    case ARGUMENT_HINT:
      return [`argument hint`, "comment", false];
    
    case ARGUMENT_LABEL:
      return [`argument label`, "comment", false];
    
    case SYMBOL:
      return [SYMBOLS[data], null, false];

    case KEYWORD:
      return [KEYWORDS[data], "keyword", false];
      
    case NUMERIC_LITERAL:
      return [numericLiterals[data], "numeric", true];
    
    case STRING_LITERAL:
      return [`"${stringLiterals[data]}"`, "string", true];
    
    case COMMENT:
      return [comments[data], "comment", false];
    
    default:
      return [`format<br>${format}`, "error", false];
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
Generates a Function object from the binary script.
Run the function with an object argument to attach .initialize(), .onResize(), and .onDraw() to the object
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
            if (needsCommas)
              js += `v${value}, `;
            else
              js += `v${value} `;
            break;
          
          case FUNCTION_DEFINITION:
          {
            let func = FUNCTIONS[value];
            
            let funcName;
            if ("js" in func) {
              js += `state.${func.js} = function ( `;
            } else {
              js += `function f${value} (`
            }
            
            needsEndParenthesis = true;
            needsCommas = true;
            break;
          }
          
          case FUNCTION_CALL:
          {
            let func = FUNCTIONS[value];
            
            let funcName;
            if ("js" in func) {
              funcName = func.js;
            } else {
              funcName = `f${value}`;
            }
            
            js += `${funcName} `;
            break;
          }
          
          case ARGUMENT_HINT:
            return `/*argument hint*/ `;
          
          case ARGUMENT_LABEL:
            return `/*argument label*/ `;
            
          case SYMBOL:
            js += `${SYMBOLS[value]} `;
            break;
            
          case KEYWORD:
            if (JS_KEYWORDS[value] !== null)
              js += `${JS_KEYWORDS[value]} `;
            break;
            
          case NUMERIC_LITERAL:
            js += `${numericLiterals[value]} `;
            break;
          
          case STRING_LITERAL:
            js += `"${stringLiterals[value]}" `;
            break;
          
          case COMMENT:
            js += `/*${comments[value]}*/ `;
            break;
          
          default:
            js += `/*format ${format}*/ `;
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



function clickItem(row, col) {
  row = row|0;
  col = col|0;
  
  const item = script[row][col + 1];
  
  const LET = makeItem(KEYWORD, KEYWORD_TABLE.let);
  const VAR = makeItem(KEYWORD, KEYWORD_TABLE.var);
  const WHILE = makeItem(KEYWORD, KEYWORD_TABLE.while);
  const UNTIL = makeItem(KEYWORD, KEYWORD_TABLE.until);
  const DEFAULT = makeItem(KEYWORD, KEYWORD_TABLE.default);
  const BREAK = makeItem(KEYWORD, KEYWORD_TABLE.break);
  
  const toggles = [LET, VAR, WHILE, UNTIL, DEFAULT, BREAK];
  
  //console.log(`item ${item} let ${LET} VAR ${VAR}`);
  
  for (let i = 0; i < toggles.length; ++i) {
    if (item === toggles[i]) {
      script[row][col + 1] = toggles[i ^ 1];
      return {instant: getItem(row, col)};
    }
  }
  
  return {};
}

function insertRow(row) {
  script.splice(row, 0, [getIndentation(row-1) + isStartingScope(row-1)]);
}

function deleteRow(row) {
  script.splice(row, 1);
}