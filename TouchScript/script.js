"use strict";

function Script() {
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
  

  this.nextVariable = 0;
  this.variableNames = {};
  
  this.nextNumericLiteral = 0;
  this.numericLiterals = {};
  
  this.nextStringLiteral = 0;
  this.stringLiterals = {};
  
  this.nextComment = 0;
  this.comments = {};
  
  this.data = [];
  
  let sampleScript;
  {
    const [CLASSES, CLASS_MAP, FUNCTIONS, FUNCTION_MAP, SYMBOLS, SYMBOL_MAP, KEYWORDS, JS_KEYWORDS, KEYWORD_MAP, SAMPLE_SCRIPT]
      = getBuiltIns();
    
    this.classes = CLASSES;
    this.classMap = CLASS_MAP;
    this.functions = FUNCTIONS;
    this.functionMap = FUNCTION_MAP;
    this.symbols = SYMBOLS;
    this.symbolMap = SYMBOL_MAP;
    this.keywords = KEYWORDS;
    this.jsKeywords = JS_KEYWORDS;
    this.keywordMap = KEYWORD_MAP;
    sampleScript = SAMPLE_SCRIPT;
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
  
  //Object.defineProperty(this, 'length', {get: () => {return this.data.length;}});
  this.getRowCount = function() {
    return this.data.length;
  }
  
  this.getItemCount = function(row) {
    row = row|0;
    
    if (row < 0 || row >= this.data.length) {
      console.log(`attempting to get item count of row ${row}`);
      return 0;
    }
    
    return this.data[row].length - 1;
  }
  
  this.getItem = function(row, col) {
    row = row|0;
    col = (col|0) + 1; //col paremeter starts at 0, but script[row][0] contains line metadata like indentation
    
    if (row < 0 || row >= this.data.length || col < 1 || col >= this.data[row].length)
      return [`${row}\n${col}`, " error"];
    
    let item = this.data[row][col];
    let format = item >>> 28; //4 bits
    let data = item & 0xFFFFFFF; //28 bits
    let meta = data >>> 16; //12 bits
    let value = item & 0xFFFF; //16 bits
    
    switch (format) {
      case VARIABLE_REFERENCE:
      {
        let name = this.variableNames[value] || `var${value}`;
        
        if (meta === 0) {
          return [name, ""];
        } else {
          let type = this.classes[meta].name;
          return [type + '\n' + name, " keyword-default"];
        }
        break;
      }
      
      case FUNCTION_DEFINITION:
      {
        let func = this.functions[value];
        
        if (meta === 0) {
          return [func.name, " method-definition"];
        } else {
          let type = this.classes[meta].name;
          return [type + '\n' + func.name, " keyword-def"];
        }
        break;
      }
      
      case FUNCTION_CALL:
      {
        let func = this.functions[value];
        
        if (meta === 0) {
          return [func.name, " method-call"];
        } else {
          let type = this.classes[meta].name;
          return [type + '\n' + func.name, " keyword-call"];
        }
        break;
      }
      
      case ARGUMENT_HINT:
        return [`argument hint`, " comment"];
      
      case ARGUMENT_LABEL:
        return [`argument label`, " comment"];
      
      case SYMBOL:
        return [this.symbols[data], ""];
  
      case KEYWORD:
        return [this.keywords[data], " keyword"];
        
      case NUMERIC_LITERAL:
        return [this.numericLiterals[data], " numeric"];
      
      case STRING_LITERAL:
        return [this.stringLiterals[data], " string"];
      
      case COMMENT:
        return [this.comments[data], " comment"];
      
      default:
        return [`format\n${format}`, " error"];
    }
  }
  
  
  this.getIndentation = function(row) {
    row |= 0;
    return this.data[row][0] & 0xFFFF;
  }
  
  this.isStartingScope = function(row) {
    row |= 0;
    return this.data[row][0] >>> 31;
  }
  
  
  /*
  Generates a Function object from the binary script.
  Run the function with an object argument to attach .initialize(), .onResize(), and .onDraw() to the object
  */
  this.getJavaScript = function() {
    let js = "";
    
    for (let row = 0; row < this.data.length; ++row) {
      let indentation = this.getIndentation(row);
      js += " ".repeat(indentation);
      
      let needsEndParenthesis = false;
      let needsCommas = false;
      
      let rowData = this.data[row];
      for (let col = 1; col < rowData.length; ++col) {
          let item = this.data[row][col];
          let format = item >>> 28;
          let value = item & 0xFFFF; //least sig 16 bits
          
          //if the first item is a keyword that begins a parenthesis
          if (format === KEYWORD) {
            let keyword = this.jsKeywords[value];
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
              let func = this.functions[value];
              
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
              let func = this.functions[value];
              
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
              js += `${this.symbols[value]} `;
              break;
              
            case KEYWORD:
              if (this.jsKeywords[value] !== null)
                js += `${this.jsKeywords[value]} `;
              break;
              
            case NUMERIC_LITERAL:
              js += `${this.numericLiterals[value]} `;
              break;
            
            case STRING_LITERAL:
              js += `"${this.stringLiterals[value]}" `;
              break;
            
            case COMMENT:
              js += `/*${this.comments[value]}*/ `;
              break;
            
            default:
              js += `/*format ${format}*/ `;
          }
      }
      
      if (needsEndParenthesis)
        js += ") ";
      
      if (this.isStartingScope(row))
        js += "{ ";
      
      if (row < this.data.length - 1) {
        let nextIndentation = this.getIndentation(row + 1);
        let expectedIndentation = indentation + this.isStartingScope(row);
        if (nextIndentation < expectedIndentation) {
          js += "}";
        }
      }
      
      if (row == this.data.length - 1 && indentation > 0)
        js += "}".repeat(indentation);
      
      js += "\n";
    }
    
    console.log(js);
    
    //compile the string into a function and attach it to an object
    let func = new Function("state", js);
    let state = {};
    func(state);
    return state;
  }
  
  
  
  this.clickItem = function(row, col) {
    row = row|0;
    col = col|0;
    
    const item = this.data[row][col + 1];
    
    const LET = makeItem(KEYWORD, this.keywordMap.get("let"));
    const VAR = makeItem(KEYWORD, this.keywordMap.get("var"));
    const WHILE = makeItem(KEYWORD, this.keywordMap.get("while"));
    const UNTIL = makeItem(KEYWORD, this.keywordMap.get("until"));
    const DEFAULT = makeItem(KEYWORD, this.keywordMap.get("default"));
    const BREAK = makeItem(KEYWORD, this.keywordMap.get("break"));
    
    const toggles = [LET, VAR, WHILE, UNTIL, DEFAULT, BREAK];
    
    //console.log(`item ${item} let ${LET} VAR ${VAR}`);
    
    for (let i = 0; i < toggles.length; ++i) {
      if (item === toggles[i]) {
        this.data[row][col + 1] = toggles[i ^ 1];
        return {instant: this.getItem(row, col)};
      }
    }
    
    return {};
  }
  
  this.insertRow = function(row) {
    this.data.splice(row, 0, [this.getIndentation(row-1) + this.isStartingScope(row-1)]);
  }
  
  this.deleteRow = function(row) {
    this.data.splice(row, 1);
  }
  
  
  
  //load script data
  //define specific item values to test for later
  const FUNC = makeItem(KEYWORD, this.keywordMap.get("func"));
  
  let line = [0];
  let indentation = 0;
  
  let tokens = sampleScript.match(/(?:\/\*(?:[^*]|(?:\*+(?:[^*\/])))*\*+\/)|(?:\/\/.*)|(?:[^\s(,)=+\-*\/"]+|"[^"]*")+|[\n,()]|[=+\-\*\/]+/g);
  
  for (let i = 0; i < tokens.length; ++i) {
    let token = tokens[i];
    
    //figure out what this token refers to
    if (token === "\n") {
      this.data.push(line);
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
      this.stringLiterals[this.nextStringLiteral] = token.substring(1, token.length - 1);
      line.push( makeItem(STRING_LITERAL, this.nextStringLiteral++) );
    }
    else if (token.startsWith("//")) {
      this.comments[this.nextComment] = token.substring(2);
      line.push( makeItem(COMMENT, this.nextComment++));
    }
    else if (token.startsWith("/*")) {
      this.comments[this.nextComment] = token.substring(2, token.length - 2);
      line.push( makeItem(COMMENT, this.nextComment++));
    }
    else if(!isNaN(token)) {
      this.numericLiterals[this.nextNumericLiteral] = token;
      line.push( makeItem(NUMERIC_LITERAL, this.nextNumericLiteral++) );
    }
    else if (this.symbolMap.has(token)) {
      line.push( makeItem(SYMBOL, this.symbolMap.get(token)) );
    }
    else if (this.keywordMap.has(token)) {
      line.push( makeItem(KEYWORD, this.keywordMap.get(token)) );
    }
    else if (this.functionMap.has(token)) {
      let funcId = this.functionMap.get(token);
      line.push( makeItemWithMeta(FUNCTION_CALL, this.functions[funcId].scope, funcId) );
    }
    else if (line[line.length - 1] === FUNC) {
      let newFunc = {};
      
      newFunc.scope = 0;
      
      let indexOf = token.indexOf(":");
      if (indexOf !== -1) {
        newFunc.name = token.substring(0, indexOf);
        newFunc.returnType = this.classMap.get(token.substring(indexOf + 1));
      }
      else {
        newFunc.name = token;
        newFunc.returnType = 0;
      }
      
      //detect which functions are called from outside
      if (newFunc.scope === 0) {
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
        parameter.type = this.classMap.get(tokens[j].substring(indexOf + 1));
        newFunc.parameters.push(parameter);
        
        //console.log("parameter name: " + parameter.name + " type: " + CLASSES[parameter.type].name);
      }
      
      let funcId = this.functions.length;
      this.functions.push(newFunc);
      let key = newFunc.scope ? `${this.classes[newFunc.scope].name}.${newFunc.name}` : newFunc.name;
      this.functionMap.set(key, funcId);
      line.push( makeItemWithMeta(FUNCTION_DEFINITION, newFunc.returnType, funcId) );
    }
    else {
      let indexOf = token.indexOf(":");
      let name = (indexOf === -1) ? token : token.substring(0, indexOf);
      
      let id = -1;
      for (let i = 0, keys = Object.keys(this.variableNames); i < keys.length; ++i) {
        if (this.variableNames[i] === name) {
          id = i;
          break;
        }
      }
      
      if (id === -1) {
        this.variableNames[this.nextVariable] = name;
        id = this.nextVariable++;
      }
      
      let type = (indexOf === -1) ? 0 : this.classMap.get(token.substring(indexOf + 1));
      
      line.push( makeItemWithMeta(VARIABLE_REFERENCE, type, id) );
    }
  }
}