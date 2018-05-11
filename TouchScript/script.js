Array.prototype.peek = function() {
  return this[this.length - 1];
}

class Script {
  constructor() {
    this.nextNumericLiteral = 0;
    this.numericLiterals = new Map();
    this.nextStringLiteral = 0;
    this.stringLiterals = new Map();
    this.nextComment = 0;
    this.comments = new Map();
    this.data = [];

    const [CLASSES, CLASS_MAP, VARIABLES, FUNCTIONS, FUNCTION_MAP, SYMBOLS, SYMBOL_MAP, KEYWORDS, JS_KEYWORDS, KEYWORD_MAP, SAMPLE_SCRIPT] = getBuiltIns();
    this.classes = CLASSES;
    this.classMap = CLASS_MAP;
    this.variables = VARIABLES;
    this.functions = FUNCTIONS;
    this.functionMap = FUNCTION_MAP;
    this.symbols = SYMBOLS;
    this.symbolMap = SYMBOL_MAP;
    this.keywords = KEYWORDS;
    this.jsKeywords = JS_KEYWORDS;
    this.keywordMap = KEYWORD_MAP;

    this.ITEMS = {};
    this.ITEMS.FUNC     = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("func"));
    this.ITEMS.LET      = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("let"));
    this.ITEMS.VAR      = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("var"));
    this.ITEMS.SWITCH   = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("switch"));
    this.ITEMS.CASE     = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("case"));
    this.ITEMS.DEFAULT  = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("default"));
    this.ITEMS.BREAK    = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("break"));
    this.ITEMS.CONTINUE = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("continue"));
    this.ITEMS.IF       = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("if"));
    this.ITEMS.FOR      = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("for"));
    this.ITEMS.IN       = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("in"));
    this.ITEMS.WHILE    = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("while"));
    this.ITEMS.RETURN   = Script.makeItem(Script.KEYWORD, KEYWORD_MAP.get("return"));
    this.toggles = [this.ITEMS.VAR, this.ITEMS.LET, this.ITEMS.WHILE, this.ITEMS.UNTIL, this.ITEMS.CONTINUE, this.ITEMS.BREAK];

    this.ITEMS.EQUALS            = Script.makeItem(Script.SYMBOL, SYMBOL_MAP.get("="));
    this.ITEMS.START_PARENTHESIS = Script.makeItem(Script.SYMBOL, SYMBOL_MAP.get("("));
    this.ITEMS.END_PARENTHESIS   = Script.makeItem(Script.SYMBOL, SYMBOL_MAP.get(")"));
    this.ITEMS.START_BRACKET     = Script.makeItem(Script.SYMBOL, SYMBOL_MAP.get("["));
    this.ITEMS.END_BRACKET       = Script.makeItem(Script.SYMBOL, SYMBOL_MAP.get("]"));
    this.ITEMS.DOT               = Script.makeItem(Script.SYMBOL, SYMBOL_MAP.get("."));
    this.ITEMS.COMMA             = Script.makeItem(Script.SYMBOL, SYMBOL_MAP.get(","));
    this.NOT_OPERANDS = [this.ITEMS.END_PARENTHESIS, this.ITEMS.END_BRACKET, this.ITEMS.DOT];

    this.HINTS = {};
    this.HINTS.ITEM = this.makeCommentItem("item");
    this.HINTS.COLLECTION = this.makeCommentItem("collection");
    this.HINTS.VALUE = this.makeCommentItem("value");
    this.HINTS.CONDITION = this.makeCommentItem("condition");
    this.HINTS.EXPRESSION = this.makeCommentItem("expression");
    this.HINTS.CONTROL_EXPRESSION = this.makeCommentItem("control expression");

    this.PAYLOADS = {};
    this.PAYLOADS.MUTABLE_VARIABLES = Script.makeItem(15, 0x0FFFFFFF);
    this.PAYLOADS.VAR_OPTIONS = Script.makeItem(15, 0x0FFFFFFE);
    this.PAYLOADS.FUNCTION_DEFINITION = Script.makeItem(15, 0x0FFFFFFD);
    this.PAYLOADS.FUNCTION_REFERENCE = Script.makeItem(15, 0x0FFFFFFC);

    function includes(i) {
      return i >= this.start && i < this.end;
    }

    this.BINARY_OPERATORS = {start: 9, end: 27, includes};
    this.UNARY_OPERATORS = {start: 27, end: 31, includes};
    
    if (SAMPLE_SCRIPT)
      this.loadScript(SAMPLE_SCRIPT);
  }

  static makeItemWithMeta(format, meta, value) {
    format &= 0xF;
    meta &= 0xFFF;
    value &= 0xFFFF;
    return format << 28 | meta << 16 | value;
  }

  static makeItem(format, value) {
    format &= 0xF;
    value &= 0xFFFFFFF;
    return format << 28 | value;
  }

  makeCommentItem(text) {
    this.comments.set(this.nextComment, text);
    return Script.makeItem(Script.COMMENT, this.nextComment++);
  }

  loadScript(sampleScript) {
    let line = [0];
    let indentation = 0;
    let isFuncDef = false;
    let hasEndBracket = false;
    let parenthesisCount = 0;
    let tokens = sampleScript.match(/(?:\/\*(?:[^*]|(?:\*+(?:[^*\/])))*\*+\/)|(?:\/\/.*)|(?:[^\s(,)=+\-*\/"]+|"[^"]*")+|[\n,()]|[=+\-\*\/]+/g);

    for (let i = 0; i < tokens.length; ++i) {
      let token = tokens[i];
      
      //figure out what this token refers to
      if (token === "\n") {
        if (hasEndBracket)
          hasEndBracket = false;
        else {
          this.data.push(line);
          line = [indentation];
          isFuncDef = false;
        }
      }
      else if (token === "{") {
        ++indentation;
        line[0] |= 1 << 31;
      }
      else if (token === "}") {
        --indentation;
        hasEndBracket = true;
        line[0] = (line[0] & 0xFFFF0000) | indentation;
      }
      else if (token.startsWith('"')) {
        this.stringLiterals.set(this.nextStringLiteral, token.substring(1, token.length - 1));
        line.push(Script.makeItem(Script.STRING_LITERAL, this.nextStringLiteral++));
      }
      else if (token.startsWith("//")) {
        line.push(makeCommentItemtoken.substring(2));
      }
      else if (token.startsWith("/*")) {
        line.push(makeCommentItemtoken.substring(2, token.length - 2));
      }
      else if (!isNaN(token)) {
        this.numericLiterals.set(this.nextNumericLiteral, token);
        line.push(Script.makeItem(Script.NUMERIC_LITERAL, this.nextNumericLiteral++));
      }
      else if (this.symbolMap.has(token)) {
        line.push(Script.makeItem(Script.SYMBOL, this.symbolMap.get(token)));
        let last = line.peek();
        if (last == this.ITEMS.START_PARENTHESIS)
          ++parenthesisCount;
        else if (last == this.ITEMS.END_PARENTHESIS)
          --parenthesisCount;
      }
      else if (this.keywordMap.has(token)) {
        line.push(Script.makeItem(Script.KEYWORD, this.keywordMap.get(token)));
      }
      else if (this.functionMap.has(token)) {
        let funcId = this.functionMap.get(token);
        line.push(Script.makeItemWithMeta(Script.FUNCTION_REFERENCE, this.functions[funcId].scope, funcId));
      }
      else if (this.classMap.has(token)) {
        line.push(Script.makeItem(Script.KEYWORD, this.keywordMap.get(token)));
      }
      
      //this token represents a function definition
      else if (line.peek() === this.ITEMS.FUNC) {
        isFuncDef = true;

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
        
        //console.log("new function. name: " + newFunc.name + " returnType: " + this.classes[newFunc.returnType].name + " js: " + newFunc.js);
        //the remaining tokens are parameters
        newFunc.parameters = [];
        for (let j = i + 1; tokens[j] !== "\n"; ++j) {
          let indexOf = tokens[j].indexOf(":");
          let parameter = {};
          parameter.name = tokens[j].substring(0, indexOf);
          parameter.type = this.classMap.get(tokens[j].substring(indexOf + 1));
          newFunc.parameters.push(parameter);
        }
        
        let funcId = this.functions.length;
        this.functions.push(newFunc);
        let key = newFunc.scope ? `${this.classes[newFunc.scope].name}.${newFunc.name}` : newFunc.name;
        this.functionMap.set(key, funcId);
        
        line.push(Script.makeItemWithMeta(Script.FUNCTION_DEFINITION, newFunc.returnType, funcId));
      }
      
      //this token represents a variable declaration or parameter
      else if (isFuncDef || line.peek() === this.ITEMS.LET || line.peek() === this.ITEMS.VAR || (parenthesisCount === 0 && line.peek() === this.ITEMS.COMMA)) {
        let variable = {};
        
        let indexOf = token.indexOf(":");
        if (indexOf >= 0) {
          variable.name = token.substring(0, indexOf);
          variable.type = this.classMap.get(token.substring(indexOf + 1));
        } else {
          variable.name = token;
          variable.type = this.classMap.get("Hidden");
        }
        
        variable.scope = this.classMap.get("Hidden");
        
        let id = this.variables.length;
        this.variables.push(variable);
        
        ++this.nextVariable;
        
        line.push(Script.makeItemWithMeta(Script.VARIABLE_DEFINITION, variable.type, id));
      }
      
      //assume token is a variable reference of some form
      else {
        let name, scope;
        
        let indexOf = token.lastIndexOf(".");
        if (indexOf === -1) {
          name = token;
          scope = this.classMap.get("Hidden");
        } else {
          name = token.substring(indexOf + 1);
          scope = this.classMap.get(token.substring(0, indexOf));
        }
        
        let id = -1;
        for (let i = 0; i < this.variables.length; ++i) {
          const variable = this.variables[i];
          if (name === variable.name && scope === variable.scope) {
            id = i;
            break;
          }
        }
        
        if (id === -1) {
          this.comments.set(this.nextComment, `unrecognized token\n${token}`);
          line.push(Script.makeItem(Script.COMMENT, this.nextComment++));
        } else {
          let variable = this.variables[id];
          line.push(Script.makeItemWithMeta(Script.VARIABLE_REFERENCE, scope, id));
        }
      }
    }
    
    if (line.length > 1)
      this.data.push(line);
  }

  itemClicked(row, col) {
    row = row | 0;
    col = col | 0;
    const item = this.data[row][col];
    
    for (let i = 0; i < this.toggles.length; ++i) {
      if (item === this.toggles[i]) {
        if (item === this.ITEMS.VAR && this.data[row][3] !== this.ITEMS.EQUALS)
          break;

        this.data[row][col] = this.toggles[i ^ 1];
        const [text, style] = this.getItem(row, col);
        return {text, style, payload: 0};
      }
    }

    let prevFormat = this.data[row][col - 1] >>> 28;

    if (prevFormat === Script.SYMBOL) {
      if (! this.NOT_OPERANDS.includes(this.data[row][col - 1])) {
        return this.getVisibleVariables(row, false);
      }
    }

    if (prevFormat === Script.VARIABLE_REFERENCE) {
      if (! this.NOT_OPERANDS.includes(this.data[row][col - 1])) {
        return this.getVisibleVariables(row, false);
      }
    }

    let format = this.data[row][col] >>> 28;

    if (format === Script.VARIABLE_REFERENCE) {
      return this.getVisibleVariables(row, true);
    }

    //TODO provide menu items for existing items
    return [];
  }

  appendClicked(row) {
    const rowCount = this.getRowCount();
    const itemCount = (row < rowCount) ? this.getItemCount(row) : 1;

    if (itemCount === 1) {
      let options;

      const indentation = (row < rowCount) ? this.getIndentation(row) : 0;
      let enclosingScopeType = 0;
      for (let r = Math.min(rowCount, row) - 1; r >= 0; --r) {
        if (this.getIndentation(r) === indentation - 1) {
          enclosingScopeType = this.data[r][1];
          break;
        }
      }

      if (enclosingScopeType === this.ITEMS.SWITCH) {
        options = [
          {text: "case", style: "keyword", payload: this.ITEMS.CASE}, 
          {text: "default", style: "keyword", payload: this.ITEMS.DEFAULT}
        ];
      } else {
        options = [
          {text: "=", style: "", payload: this.PAYLOADS.MUTABLE_VARIABLES},
          //{text: "f(x)", style: "function-call", payload: Script.FUNCTION_REFERENCE << 28},
          {text: "func", style: "keyword", payload: this.PAYLOADS.FUNCTION_DEFINITION},
          {text: "let", style: "keyword", payload: this.ITEMS.LET},
          {text: "var", style: "keyword", payload: this.PAYLOADS.VAR_OPTIONS},
          {text: "if", style: "keyword", payload: this.ITEMS.IF},
          {text: "for", style: "keyword", payload: this.ITEMS.FOR},
          {text: "while", style: "keyword", payload: this.ITEMS.WHILE},
          {text: "switch", style: "keyword", payload: this.ITEMS.SWITCH}
        ];

        if (enclosingScopeType !== 0) {
          options.push(
            {text: "return", style: "keyword", payload: this.ITEMS.RETURN}
          );
        }
      }

      return options;
    }

    if (this.data[row][1] === this.ITEMS.VAR) {
      if (itemCount === 3) {
        return [
          {text: "=", style: "", payload: this.ITEMS.EQUALS},
          {text: ",", style: "", payload: this.ITEMS.COMMA}
        ];
      }

      if (this.data[row][3] === this.ITEMS.COMMA) {
        return [
          {text: ",", style: "", payload: this.ITEMS.COMMA}
        ];
      }
    }

    if (this.data[row][1] === this.ITEMS.FUNC) {
      let options = [];

      for (let i = 2; i < this.classes.length; ++i) {
        const c = this.classes[i];
        if (c.size > 0)
          options.push({text: c.name, style: "keyword", payload: Script.makeItemWithMeta(Script.ARGUMENT_LABEL, i, 0)});
      }

      return options;
    }

    const prevItem = this.data[row][this.data[row].length - 1];
    if (prevItem >>> 28 === Script.SYMBOL) {
      let symbol = prevItem & 0x00FFFFFF;
      let options = [];

      if (this.BINARY_OPERATORS.includes(symbol)) {
        for (let i = this.UNARY_OPERATORS.start; i < this.UNARY_OPERATORS.end; ++i) {
          options.push({text: this.symbols[i], style: "", payload: Script.makeItem(Script.SYMBOL, i)});
        }

        options.push(...this.getVisibleVariables(row, false));
      }
      else if (this.UNARY_OPERATORS.includes(symbol)) {
        options.push(...this.getVisibleVariables(row, false));
      }
      
      return options;
    }

    if (prevItem >>> 28 === Script.VARIABLE_REFERENCE) {
      let options = [];
      for (let i = this.BINARY_OPERATORS.start; i < this.BINARY_OPERATORS.end; ++i) {
        options.push({text: this.symbols[i], style: "", payload: Script.makeItem(Script.SYMBOL, i)});
      }
      return options;
    }

    return [];
  }

  //0 -> no change, 1 -> click item changed, 2-> row changed, 3 -> row(s) inserted
  menuItemClicked(row, col, payload) {
    let indentation;
    if (row < this.getRowCount())
      indentation = this.getIndentation(row - 1) + this.isStartingScope(row - 1);
    else
      indentation = 0;
    
    while (row >= this.data.length) {
      this.data.push([indentation]);
    }

    switch (payload) {
      case this.ITEMS.CASE:
        this.data[row][0] |= 1 << 31;
        this.data[row].push(payload, this.HINTS.VALUE);
        return 3;

      case this.ITEMS.DEFAULT:
        this.data[row][0] |= 1 << 31;
        this.data[row].push(payload);
        return 3;
      
      case this.ITEMS.LET:
      case this.ITEMS.VAR: {
        let varId = this.variables.length;
        this.variables.push({name: `var${varId}`, type: 0});
        this.data[row].push(payload, Script.makeItem(Script.VARIABLE_DEFINITION, varId), this.ITEMS.EQUALS, this.HINTS.EXPRESSION);
        return 2;
      }

      case this.PAYLOADS.VAR_OPTIONS: {
        let options = [{text: "= expression", style: "comment", payload: this.ITEMS.VAR}];

        for (let i = 2; i < this.classes.length; ++i) {
          const c = this.classes[i];
          if (c.size > 0)
            options.push({text: c.name, style: "keyword", payload: Script.makeItemWithMeta(Script.VARIABLE_DEFINITION, i, 0)});
        }

        return options;
      }
      
      case this.ITEMS.IF:
      case this.ITEMS.WHILE:
        this.data[row][0] |= 1 << 31;
        this.data[row].push(payload, this.HINTS.CONDITION);
        return 3;

      case this.ITEMS.FOR:
        this.data[row][0] |= 1 << 31;
        this.data[row].push(payload, this.HINTS.ITEM, this.ITEMS.IN, this.HINTS.COLLECTION);
        return 3;

      case this.ITEMS.SWITCH:
        this.data[row][0] |= 1 << 31;
        this.data[row].push(payload, this.HINTS.CONTROL_EXPRESSION);
        return 3;
      
      case this.ITEMS.RETURN: {
        let returnType = 0;
        for (let r = row - 1; r >= 0; --r) {
          if (this.data[row][1] === this.ITEMS.FUNC) {
            returnType = (this.data[row][1] >>> 16) & 0x0FFF;
            break;
          }
        }

        this.data[row].push(payload);
        if (returnType > 0)
          this.data[row].push(this.HINTS.EXPRESSION);
        
        return 2;
      }

      case this.PAYLOADS.FUNCTION_DEFINITION: {
        let funcId = this.functions.length;
        let newFunc = {name: `f${funcId}`, returnType: 0, parameters: []};
        this.functions.push(newFunc);
        this.data[row][0] |= 1 << 31;
        this.data[row].push(this.ITEMS.FUNC, Script.makeItemWithMeta(Script.FUNCTION_DEFINITION, newFunc.returnType, funcId));
        return 3;
      }

      case this.ITEMS.EQUALS:
        this.data[row].push(this.ITEMS.EQUALS, this.HINTS.EXPRESSION);
        return 2;

      case this.ITEMS.COMMA: {
        let varId = this.variables.length;
        let type = (this.data[row].peek() >>> 16) & 0x0FFF;
        this.variables.push({name: `var${varId}`, type: type});
        this.data[row].push(this.ITEMS.COMMA, Script.makeItemWithMeta(Script.VARIABLE_DEFINITION, type, varId));
        return 2;
      }

      case this.PAYLOADS.MUTABLE_VARIABLES: {
        return this.getVisibleVariables(row, true);
      }
    }

    let format = payload >>> 28;
    let meta = (payload >>> 16) & 0x0FFF;
    let data = payload & 0xFFFF;

    //if a specific variable reference is provided
    if (format === Script.VARIABLE_REFERENCE) {
      let varId = payload & 0xFFFF;
      let variable = this.variables[varId];
      
      if (this.data[row].length === 1) {
        this.data[row].push(
          Script.makeItemWithMeta(Script.VARIABLE_REFERENCE, variable.type, varId),
          this.ITEMS.EQUALS,
          this.HINTS.EXPRESSION
        );
        return 2;
      }

      if (col === -1)
        col = this.data[row].length;

      this.data[row][col] = payload;
      return 1;
    }

    //user choose a type for a variable declaration
    if (format === Script.VARIABLE_DEFINITION) {
      let varId = this.variables.length;
      let type = meta;
      this.variables.push({name: `var${varId}`, type: meta});
      this.data[row].push(this.ITEMS.VAR, Script.makeItemWithMeta(Script.VARIABLE_DEFINITION, type, varId));
      return 2;
    }

    //appending additional parameters
    if (format === Script.ARGUMENT_LABEL) {
      let varId = this.variables.length;
      let type = meta;
      this.variables.push({name: `var${varId}`, type: meta});
      this.data[row].push(Script.makeItemWithMeta(Script.VARIABLE_DEFINITION, type, varId));
      return 2;
    }

    if (format === Script.SYMBOL) {
      if (col === -1)
        col = this.data[row].length;
      
      this.data[row][col] = payload;
      return 2;
    }

    return 0;
  }

  getVisibleVariables(row, requiresMutable) {
    let options = [];

    let indentation = this.getIndentation(row);
    for (let r = row - 1; r >= 0; --r) {
      let lineIndentation = this.getIndentation(r);
      if (lineIndentation + this.isStartingScope(r) <= indentation && this.data[r].length > 1) {
        indentation = Math.min(indentation, lineIndentation);
        if (!requiresMutable || this.data[r][1] === this.ITEMS.VAR) {
          let itemCount = this.data[r].length;
          for (let col = 1; col < itemCount; ++col) {
            if (this.data[r][col] >>> 28 === Script.VARIABLE_DEFINITION) {
              let varId = this.data[r][col] & 0xFFFF;
              const [text, style] = this.getItem(r, col);
              options.push({text, style, payload: (Script.VARIABLE_REFERENCE << 28) | varId});
            }
          }
        }
      }
    }

    return options;
  }

  insertRow(row) {
    let line = [this.getIndentation(row - 1) + this.isStartingScope(row - 1)];
    this.data.splice(row, 0, line);
  }

  deleteRow(row) {
    this.data.splice(row, 1);
  }

  getRowCount() {
    return this.data.length;
  }

  getItemCount(row) {
    return this.data[row].length;
  }

  getIndentation(row) {
    return this.data[row][0] & 0xFFFF;
  }

  isStartingScope(row) {
    return this.data[row][0] >>> 31;
  }

  getItem(row, col) {
    row = row | 0;
    col = col | 0;

    let item = this.data[row][col];
    let format = item >>> 28; //4 bits
    let data = item & 0xFFFFFFF; //28 bits
    let meta = data >>> 16; //12 bits
    let value = item & 0xFFFF; //16 bits

    switch (format) {
      case Script.VARIABLE_DEFINITION:
      {
        let name = this.variables[value].name || `var${value}`;
        if (meta === 0)
          return [name, "declaration"];
        else
          return [this.classes[meta].name + '\n' + name, "keyword-declaration"];
      }

      case Script.VARIABLE_REFERENCE:
      {
        let name = this.variables[value].name || `var${value}`;
        if (meta === 0)
          return [name, ""];
        else
          return [this.classes[meta].name + '\n' + name, "keyword"];
      }

      case Script.FUNCTION_DEFINITION:
      {
        let func = this.functions[value];
        if (meta === 0)
          return [func.name, "function-definition"];
        else
          return [this.classes[meta].name + '\n' + func.name, "keyword-def"];
      }

      case Script.FUNCTION_REFERENCE:
      {
        let func = this.functions[value];
        if (meta === 0)
          return [func.name, "function-call"];
        else
          return [this.classes[meta].name + '\n' + func.name, "keyword-call"];
      }

      case Script.ARGUMENT_HINT:
        return [`argument hint`, "comment"];

      case Script.ARGUMENT_LABEL:
        return [`argument label`, "comment"];

      case Script.SYMBOL:
        return [this.symbols[data], ""];

      case Script.KEYWORD:
        return [this.keywords[data], "keyword"];

      case Script.NUMERIC_LITERAL:
        return [this.numericLiterals.get(data), "numeric"];

      case Script.STRING_LITERAL:
        return [this.stringLiterals.get(data), "string"];

      case Script.COMMENT:
        return [this.comments.get(data), "comment"];

      default:
        return [`format\n${format}`, "error"];
    }
  }

  /*
  Generates a Function object from the binary script.
  Run the function with an object argument to attach .initialize(), .onResize(), and .onDraw() to the object
  */
  getJavaScript() {
    let js = "";
    for (let row = 0; row < this.data.length; ++row) {
      let indentation = this.getIndentation(row);
      js += " ".repeat(indentation);

      let rowData = this.data[row];

      let needsEndParenthesis = false;
      let needsEndColon = false;
      let needsCommas = false;

      //check the first symbol
      if (rowData[1] === this.ITEMS.CASE || rowData[1] === this.ITEMS.DEFAULT) {
        needsEndColon = true;
        console.log(`needs an end colon`);
        console.log(rowData[1]);
        console.log(this.ITEMS.CASE);
        console.log(this.ITEMS.DEFAULT);
      } else if ((rowData[1] >>> 28) === Script.KEYWORD) {
        if (this.jsKeywords[(rowData[1] & 0xFFFF)].endsWith("(")) {
          needsEndParenthesis = true;
        }
      }

      for (let col = 1; col < rowData.length; ++col) {
        let item = rowData[col];
        let format = item >>> 28;
        let value = item & 0xFFFF; //least sig 16 bits

        //append an end parenthesis to the end of the line
        switch (format) {
          case Script.VARIABLE_DEFINITION:
          case Script.VARIABLE_REFERENCE:
            if ("js" in this.variables[value]) {
              js += this.variables[value].js;
            } else {
              js += `v${value}`;
            }
            
            js += (needsCommas) ? ", " : " ";
            break;

          case Script.FUNCTION_DEFINITION:
          {
            let func = this.functions[value];
            let funcName;

            if ("js" in func) {
              js += `${func.js} = function ( `;
            }
            else {
              js += `function f${value} (`;
            }

            needsEndParenthesis = true;
            needsCommas = true;
            break;
          }

          case Script.FUNCTION_REFERENCE:
          {
            let func = this.functions[value];
            let funcName;
            if ("js" in func) {
              funcName = func.js;
            }
            else {
              funcName = `f${value}`;
            }
            js += `${funcName} `;
            break;
          }

          case Script.ARGUMENT_HINT:
            return `/*argument hint*/ `;

          case Script.ARGUMENT_LABEL:
            return `/*argument label*/ `;

          case Script.SYMBOL:
            js += `${this.symbols[value]} `;
            break;

          case Script.KEYWORD:
            if (this.jsKeywords[value] !== null)
              js += `${this.jsKeywords[value]} `;
            break;

          case Script.NUMERIC_LITERAL:
            js += `${this.numericLiterals.get(value)} `;
            break;

          case Script.STRING_LITERAL:
            js += `"${this.stringLiterals.get(value)}" `;
            break;

          case Script.COMMENT:
            js += `/*${this.comments.get(value)}*/ `;
            break;

          default:
            js += `/*format ${format}*/ `;
        }
      }

      if (needsEndParenthesis)
        js += ") ";

      if (needsEndColon)
        js += ": ";

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

    return new Function(js);
  }
}

/* Static constants  */
Script.VARIABLE_DEFINITION  = 0;
Script.VARIABLE_REFERENCE   = 1;
Script.FUNCTION_DEFINITION  = 2;
Script.FUNCTION_REFERENCE   = 3;
Script.ARGUMENT_HINT        = 4;
Script.ARGUMENT_LABEL       = 5;
Script.SYMBOL               = 6;
Script.KEYWORD              = 7;
Script.NUMERIC_LITERAL      = 8;
Script.STRING_LITERAL       = 9;
Script.COMMENT              = 10;