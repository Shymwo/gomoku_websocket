import tornado.web
import tornado.websocket
import tornado.ioloop
import json
from game import Game

class ClientHandler(tornado.websocket.WebSocketHandler):

	games = {}

	def check_origin(self, origin):
		return True

	def open(self):
		pass

	# player refreshed or closed game page
	def on_close(self):
		games = ClientHandler.games
		if (not hasattr(self, 'game') or not self.game.name in games):
			return
		if (self.game.white == self):
			self.game.white = None
		elif (self.game.black == self):
			self.game.black = None
		if (self.game.white is None and self.game.black is None):
			del games[self.game.name]

	# received some message
	def on_message(self, message):
		msg = json.loads(message)
		command = msg["command"]
		if (command == "start"):
			self.handleStart(msg)
		elif (command == "resume"):
			self.handleResume(msg)
		elif (command == "close"):
			self.handleClose(msg)
		elif (command == "put"):
			self.handlePut(msg)
		elif (command == "restart"):
			self.handleRestart()
		
	# player entered new game
	def handleStart(self, msg):
		if (hasattr(self, 'game')):
			return;
		name = msg["gname"]
		games = ClientHandler.games
		if name not in games:
			newGame = Game(name, self)
			games[name] = newGame
		else:
			game = games[name]
			game.startGame(self)

	# player requested to restart the game
	def handleRestart(self):
		if (not hasattr(self, 'game') or not hasattr(self, 'color')):
			return;
		self.game.restartGame(self.color)

	# player refreshed page
	def handleResume(self, msg):
		if (hasattr(self, 'game')):
			return;
		games = ClientHandler.games
		name = msg["gname"]
		color = msg["color"]
		if (name not in games):
			return
		game = ClientHandler.games[name]
		game.resumeGame(self, color)

	# player closed game with button
	def handleClose(self, msg):
		name = msg["gname"]
		games = ClientHandler.games
		if (hasattr(self, 'game') and name in games):
			self.game.closeClients()
			del games[name]
	
	# player want to put a piece on the field
	def handlePut(self, msg):
		if (not hasattr(self, 'color')):
			return
		if (self.game.name not in ClientHandler.games):
			return
		self.game.putPiece(self.color, msg["pid"])


if __name__ == "__main__":
	app = tornado.web.Application([
		(r"/gomoku", ClientHandler),
	])
	app.listen(8888)
	tornado.ioloop.IOLoop.instance().start()
