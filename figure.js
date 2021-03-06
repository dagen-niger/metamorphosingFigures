function Figure(options) {
	this.options = options;
	this.detailLevel = options.detailLevel;
	this.ctx = options.ctx;

	// отменить в IE9, там всё равно нет RAF()
	if (!document.all) this._initRender();
}


Figure.prototype = {
	constructor : Figure,
	source      : [],
	target      : [],
	current     : [],
	radius      : 1,
	left        : 0,
	top         : 0,
	sourceColor : [0,0,0],
	currentColor: [0,0,0],
	targetColor : [0,0,0],
	bottomBound : 0,
	topBound    : 0,

	/**
	 * Создаёт правильный многоугольник, вписанный в единичную окружность с центром в декартовом (0; 0)
	 * @param {number} edges кол-во рёбер, должно быть делителем detailLevel
	 * @return {Array} of (x, y)
	 */
	_setEdges: function(edges) {
		var vertices = [],
			points = [],
			edgeLength = this.detailLevel / edges,
			angleStep = Math.PI*2 / edges;

		// нахожу вершины
		for (var edge = 0; edge < edges; edge++) {
			vertices.push({
				// синус и косинус намеренно перепутаны местами
				// чтобы первый угол начинался на 12-ти часах (в самом верху)
				// и далее вершины по часовой стрелке
				// иначе треугольник будет на боку лежать))
				x: Math.sin(angleStep * edge),
				y: -Math.cos(angleStep * edge)
			});
		}

		// заполняю рёбра
		vertices.forEach(function(vertex, index) {
			var nextIndex = index + 1 === edges ? 0 : index + 1,
				nextVertex = vertices[nextIndex],
				xStep = (nextVertex.x - vertex.x) / edgeLength,
				yStep = (nextVertex.y - vertex.y) / edgeLength;

			for (var i = 0; i < edgeLength; i++) {
				points.push({
					x: vertex.x + xStep * i,
					y: vertex.y + yStep * i
				});
			}
		});

		return points
	},

	/**
	 * Заполняет исходную фигуру
	 * @param {number} edges кол-во рёбер, должно быть делителем detailLevel
	 * @return {Figure}
	 */
	setSource: function(edges) {
		this.source = this._setEdges(edges);
		return this
	},

	/**
	 * Заполняет конечную фигуру
	 * @param {number} edges кол-во рёбер, должно быть делителем detailLevel
	 * @return {Figure}
	 */
	setTarget: function(edges) {
		this.target = this._setEdges(edges);
		return this
	},

	/**
	 * Случайный цвет
	 * @return {Array}
	 */
	_getRandomColor: function() {
		var newColor = [];
		for (var i = 0; i < 3; i++) newColor[i] = Math.floor(Math.random() * 256);
		return newColor
	},

	/**
	 * Ставит случайный начальный цвет
	 * @return {Figure}
	 */
	setRandomSourceColor: function() {
		this.sourceColor = this._getRandomColor();
		return this
	},

	/**
	 * Ставит случайный начальный цвет
	 * @return {Figure}
	 */
	setRandomTargetColor: function() {
		this.targetColor = this._getRandomColor();
		return this
	},

	/**
	 * Устанавливает новое значение
	 * @param {*} key
	 * @param {*} value
	 * @return {Figure}
	 */
	setValue: function(key, value) {
		this[key] = value;
		return this
	},

	/**
	 * Создаёт промежуточный многоугольник
	 * заполняет this.current актуальными значениями
	 * @param {number} progress должен быть в интервале [0; 1]
	 * @return {Figure}
	 */
	interpolate: function(progress) {
		for (var i = 0; i < this.detailLevel; i++) {
			this.current[i] = {
				x: this.source[i].x + progress * (this.target[i].x - this.source[i].x),
				y: this.source[i].y + progress * (this.target[i].y - this.source[i].y)
			}
		}
		return this
	},

	interpolateColor: function(progress) {
		for (var i = 0; i < 3; i++) {
			this.currentColor[i] = Math.floor(this.sourceColor[i] + progress * (this.targetColor[i] - this.sourceColor[i]));
		}
		return this
	},

	/**
	 * Рисует фигуру
	 * @return {Figure}
	 */
	render: function() {
		this._render();
		return this
	},

	/**
	 * Инициализация рендера, вызывается в конструкторе автоматически
	 */
	_initRender: function() {
		var vendors = ['ms', 'moz', 'webkit', 'o'];

		for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
			window.requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
		}

		if (window.requestAnimationFrame) {
			this.render = function() {
				window.requestAnimationFrame(this._render.bind(this));
				return this
			}.bind(this)
		}
	},

	_render: function() {
		this.clear();

		var context = this.ctx,
			r = this.currentColor[0],
			g = this.currentColor[1],
			b = this.currentColor[2],
			color = 'rgba(' + r + ', ' + g + ', ' + b + ', 1)';

		this.dirtyRect = {
			minX: Infinity,
			minY: Infinity,
			maxX: -Infinity,
			maxY: -Infinity
		};

		context.save();
		context.beginPath();

		this.current.forEach(function(point) {
			var x = point.x * this.radius + this.left,
				y = point.y * this.radius + this.top;

			this.dirtyRect.minX = Math.min(this.dirtyRect.minX, x);
			this.dirtyRect.maxX = Math.max(this.dirtyRect.maxX, x);
			this.dirtyRect.minY = Math.min(this.dirtyRect.minY, y);
			this.dirtyRect.maxY = Math.max(this.dirtyRect.maxY, y);

			context.lineTo(x, y);
		}.bind(this));

		context.closePath();
		context.lineWidth = 1;
		context.strokeStyle = color;
		context.fillStyle = color;
		context.fill();
		context.restore();

		return this
	},

	/**
	 * Стирает фигуру
	 * @return {Figure}
	 */
	clear: function() {
		// магические единички для стирания сглаживания (сглаживание канваса распространяется на соседние пиксели)
		this.dirtyRect && this.ctx.clearRect(
			this.dirtyRect.minX - 1,
			this.dirtyRect.minY - 1,
			this.dirtyRect.maxX + 1,
			this.dirtyRect.maxY + 1
		);
		return this
	}
};
