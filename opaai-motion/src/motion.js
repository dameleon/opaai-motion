;(function(global, document, Leap, tt, undefined) {
var requestAnimationFrame =
        global.requestAnimationFrame ||
        global.webkitRequestAnimationFrame;
var handList = {};
var ttDoc = tt('.container');
var mark = tt.tag('div', true);

mark.addClass('mark');

function anim() {
    var handList = this.handList;

    for (var i = 0, hand; hand = handList[i]; i++) {
        hand.render();
    }
    requestAnimationFrame(anim);
}


function Hand(data) {
    this.id = data.id;
    this.fingerHash = {};
    this.update(data);
}

Hand.prototype = {
    constructor: Hand,
    update: function(data) {
        this.data = data;
        this.cup = bust.getCupByCoords(data.palmPosition[2] > 40);

        var fingers = data.fingers;
        var fingerHash = this.fingerHash;
        var fingerKeys = Object.keys(fingerHash);

        for (var i = 0, finger; finger = fingers[i]; i++) {
            var id = finger.id;

            if (! fingerHash[id]) {
                fingerHash[id] = new Finger(this, finger);
            }
            else {
                fingerHash[id].update(finger);
                fingerKeys.splice(fingerKeys.indexOf(id), 1);
            }
        }
        for (var i = 0, idx; idx = fingerKeys[i]; i++) {
            fingerHash[idx].remove();
            delete fingerHash[idx];
        }
    },
    render: function() {
        var fingerHash = this.fingerHash;

        for (var idx in fingerHash) {
            fingerHash[idx].render();
        }
    },
    remove: function() {
        var fingerHash = this.fingerHash;

        for (var idx in fingerHash) {
            fingerHash[idx].remove();
        }
    }
};


function Finger(context, data) {
    this.context = context;
    this.id = data.id;
    this.mark = tt((mark.get()).cloneNode());
    ttDoc.append(this.mark);

    this.update(data);
}

Finger.prototype = {
    constructor: Finger,
    update: function(data) {
        this.data = data;
        this.render();
    },
    getXYZ: function() {
        var data = this.data;
        if (! data) {
            return;
        }
        var halfW = global.innerWidth / 2;
        var halfH = global.innerHeight / 2;
        return [
            (data.tipPosition[0] * 2.5) + halfW,
            data.tipPosition[1],
            data.tipPosition[2] + halfH
        ];
    },
    render: function() {
        var pos = this.getXYZ();
        var mark = this.mark;

        mark.get().style.webkitTransform = "translateX("+pos[0]+"px) translateY("+pos[2]+"px)";

        if (pos[1] < 150) {
            this.onMassage(pos);
        } else {
            this.offMassage(pos);
        }
    },
    onMassage: function(pos) {
        var point = this.point;

        if (! this.point) {
            point = this.context.cup.getPointByCoords(pos[0], pos[2]);

            if (! point) {
                return;
            }
            this.point = point;
        }
        point.move(pos[0], pos[2]);
    },
    offMassage: function(pos) {
        var point = this.point;

        if (! point) {
            return;
        }
        point.backIn(pos[0], pos[2]);
    },
    remove: function() {
        var point = this.point;

        if (point) {
            point.backIn();
        }
        this.mark.remove();
    }
};


Leap.loop(null, function(frame) {
    var hands = frame.hands;
    var handKeys = Object.keys(handList);

    for (var i = 0, hand; hand = hands[i]; i++) {
        var id = hand.id;

        if (! handList[id]) {
            handList[id] = new Hand(hand);
        }
        else {
            handList[id].update(hand);
            var idx = idx = handKeys.indexOf(id);
            handKeys.splice(idx,1)
        }
    }
    for (var i = 0, idx; idx = handKeys[i]; i++) {
        handList[idx].remove();
        delete handList[idx];
    }
});


anim();

})((this.self || global), document, Leap, tt, void 0);

