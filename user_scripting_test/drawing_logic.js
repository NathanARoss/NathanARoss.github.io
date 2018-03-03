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
      //console.log("stopping render loop");
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
      //console.log("starting render loop");
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

script.value = `
/*
time     current time in seconds
state    object for you to attach data to
width    canvas width
height   canvas height
*/

//initialization
if (state === null) {
    state = {};
    state.pos = {x: width / 2, y: height / 2};
    state.vel = {x: 0, y: 0};
    state.gravity = {x: 0, y: 0};
    state.size = 10;
    state.previousUpdate = -10; //10 seconds in the past
}

//generate a random gravity
if (time - state.previousUpdate > 10) {
    state.previousUpdate += 10;
    let theta = Math.random() * 2 * Math.PI;

    state.gravity.x = Math.cos(theta) * 0.1;
    state.gravity.y = Math.sin(theta) * 0.1;
}


//hit horizontal edge
if (state.pos.x + state.size > width || state.pos.x - state.size < 0) {
    state.vel.x = -state.vel.x / 2;
}

//hits vertical edge
if (state.pos.y + state.size > height || state.pos.y - state.size < 0) {
    state.vel.y = -state.vel.y;
}

state.vel.x += state.gravity.x;
state.vel.y += state.gravity.y;

state.pos.x += state.vel.x;
state.pos.y += state.vel.y;

drawCircle(state.pos.x, state.pos.y, state.size);
`
