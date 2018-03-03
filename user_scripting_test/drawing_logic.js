const canvas = document.getElementById("myCanvas");
const editor = document.getElementById("editor_div");
const context = canvas.getContext("2d");
const callInterval = 16;

let renderLoop = null;
let time = 0.0;
let state = {};
let width = 0;
let height = 0;
let error = null;

function resizeListener() {
	context.canvas.width = width = window.innerWidth;
	context.canvas.height = height = window.innerHeight;
	centerX = canvas.width / 2.0;
	centerY = canvas.height / 2.0;
	
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	console.log("canvas resolution: " + canvas.width + "x" + canvas.height);
}

function hashListener() {
  let hash = window.location.hash;
  
  //console.log("hash is " + hash); //chop off the first char of the hash
  
  if (hash === "") {
    editor.style.display = "block";
    canvas.style.display = "none";
    
    //stop render loop
    if (renderLoop !== null) {
      clearInterval(renderLoop);
      renderLoop = null;
      console.log("stopping render loop");
    }
    
    if (error !== null) {
      alert(error);
      error = null;
    }
  } else {
    editor.style.display = "none";
    canvas.style.display = "block";
    
    //start render loop
    if (renderLoop === null) {
      time = 0;
      state = null;
      renderLoop = setInterval(draw, callInterval);
      console.log("starting render loop");
    }
  }
}

function drawCircle(x, y, r) {
  if (typeof x !== "number") {
    throw "Error in drawCircle: 1st parameter must be of type Number";
  }
  
  if (typeof y !== "number") {
    throw "Error in drawCircle: 2nd parameter must be of type Number";
  }
  
  if (typeof r !== "number") {
    throw "Error in drawCircle: 3rd parameter must be of type Number";
  }
  
  context.beginPath();
  context.arc(x,y,r, 0,2*Math.PI);
  context.stroke();
}

function draw() {
	//clear canvas
	context.beginPath();
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	try {
	  eval(script.value);
	} catch (err) {
	  error = err.message;
	  location.hash = ""; //break out of render loop
	}
	
	time += 1 / callInterval;
}

resizeListener();
hashListener();

script.value =
"/*\n" +
"time     current time in seconds\n" +
"state    object for you to attach data to\n" +
"width    canvas width\n" +
"height   canvas height\n" +
"*/\n\n" +

"let smaller = Math.min(width, height);\n" +
"let theta = time * 0.1;\n" +
"let x = width / 2 + Math.cos(theta) * smaller / 4;\n" +
"let y = height / 2 + Math.sin(theta) * smaller / 4;\n" +
"let r = smaller / 8;\n" +
"drawCircle(x, y, r);\n";