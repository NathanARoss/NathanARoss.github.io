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

    console.log("gravity: " + state.gravity.x + ", " + state.gravity.y);
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
