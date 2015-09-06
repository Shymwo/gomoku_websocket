import math

class Game:

	WHITE = "O"
	BLACK = "X"
	
	def __init__(self, name, player1):
		self.name = name
		self.white = player1
		self.black = None
		self.white.game = self
		self.white.color = Game.WHITE
		self.white.write_message({
			'answer' : 'waiting',
		})
		self.turn = Game.WHITE
		self.boardSize = 15
		self.fields = [None] * self.boardSize * self.boardSize
		self.filled = 0
		self.started = False
		self.finished = False
		self.requestedRestart = None
		self.whiteWins = 0
		self.blackWins = 0

	def startGame(self, player2):
		if (not self.started):
			self.started = True
			self.black = player2
			self.black.game = self
			self.black.color = Game.BLACK
			self.black.write_message({
				'answer' : 'started',
				'color' : Game.BLACK
			})
			self.white.write_message({
				'answer' : 'started',
				'color' : Game.WHITE
			})
		else:
			player2.write_message({
				'answer' : 'not_started'
			})

	def resumeGame(self, player, color):
		if (not self.started):
			return
		if (color == Game.WHITE and self.white is None):
			self.white = player
		elif (color == Game.BLACK and self.black is None):
			self.black = player
		else:
			player.close()
			return
		player.game = self
		player.color = color
		player.write_message({
			'answer' : 'resumed',
			'turn' : self.turn,
			'white_wins' : self.whiteWins,
			'black_wins' : self.blackWins,
			'finished' : self.finished,
			'fields' : self.fields
		})

	def restartGame(self, color):
		if (not self.finished):
			return;
		if (self.requestedRestart is None):
			msg = { 'answer' : 'requested_restart' }
			self.requestedRestart = color
			if (color == Game.WHITE):
				self.black.write_message(msg)
			else:
				self.white.write_message(msg)
			return
		elif (self.requestedRestart == color):
			return
		self.finished = False
		self.requestedRestart = None
		self.fields = [None] * self.boardSize * self.boardSize
		self.filled = 0
		self.requestedRestart = False
		if (self.turn == Game.WHITE):
			self.turn = Game.BLACK
		else:
			self.turn = Game.WHITE
		msg = { 'answer' : 'restarted' }
		self.white.write_message(msg)
		self.black.write_message(msg)

	def putPiece(self, color, i):
		if (self.finished):
			return
		if (not self.started or self.turn != color):
			return
		if (self.fields[i] is None):
			self.fields[i] = color;
			self.filled += 1
			if (self.filled == self.boardSize * self.boardSize):
				self.finished = True
				msg_tie = { 
					'answer' : 'tie',
					'pid' : i
				}
				self.white.write_message(msg_tie)
				self.black.write_message(msg_tie)
			elif (self.checkIfFinished(i)):
				self.finished = True
				msg_win = { 'answer' : 'win' }
				msg_lose = { 
					'answer' : 'lose',
					'pid' : i
				}
				if (color == Game.WHITE):
					self.whiteWins += 1
					self.black.write_message(msg_lose)
					self.white.write_message(msg_win)
				else:
					self.blackWins += 1
					self.white.write_message(msg_lose)
					self.black.write_message(msg_win)
			else:
				msg_ok = { 'answer' : 'ok' }
				msg_turn = { 
					'answer' : 'your_turn',
					'pid' : i
				}
				if (color == Game.WHITE):
					self.turn = Game.BLACK
					self.black.write_message(msg_turn)
					self.white.write_message(msg_ok)
				else:
					self.turn = Game.WHITE
					self.white.write_message(msg_turn)
					self.black.write_message(msg_ok)
		else:
			msg_busy = { 'answer' : 'busy' }
			if (color == Game.WHITE):
				self.white.write_message(msg_busy)
			else:
				self.black.write_message(msg_busy)

	def checkIfFinished(self, pid):
		fields = self.fields
		n = self.boardSize
		x = math.floor(pid / n)
		y = pid % n

		startx = (x - 5) if ((x - 5) >= 0) else 0
		starty = (y - 5) if ((y - 5) >= 0) else 0
		endx = (x + 5) if ((x + 5) <= n - 1) else n - 1
		endy = (y + 5) if ((y + 5) <= n - 1) else n - 1

		count = 0
		for i in range(startx, endx+1):
			if (fields[x*n+y] == fields[i*n+y]):
				count += 1
			elif (count == 5):
				return True
			else:
				count = 0
		count = 0
		for i in range(starty, endy+1):
			if (fields[x*n+y] == fields[x*n+i]):
				count += 1
			elif (count == 5):
				return True
			else:
				count = 0
		count = 0
		for i in range(-5,6):
			xi = x + i
			yi = y + i	
			if (xi < startx or yi < starty or xi > endx or yi > endy):
				continue
			if (fields[x*n+y] == fields[xi*n+yi]):
				count += 1
			elif (count == 5):
				return True
			else:
				count = 0
		count = 0
		for i in range(-5,6):
			xi = x - i
			yi = y + i
			if (xi < startx or yi < starty or xi > endx or yi > endy):
				continue
			if (fields[x*n+y] == fields[xi*n+yi]):
				count += 1
			elif (count == 5):
				return True
			else:
				count = 0
		return False

	def closeClients(self):
		try:
			if (self.white is not None):
				self.white.close()
		except tornado.websocket.WebSocketClosedError:
			pass
		try:
			if (self.black is not None):
				self.black.close()
		except tornado.websocket.WebSocketClosedError:
			pass
