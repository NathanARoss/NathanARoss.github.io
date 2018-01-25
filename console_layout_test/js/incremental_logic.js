var answer = 0

function entryPoint() {
	startNewGame();
}

function processInput(input) {
	let guess = parseInt(input);
	
	if (guess < answer) {
		sendOutput("try higher");
	} else if (guess > answer) {
		sendOutput("try lower");
	} else {
		sendOutput("ding ding ding!<br>");
		startNewGame();
	}
}

function startNewGame() {
	sendOutput("Guess my integer between 1 and 100 inclusive");
	answer = Math.floor(Math.random() * 100) + 1;
}