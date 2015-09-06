var serverName = "ws://localhost:8888/gomoku";
var gameName = null;
var playerColor = null;
var closed = false;
var myturn = false;
var wait = false;
var finished = false;

var noOfFields = 15;
var cellSize = 32;
var sizeOfArc = 15;
var boardSize = cellSize * noOfFields;
var context;
var canvasElement;
var pieceId;

var borderColor = "#000";
var whiteColor = "#FFF";
var blackColor = "#000";

var WHITE = "O";
var BLACK = "X";

var CONNECTING = "Connecting to the server...";
var WAITING = "Waiting for second player...";
var GAMEEXISTS = "The game already exists and has two players!"
var YOURTURN = "Your turn!";
var OPPONENTMOVE = "Waiting for opponent move..."
var ERROR = "Cannot connect to the server!";
var ABORTED = "The game has been aborted!";
var EMPTYNAME = "Game name cannot be empty!";
var WHITEPLAYER = "White";
var BLACKPLAYER = "Black";
var WIN = "You won the game!";
var LOSE = "You lost the game...";
var TIE = "Tie!";
var RESTARTREQUEST = "Your opponent requested to restart the game!";

function init() {
	$("#playButton").on("click", startGame);
	$("#restartButton").on("click", restartGame);
	$("#endButton").on("click", endGame);

	websocket = new WebSocket(serverName);
	websocket.onopen = function(e) { onOpen(e) };
	websocket.onmessage = function(e) { onMessage(e) };
	websocket.onerror = function(e) { onError(e) };
	websocket.onclose = function(e) { onClose(e) };

	$("#introMessage").text(CONNECTING);
}

function onOpen() {
	$("#playButton").prop('disabled', false);
	$("#introMessage").text("");
	if (sessionStorage['gameName'] != undefined) {
		//Resume the game
		gameName = sessionStorage['gameName'];
		playerColor = sessionStorage['playerColor'];
		var msg = {
			command: "resume",
			gname: gameName,
			color: playerColor
		};
		websocket.send(JSON.stringify(msg));
	}
}

function onMessage(e) {
	var msg = JSON.parse(e.data);
	if (msg.answer == "started") {
		playerColor = msg.color;
		sessionStorage['gameName'] = gameName;
		sessionStorage['playerColor'] = playerColor;
		drawBoard();
		if (playerColor == WHITE) {
			myturn = true;
			$("#gameMessage").text(YOURTURN);
		} else {
			$("#gameMessage").text(OPPONENTMOVE);
		}
	} else if (msg.answer == "waiting") {
		$("#playButton").prop('disabled', true);
		$("#introMessage").text(WAITING);
	} else if (msg.answer == "not_started") {
		$("#introMessage").text(GAMEEXISTS);
	} else if (msg.answer == "resumed") {
		resumeGame(msg);
	} else if (msg.answer == "ok") {
		drawPiece(pieceId, true);
		$("#gameMessage").text(OPPONENTMOVE);
		myturn = false;
		wait = false;		
	} else if (msg.answer == "busy") {
		alert("You can't go there.");
		wait = false;
	} else if (msg.answer == "your_turn") {
		drawPiece(msg.pid, false);
		$("#gameMessage").text(YOURTURN);	
		myturn = true;			
	} else if (msg.answer == "win") {
		drawPiece(pieceId, true);
		$("#gameMessage").text(WIN);
		alert(WIN);
		myturn = false;
		wait = false;
		finished = true;
		$("#restartButton").prop('disabled', false);
		if (playerColor == WHITE) {
			var wins = parseInt($("#white_wins").text(), 0);
			$("#white_wins").text(wins+1);
		} else {
			var wins = parseInt($("#black_wins").text(), 0);
			$("#black_wins").text(wins+1);
		}
	} else if (msg.answer == "lose") {
		drawPiece(msg.pid, false);
		$("#gameMessage").text(LOSE);
		alert(LOSE);
		myturn = true;
		finished = true;
		$("#restartButton").prop('disabled', false);
		if (playerColor == BLACK) {
			var wins = parseInt($("#white_wins").text(), 0);
			$("#white_wins").text(wins+1);
		} else {
			var wins = parseInt($("#black_wins").text(), 0);
			$("#black_wins").text(wins+1);
		}
	} else if (msg.answer == "restarted") {
		finished = false;
		if (myturn) {
			$("#gameMessage").text(YOURTURN);
		} else {
			$("#gameMessage").text(OPPONENTMOVE);
		}
		$("#restartButton").prop('disabled', true);
		context.clearRect(0, 0, boardSize, boardSize);
		drawBoard();
	} else if (msg.answer == "requested_restart") {
		$("#gameMessage").text(RESTARTREQUEST);
	} else if (msg.answer == "tie") {
		if (myturn)
			drawPiece(msg.pid, true);
		else
			drawPiece(msg.pid, false);
		$("#gameMessage").text(TIE);
		alert(TIE);
		myturn = !myturn;
		finished = true;
		$("#restartButton").prop('disabled', false);
	}
}

function onError(e) {
	console.log("error has occured");
	$("#introMessage").text(ERROR);
}

function onClose(e) {
	console.log("socket was closed");
	$("#gameMessage").text(ABORTED);
	closed = true;
	sessionStorage.clear();
}

function startGame() {
	gameName = $("#gameName").val();
	if (gameName == null || gameName == "") {
		$("#introMessage").text(EMPTYNAME);
		return;
	} else {
		var msg = {
			command: "start",
			gname: gameName
		};
		websocket.send(JSON.stringify(msg));
	}
}

function resumeGame(msg) {
	console.log(msg);
    drawBoard();
	finished = msg.finished;
	if (playerColor == msg.turn) {
		myturn = true;
		if (!finished)
			$("#gameMessage").text(YOURTURN);
	} else {
		if (!finished)
			$("#gameMessage").text(OPPONENTMOVE);
	}
	if (finished)
		$("#restartButton").prop('disabled', false);
	$("#black_wins").text(msg.black_wins);
	$("#white_wins").text(msg.white_wins);
	var fields = msg.fields;
	var n = noOfFields * noOfFields;
	for (var i = 0; i < n; i++) {
		if (fields[i] == null)
			continue;
		else if (fields[i] == playerColor)
			drawPiece(i, true);
		else
			drawPiece(i, false);
	}
}

function drawBoard() {

	$("#intro").addClass("hidden");
	$("#game").removeClass("hidden");

	if (playerColor == WHITE)
		$("#player").text(WHITEPLAYER);
	else
		$("#player").text(BLACKPLAYER);

	canvas = $("#tbl_canvas");
    canvas.on("click", onClick);
	canvasElement = canvas[0]
    context = canvasElement.getContext("2d");
	context.canvas.width = boardSize;
	context.canvas.height = boardSize;

    context.beginPath();

    // Drawing lines
    for (var x = cellSize/2; x <= boardSize; x += cellSize) {
        context.moveTo(x, cellSize/2);
        context.lineTo(x, boardSize-cellSize/2);
        context.moveTo(cellSize/2, x);
        context.lineTo(boardSize-cellSize/2, x);
    }

    context.strokeStyle = borderColor;
	context.closePath();
    context.stroke();

}

function drawPiece(id, mycolor) {

    context.beginPath();
    var mulX = 0;
    var mulY = 0;

    // Simple math
    mulY = Math.floor(id / noOfFields);
	mulX = id % noOfFields;

    var arcX = mulX * cellSize + cellSize / 2;
    var arcY = mulY * cellSize + cellSize / 2;

    if ( (mycolor && playerColor == WHITE)
		|| (!mycolor && playerColor != WHITE) ) {
		context.strokeStyle = whiteColor;
		context.fillStyle = whiteColor;
    } else {
		context.strokeStyle = blackColor;
		context.fillStyle = blackColor;
    }

	context.arc(arcX, arcY, sizeOfArc, 0, Math.PI * 2, false);
    context.closePath();
    context.stroke();
	context.fill();

}

function onClick(e) {
	if (myturn && !wait && !finished) {
		// x and y coordinates
		var x = e.pageX - canvasElement.offsetLeft;
		var y = e.pageY - canvasElement.offsetTop;

		// Equation to get an id from coordinates
		pieceId = noOfFields * Math.floor(y / cellSize) 
				+ Math.floor(x / cellSize);

		var msg = {
			command: "put",
			pid: pieceId
		};
		websocket.send(JSON.stringify(msg));

		wait = true;
	}
}

function restartGame() {
	var msg = {
		command: "restart"
	};
	websocket.send(JSON.stringify(msg));
	$("#gameMessage").text(WAITING);
	$("#restartButton").prop('disabled', true);
}

function endGame() {
	if (!closed) {
		var msg = {
			command: "close",
			gname: gameName
		};
		websocket.send(JSON.stringify(msg));
		sessionStorage.clear();
	}
	location.reload();
}
