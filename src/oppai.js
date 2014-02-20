;(function(global, document, tt, undefined) {

var M = global.Math;
var D = global.Date;
var requestAnimationFrame =
        global.requestAnimationFrame ||
        global.webkitRequestAnimationFrame;
var elasticEaseOut = function(t, b, c, d, a, p) {
    if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
    if (!a || a < Math.abs(c)) { a=c; var s=p/4; }
    else var s = p/(2*Math.PI) * Math.asin (c/a);
    return (a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b);
};

var DEBUG = false;
var POINT_MOVE_DISTANCE = 60;
var POINT_WEIGHT_MAP = [
        [0.05],[0.1], [0.2], [0.1], [0.05],
        [0.1], [0.4], [0.5], [0.3], [0.1],
        [0.2], [0.5], [1],   [0.5], [0.2],
        [0.1], [0.3], [0.5], [0.3], [0.1],
        [0.05],[0.1], [0.2], [0.1], [0.05]
    ];
var bust;

function main() {
    var left = [
        74, 131,
        658, 131,
        658, 728,
        74, 728
    ];
    var right = [
        658, 131,
        1220, 131,
        1220, 728,
        658, 728
    ];

    bust = new Bust({
        boundsList: [left, right],
        imagePath: '/assets/oppai.jpg',
        canvasSelector: '#sanctuary',
        blocks: 6
    });
    bust.load(update);
}

function update() {
    bust.render();
    requestAnimationFrame(update);
}

function Bust(setting) {
    this.cups = [];
    this.setting = setting;
}

Bust.prototype = {
    constructor: Bust,
    load: function(callback) {
        var that = this;
        var setting = this.setting;
        var canvas = document.querySelector(setting.canvasSelector);

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        var image = new Image();

        image.onload = function() {
            that.init(callback);
        };
        image.src = this.setting.imagePath;
        this.image = image;
    },

    init: function(callback) {
        var that = this;
        var canvas = this.canvas;
        var ctx = this.ctx;
        var image = this.image;

        // とりあえず一回描く
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.style.marginLeft = '-' + (image.width/2) + 'px';
        ctx.drawImage(image, 0, 0);

        var boundsList = this.setting.boundsList;
        var cups = this.cups;

        for (var i = 0, bounds; bounds = boundsList[i]; i++) {
            cups[i] = new Cup(this, bounds);
        }
        cups[0].registGravityPoint({
            4: [0, 1, 2, 3, 4]
        });
        cups[1].registGravityPoint({
            4: [2, 3, 4, 5, 6]
        });
        new ActionHandler(this);

        this.lastInnerWidth = global.innerWidth;
        global.addEventListener('scroll', function() {
            that.bounce();
        });
        global.addEventListener('resize', function() {
            var innerWidth = global.innerWidth;
            var durat = 0;

            if (that.lastInnerWidth < innerWidth) {
                durat = 1;
            }
            that.lastInnerWidth = innerWidth;
            that.clip(durat);
        });
        callback && callback();
    },

    bounce: function() {
        var cups = this.cups;

        cups[0].bounceUpDown();
        cups[1].bounceUpDown();
    },

    clip: function(durat) {
        var cups = this.cups;

        cups[0].clip(durat);
        cups[1].clip(!durat);
    },

    render: function() {
        var cups = this.cups;

        cups[0].update();
        cups[1].update();
		this.ctx.drawImage(this.image, 0, 0);
        cups[0].draw();
        cups[1].draw();
    },

    getCupByCoords: function(angle) {
        return (angle && this.cups[1]) || this.cups[0];
    },
};

function Cup(context, bounds) {
    var image = context.image;

    this.blocks = context.setting.blocks;
    this.ctx = context.ctx;
    this.img = image;
    this.imgWidth = image.width;
    this.imgHeight = image.height;
    this.bounds = bounds;
    this.playingAnimation = false;

    //
    this.points = [];
    this.gravityPointList = [];
    this.createPoint();
}

Cup.prototype = {
    constructor: Cup,
    createPoint: function() {
        var bounds = this.bounds;
        var points = this.points;
        var blocks = this.blocks;

        // 各頂点のリストを作るよ
        var x = (bounds[2] - bounds[0]) / blocks;
        var y = (bounds[5] - bounds[1]) / blocks;
        var x0 = bounds[0];
        var y0 = bounds[1];

        // 各頂点
        for (var i = 0; i <= blocks; i++) {
            var horizontal = points[i] = [];
            for (var j = 0; j <= blocks; j++) {
                horizontal[j] = new Point(this, (x * j) + x0, (y * i) + y0, j, i);
            }
        }

        // 作り終わったら近所のポイント登録をする
        for (var i = 0; i <= blocks; i++) {
            var horizontal = points[i];
            for (var j = 0; j <= blocks; j++) {
                horizontal[j].init();
            }
        }
    },
    registGravityPoint: function(gravPoints) {
        var points = this.points;
        var gravPointList = this.gravityPointList;
        // さらに重力のポイントを配列に登録
        for (var key in gravPoints) {
            var pointIndex = gravPoints[key];
            for (var i = key, iz = (key - 3); i >= iz; i--) {
                var line = gravPointList[gravPointList.length] = [];

                for (var j = 0, jz = pointIndex.length; j < jz; j++) {
                    line[line.length] = points[i][pointIndex[j]];
                }
            }
        }
    },
    getPointByCoords: function(x, y) {
        var blocks = this.blocks;
        var bounds = this.bounds;

        if (bounds[2] < x || bounds[0] > x || bounds[5] < y || bounds[1] > y) {
            return null;
        }
        var indexX = Math.round((x - bounds[0]) / ((bounds[2] - bounds[0]) / blocks));
        var indexY = Math.round((y - bounds[1]) / ((bounds[5] - bounds[1]) / blocks));

        ((indexX == 0) && indexX++) || ((indexX == blocks) && indexX--);
        ((indexY == 0) && indexY++) || ((indexY == blocks) && indexY--);

        var points = this.points[indexY][indexX];

        if (points.isSelected) {
            return null;
        }
        return points;
    },
    update: function() {
        var points = this.points;
        var blocks = this.blocks;

        for (var i = 0; i <= blocks; i++) {
            var line = points[i];
            for (var j = 0; j <= blocks; j++) {
                var point = line[j];
                point.spillOut();
            }
        }
    },
    draw: function(callback) {
        var points = this.points;
        var blocks = this.blocks;

        for (var i = 0; i < blocks; i++) {
            var line = points[i];
            var nextLine = points[(i+1)];

            if (! nextLine) {
                break;
            }
            for (var j = 0; j < blocks; j++) {
                var next = j + 1;
                var point = line[j];
                var nextPoint = line[next];
                var nextLinePoint = nextLine[j];
                var nextLineNextPoint = nextLine[next];

                this.drawTriangle(
                    point,
                    nextPoint,
                    nextLinePoint
                );
                this.drawTriangle(
                    nextLineNextPoint,
                    nextLinePoint,
                    nextPoint
                );
            }
        }
    },
    drawTriangle: function(p0, p1, p2) {
        var ctx = this.ctx;
        var img = this.img;
        var imgWidth = this.imgWidth;
        var imgHeight = this.imgHeight;

        var p0coords = p0.getXY();
        var p1coords = p1.getXY();
        var p2coords = p2.getXY();

        var p0x = p0coords[0];
        var p0y = p0coords[1];
        var p1x = p1coords[0];
        var p1y = p1coords[1];
        var p2x = p2coords[0];
        var p2y = p2coords[1];

        // レンダリングする座標
        var _Ax = p1x - p0x;
        var _Ay = p1y - p0y;
        var _Bx = p2x - p0x;
        var _By = p2y - p0y;

        // UV座標
        var Ax = (p1.x - p0.x);
        var Ay = (p1.y - p0.y);
        var Bx = (p2.x - p0.x);
        var By = (p2.y - p0.y);

        var m = new MatrixUtil(Ax, Ay, Bx, By);
        var mi = m.getInvert();

        if (!mi) {
            return;
        }

        var a, b, c, d;

        a = mi.a * _Ax + mi.b * _Bx;
        c = mi.c * _Ax + mi.d * _Bx;
        b = mi.a * _Ay + mi.b * _By;
        d = mi.c * _Ay + mi.d * _By;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.closePath();
        ctx.clip();

        ctx.transform(a, b, c, d,
            p0x - (a * p0.x + c * p0.y),
            p0y - (b * p0.x + d * p0.y));

        ctx.drawImage(img, 0, 0);
        ctx.restore();
        if (DEBUG) {
            ctx.strokeStyle = "#f00";
            ctx.stroke();
        }
    },
    getNearPoints: function(req) {
        var points = this.points;
        var indexX = req.indexX;
        var indexY = req.indexY;
        var last = this.blocks;
        var res = [];

        for (var i = (indexY - 2), iz = (indexY + 2); i <= iz; i++) {
            var line = points[i];
            if (! line || i <= 0 || i >= last) {
                res[res.length] = undefined;
                res[res.length] = undefined;
                res[res.length] = undefined;
                res[res.length] = undefined;
                res[res.length] = undefined;
            } else {
                for (var j = (indexX - 2), jz = (indexX + 2); j <= jz; j++) {
                    var point = line[j];
                    if (
                        ! point ||
                        point == req ||
                        j == 0 ||
                        j == last) {
                            res[res.length] = undefined;
                    } else {
                        res[res.length] = point;
                    }
                }
            }
        }

        return res;
    },
    bounceUpDown: function() {
        if (this.playingAnimation) {
            return;
        }
        var that = this;
        var points = this.gravityPointList;
        var blocks = this.blocks;
        var weight = 0.6;
        var distance = POINT_MOVE_DISTANCE - 30;

        this.playingAnimation = true;

        CupBounser(distance, function(dist) {
            dist = distance - dist;

            for (var i = 0, iz = points.length; i < iz; i++) {
                var line = points[i];
                var w = (i == 0 && 0.8) || (weight / i);
                for (var j = 0, jz = line.length; j < iz; j++) {
                    var point = line[j];
                    point.moveY = dist * w;
                }
            }
        },
        function() {
            setTimeout(function() {
                that.playingAnimation = false;
            }, 100);
        });
    },
    clip: function(durat) {
        if (this.playingAnimation) {
            return;
        }
        var that = this;
        var points = this.gravityPointList;
        var blocks = this.blocks;
        var weight = 0.6;
        var distance = POINT_MOVE_DISTANCE - 40;

        this.playingAnimation = true;

        CupBounser(distance, function(dist) {
            dist = distance - dist;

            if (durat) {
                dist = -dist;
            }

            for (var i = 0, iz = points.length; i < iz; i++) {
                var line = points[i];
                var w = (i == 0 && 0.8) || (weight / i);
                for (var j = 0, jz = line.length; j < iz; j++) {
                    var point = line[j];
                    point.moveX = dist * w;
                }
            }
        },
        function() {
            setTimeout(function() {
                that.playingAnimation = false;
            }, 100);
        });
    }
};


function CupBounser(distance, callback, endCallback) {
    var ease = function (t, b, c, d, a, p){
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
        if (!a || a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a);
        return (a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b);
    };

    var start = 0;
    var changeIn = distance;
    var moveTime = 1500;
    var startTime = D.now();
    var endTime = D.now() + moveTime;

    _anim();

    function _anim() {
        var currentTime = D.now();

        if (currentTime >= endTime) {
            endCallback && endCallback(0);
        }
        else {
            var elapsedTime = currentTime - startTime;

            callback(
                elasticEaseOut(elapsedTime, start, changeIn, moveTime)
            );
            requestAnimationFrame(_anim);
        }
    }
}

function Point(mesh, x, y, indexX, indexY) {
    this.mesh = mesh;
    this.indexX = indexX;
    this.indexY = indexY;
    this.x = x;
    this.y = y;
    this.weights = {};
    this.moveX = 0;
    this.moveY = 0;
    this.isSelected = false;
    this.cutOver = POINT_MOVE_DISTANCE;
}

Point.prototype = {
    constructor: Point,
    init: function() {
        this.nears = this.mesh.getNearPoints(this);
    },
    getXY: function() {
        var weightX = 0, weightY = 0;
        var weights = this.weights;

        for (var index in weights) {
            var weight = weights[index];
            weightX = weightX + weight[0];
            weightY = weightY + weight[1];
        }
        return [
            this.x + this.moveX + weightX,
            this.y + this.moveY + weightY
        ];
    },
    move: function(targetX, targetY) {
        var diffX = targetX - this.x;
        var diffY = targetY - this.y;
        var dist = M.sqrt(diffX * diffX + diffY * diffY);

        if (dist > this.cutOver) {
            var rad = M.atan2(diffY, diffX);
            targetX = this.cutOver * M.cos(rad) + this.x;
            targetY = this.cutOver * M.sin(rad) + this.y;
        }
        this.moveX = targetX - this.x;
        this.moveY = targetY - this.y;
    },
    getIndex: function() {
        return (this.indexX * 10) + this.indexY;
    },
    setWeights: function(point, x, y) {
        var index = point.getIndex();
        var weight = this.weights[index];

        if (! weight) {
            this.weights[index] = [x, y];
        } else {
            weight[0] = x;
            weight[1] = y;
        }
    },
    spillOut: function() {
        var weightMap = POINT_WEIGHT_MAP;
        var nearPoints = this.nears;
        var moveX = this.moveX;
        var moveY = this.moveY;

        for (var i = 0; i < 25; i++) {
            var point = nearPoints[i];
            if (! point || i == 4) {
                continue;
            }
            var weight = weightMap[i];
            point.setWeights(this, moveX * weight, moveY * weight);
        }
    },
    reset: function() {
        this.moveX = this.moveY = 0;
    },
    backIn: function(x, y) {
        var anim = this.pointAnimator;

        if (! anim) {
            anim = this.pointAnimator = new PointAnimator(this);
        }
        anim.load(x || this.moveX, y || this.moveY);
    }
};

function PointAnimator(point) {
    this.point = point;
    this.moveTime = 800;
    this.isPlaying = false;
}

PointAnimator.prototype = {
    constructor: PointAnimator,
    load: function(startX, startY) {
        var point = this.point;

        this.startX = startX;
        this.startY = startY;
        this.changeInX = point.x - startX;
        this.changeInY = point.y - startY;
        this.startTime = D.now();
        this.endTime = D.now() + this.moveTime;
        this.isPlaying = true;
        this.play();
    },
    play: function() {
        var point = this.point;
        var currentTime = D.now();

        if (currentTime >= this.endTime) {
            point.reset();
        } else {
            var that = this;
            var ease = elasticEaseOut;
            var elapsedTime = currentTime - this.startTime;
            var moveTime = this.moveTime;
            point.move(
                ease(elapsedTime, this.startX, this.changeInX, moveTime),
                ease(elapsedTime, this.startY, this.changeInY, moveTime)
            );
            requestAnimationFrame(function() {
                that.play();
            });
        }
    },
    linear: function(t, b, c, d) {
        return c * t / d + b;
    }
};


// 単位行列
// |a,b|
// |c,d|
function MatrixUtil(a, b, c, d) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
}

MatrixUtil.prototype.getInvert = function() {
    var det = this.a * this.d - this.b * this.c;

    if (det > -0.0001 && det < 0.0001) {
        return null;
    }
    return (new MatrixUtil(
        this.d / det,
        -this.b / det,
        -this.c / det,
        this.a / det
    ));
};


function ActionHandler(context) {
    this.cups = context.cups;
    var canvas = context.canvas;

    canvas.addEventListener('mousedown', this);
    canvas.addEventListener('mousemove', this);
    canvas.addEventListener('mouseup', this);
}

ActionHandler.prototype = {
    constructor: ActionHandler,
    handleEvent: function(ev) {
        switch (ev.type) {
            case 'mousedown':
                this.moveon(ev);
                break;
            case 'mousemove':
                this.moving(ev);
                break;
            case 'mouseup':
                this.moveoff(ev);
                break;
        }
    },
    moveon: function(ev) {
        var cups = this.cups;
        var point;

        for (var i = 0, val; val = cups[i]; i++) {
            point = val.getPointByCoords(ev.pageX, ev.pageY);
            if (point) {
                break;
            }
        }
        if (!point) {
            return;
        }
        point.isSelected = true;
        this.point = point;
    },
    moving: function(ev) {
        var point = this.point;

        if (! point) {
            return;
        }
        point.move(ev.pageX, ev.pageY);
    },
    moveoff: function(ev) {
        var point = this.point;

        if (!point) {
            return;
        }
        point.backIn(ev.pageX, ev.pageY);
        point.isSelected = false;
        this.point = null;
    },
    setCoords: function(ev, point) {
        var pageX = ev.pageX;
        var pageY = ev.pageY;

        var diffX = pageX - point.x;
        var diffY = pageY - point.y;
        var dist = M.sqrt(diffX * diffX + diffY * diffY);

        if (dist > this.cutOver) {
            var rad = M.atan2(diffY, diffX);
            pageX = this.cutOver * M.cos(rad) + point.x;
            pageY = this.cutOver * M.sin(rad) + point.y;
        }
        this.currentX = pageX;
        this.currentY = pageY;
    }
};

main();
global.bust = bust;

})((this.self || global), document, tt, void 0);

