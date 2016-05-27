/*
 Animator.js 1.1.11

 This library is released under the BSD license:
 Copyright (c) 2006, Bernard Sumption. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer. Redistributions in binary
 form must reproduce the above copyright notice, this list of conditions and
 the following disclaimer in the documentation and/or other materials
 provided with the distribution. Neither the name BernieCode nor
 the names of its contributors may be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 ARE DISCLAIMED. IN NO EVENT SHALL THE REGENTS OR CONTRIBUTORS BE LIABLE FOR
 ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
 DAMAGE.
 */


// Applies a sequence of numbers between 0 and 1 to a number of subjects
// construct - see setOptions for parameters
function Animator(options) {
    this.setOptions(options);
    var _this = this;
    this.timerDelegate = function(){_this.onTimerEvent()};
    this.subjects = [];
    this.target = 0;
    this.state = 0;
    this.lastTime = null;
};
Animator.prototype = {
    // apply defaults
    setOptions: function(options) {
        this.options = Animator.applyDefaults({
            repeat: false,
            interval: 20,  // time between animation frames
            duration: 400, // length of animation
            onComplete: function(){},
            onStep: function(){},
            transition: Animator.tx.easeInOut
        }, options);
    },
    // animate from the current state to provided value
    seekTo: function(to) {
        this.seekFromTo(this.state, to);
    },
    // animate from the current state to provided value
    seekFromTo: function(from, to) {
        this.target = Math.max(0, Math.min(1, to));
        this.state = Math.max(0, Math.min(1, from));
        this.lastTime = new Date().getTime();
        if (!this.intervalId) {
            this.intervalId = window.setInterval(this.timerDelegate, this.options.interval);
        }
    },
    // animate from the current state to provided value
    jumpTo: function(to) {
        this.target = this.state = Math.max(0, Math.min(1, to));
        this.propagate();
    },
    // seek to the opposite of the current target
    toggle: function() {
        this.seekTo(1 - this.target);
    },
    // add a function or an object with a method setState(state) that will be called with a number
    // between 0 and 1 on each frame of the animation
    addSubject: function(subject) {
        this.subjects[this.subjects.length] = subject;
        return this;
    },
    // remove all subjects
    clearSubjects: function() {
        this.subjects = [];
    },
    // forward the current state to the animation subjects
    propagate: function() {
        var value = this.options.transition(this.state);
        for (var i=0; i<this.subjects.length; i++) {
            if (this.subjects[i].setState) {
                this.subjects[i].setState(value);
            } else {
                this.subjects[i](value);
            }
        }
    },
    // called once per frame to update the current state
    onTimerEvent: function() {
        var now = new Date().getTime();
        var timePassed = now - this.lastTime;
        this.lastTime = now;
        var movement = (timePassed / this.options.duration) * (this.state < this.target ? 1 : -1);
        if (Math.abs(movement) >= Math.abs(this.state - this.target)) {
            this.state = this.target;
        } else {
            this.state += movement;
        }

        try {
            this.propagate();
        } finally {
            this.options.onStep.call(this);
            if (this.target == this.state) {
                if (this.options.repeat === 'toggle')
                    this.toggle();
                else if (this.options.repeat)
                    this.play();
                else
                    this.stop();
            }
        }
    },
    stop: function() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
            this.options.onComplete.call(this);
        }
    },
    // shortcuts
    play: function() {this.seekFromTo(0, 1)},
    reverse: function() {this.seekFromTo(1, 0)},
    // return a string describing this Animator, for debugging
    inspect: function() {
        var str = "#<Animator:\n";
        for (var i=0; i<this.subjects.length; i++) {
            str += this.subjects[i].inspect();
        }
        str += ">";
        return str;
    }
}
// merge the properties of two objects
Animator.applyDefaults = function(defaults, prefs) {
    prefs = prefs || {};
    var prop, result = {};
    for (prop in defaults) result[prop] = prefs[prop] !== undefined ? prefs[prop] : defaults[prop];
    return result;
}
// make an array from any object
Animator.makeArrayOfElements = function(o) {
    if (o == null) return [];
    if ("string" == typeof o) {
        return [document.getElementById(o)];
    }
    if (!o.length) return [o];
    var result = [];
    for (var i=0; i<o.length; i++) {
        if ("string" == typeof o[i]) {
            result[i] = document.getElementById(o[i]);
        } else {
            result[i] = o[i];
        }
    }
    return result;
}
// convert a dash-delimited-property to a camelCaseProperty (c/o Prototype, thanks Sam!)
Animator.camelize = function(string) {
    var oStringList = string.split('-');
    if (oStringList.length == 1) return oStringList[0];

    var camelizedString = string.indexOf('-') == 0
        ? oStringList[0].charAt(0).toUpperCase() + oStringList[0].substring(1)
        : oStringList[0];

    for (var i = 1, len = oStringList.length; i < len; i++) {
        var s = oStringList[i];
        camelizedString += s.charAt(0).toUpperCase() + s.substring(1);
    }
    return camelizedString;
}
// syntactic sugar for creating CSSStyleSubjects
Animator.apply = function(el, style, options) {
    if (style instanceof Array) {
        return new Animator(options).addSubject(new CSSStyleSubject(el, style[0], style[1]));
    }
    return new Animator(options).addSubject(new CSSStyleSubject(el, style));
}
// make a transition function that gradually accelerates. pass a=1 for smooth
// gravitational acceleration, higher values for an exaggerated effect
Animator.makeEaseIn = function(a) {
    return function(state) {
        return Math.pow(state, a*2);
    }
}
// as makeEaseIn but for deceleration
Animator.makeEaseOut = function(a) {
    return function(state) {
        return 1 - Math.pow(1 - state, a*2);
    }
}
// make a transition function that, like an object with momentum being attracted to a point,
// goes past the target then returns
Animator.makeElastic = function(bounces) {
    return function(state) {
        state = Animator.tx.easeInOut(state);
        return ((1-Math.cos(state * Math.PI * bounces)) * (1 - state)) + state;
    }
}
// make an Attack Decay Sustain Release envelope that starts and finishes on the same level
//
Animator.makeADSR = function(attackEnd, decayEnd, sustainEnd, sustainLevel) {
    if (sustainLevel == null) sustainLevel = 0.5;
    return function(state) {
        if (state < attackEnd) {
            return state / attackEnd;
        }
        if (state < decayEnd) {
            return 1 - ((state - attackEnd) / (decayEnd - attackEnd) * (1 - sustainLevel));
        }
        if (state < sustainEnd) {
            return sustainLevel;
        }
        return sustainLevel * (1 - ((state - sustainEnd) / (1 - sustainEnd)));
    }
}
// make a transition function that, like a ball falling to floor, reaches the target and/
// bounces back again
Animator.makeBounce = function(bounces) {
    var fn = Animator.makeElastic(bounces);
    return function(state) {
        state = fn(state);
        return state <= 1 ? state : 2-state;
    }
}

// pre-made transition functions to use with the 'transition' option
Animator.tx = {
    easeInOut: function(pos){
        return ((-Math.cos(pos*Math.PI)/2) + 0.5);
    },
    linear: function(x) {
        return x;
    },
    easeIn: Animator.makeEaseIn(1.5),
    easeOut: Animator.makeEaseOut(1.5),
    strongEaseIn: Animator.makeEaseIn(2.5),
    strongEaseOut: Animator.makeEaseOut(2.5),
    elastic: Animator.makeElastic(1),
    veryElastic: Animator.makeElastic(3),
    bouncy: Animator.makeBounce(1),
    veryBouncy: Animator.makeBounce(3)
}

// animates a pixel-based style property between two integer values
function NumericalStyleSubject(els, property, from, to, units) {
    this.els = Animator.makeArrayOfElements(els);
    this.property = Animator.camelize(property);
    this.from = parseFloat(from);
    this.to = parseFloat(to);
    this.units = units != null ? units : 'px';
}
NumericalStyleSubject.prototype = {
    setState: function(state) {
        var style = this.getStyle(state);
        var visibility = (this.property == 'opacity' && state == 0) ? 'hidden' : '';
        var j=0;
        for (var i=0; i<this.els.length; i++) {
            try {
                this.els[i].style[this.property] = style;
            } catch (e) {
                // ignore fontWeight - intermediate numerical values cause exeptions in firefox
                if (this.property != 'fontWeight') throw e;
            }
            if (j++ > 20) return;
        }
    },
    getStyle: function(state) {
        state = this.from + ((this.to - this.from) * state);
        if (this.property == 'opacity') return state;
        return Math.round(state) + this.units;
    },
    inspect: function() {
        return "\t" + this.property + "(" + this.from + this.units + " to " + this.to + this.units + ")\n";
    }
}

// animates a colour based style property between two hex values
function ColorStyleSubject(els, property, from, to) {
    this.els = Animator.makeArrayOfElements(els);
    this.property = Animator.camelize(property);
    this.to = this.expandColor(to);
    this.from = this.expandColor(from);
    this.origFrom = from;
    this.origTo = to;
}

ColorStyleSubject.prototype = {
    // parse "#FFFF00" to [256, 256, 0]
    expandColor: function(color) {
        var hexColor, red, green, blue;
        hexColor = ColorStyleSubject.parseColor(color);
        if (hexColor) {
            red = parseInt(hexColor.slice(1, 3), 16);
            green = parseInt(hexColor.slice(3, 5), 16);
            blue = parseInt(hexColor.slice(5, 7), 16);
            return [red,green,blue]
        }
        if (window.ANIMATOR_DEBUG) {
            alert("Invalid colour: '" + color + "'");
        }
    },
    getValueForState: function(color, state) {
        return Math.round(this.from[color] + ((this.to[color] - this.from[color]) * state));
    },
    setState: function(state) {
        var color = '#'
            + ColorStyleSubject.toColorPart(this.getValueForState(0, state))
            + ColorStyleSubject.toColorPart(this.getValueForState(1, state))
            + ColorStyleSubject.toColorPart(this.getValueForState(2, state));
        for (var i=0; i<this.els.length; i++) {
            this.els[i].style[this.property] = color;
        }
    },
    inspect: function() {
        return "\t" + this.property + "(" + this.origFrom + " to " + this.origTo + ")\n";
    }
}

// return a properly formatted 6-digit hex colour spec, or false
ColorStyleSubject.parseColor = function(string) {
    var color = '#', match;
    if(match = ColorStyleSubject.parseColor.rgbRe.exec(string)) {
        var part;
        for (var i=1; i<=3; i++) {
            part = Math.max(0, Math.min(255, parseInt(match[i])));
            color += ColorStyleSubject.toColorPart(part);
        }
        return color;
    }
    if (match = ColorStyleSubject.parseColor.hexRe.exec(string)) {
        if(match[1].length == 3) {
            for (var i=0; i<3; i++) {
                color += match[1].charAt(i) + match[1].charAt(i);
            }
            return color;
        }
        return '#' + match[1];
    }
    return false;
}
// convert a number to a 2 digit hex string
ColorStyleSubject.toColorPart = function(number) {
    if (number > 255) number = 255;
    var digits = number.toString(16);
    if (number < 16) return '0' + digits;
    return digits;
}
ColorStyleSubject.parseColor.rgbRe = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
ColorStyleSubject.parseColor.hexRe = /^\#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Animates discrete styles, i.e. ones that do not scale but have discrete values
// that can't be interpolated
function DiscreteStyleSubject(els, property, from, to, threshold) {
    this.els = Animator.makeArrayOfElements(els);
    this.property = Animator.camelize(property);
    this.from = from;
    this.to = to;
    this.threshold = threshold || 0.5;
}

DiscreteStyleSubject.prototype = {
    setState: function(state) {
        var j=0;
        for (var i=0; i<this.els.length; i++) {
            this.els[i].style[this.property] = state <= this.threshold ? this.from : this.to;
        }
    },
    inspect: function() {
        return "\t" + this.property + "(" + this.from + " to " + this.to + " @ " + this.threshold + ")\n";
    }
}

// animates between two styles defined using CSS.
// if style1 and style2 are present, animate between them, if only style1
// is present, animate between the element's current style and style1
function CSSStyleSubject(els, style1, style2) {
    els = Animator.makeArrayOfElements(els);
    this.subjects = [];
    if (els.length == 0) return;
    var prop, toStyle, fromStyle;
    if (style2) {
        fromStyle = this.parseStyle(style1, els[0]);
        toStyle = this.parseStyle(style2, els[0]);
    } else {
        toStyle = this.parseStyle(style1, els[0]);
        fromStyle = {};
        for (prop in toStyle) {
            fromStyle[prop] = CSSStyleSubject.getStyle(els[0], prop);
        }
    }
    // remove unchanging properties
    var prop;
    for (prop in fromStyle) {
        if (fromStyle[prop] == toStyle[prop]) {
            delete fromStyle[prop];
            delete toStyle[prop];
        }
    }
    // discover the type (numerical or colour) of each style
    var prop, units, match, type, from, to;
    for (prop in fromStyle) {
        var fromProp = String(fromStyle[prop]);
        var toProp = String(toStyle[prop]);
        if (toStyle[prop] == null) {
            if (window.ANIMATOR_DEBUG) alert("No to style provided for '" + prop + '"');
            continue;
        }

        if (from = ColorStyleSubject.parseColor(fromProp)) {
            to = ColorStyleSubject.parseColor(toProp);
            type = ColorStyleSubject;
        } else if (fromProp.match(CSSStyleSubject.numericalRe)
            && toProp.match(CSSStyleSubject.numericalRe)) {
            from = parseFloat(fromProp);
            to = parseFloat(toProp);
            type = NumericalStyleSubject;
            match = CSSStyleSubject.numericalRe.exec(fromProp);
            var reResult = CSSStyleSubject.numericalRe.exec(toProp);
            if (match[1] != null) {
                units = match[1];
            } else if (reResult[1] != null) {
                units = reResult[1];
            } else {
                units = reResult;
            }
        } else if (fromProp.match(CSSStyleSubject.discreteRe)
            && toProp.match(CSSStyleSubject.discreteRe)) {
            from = fromProp;
            to = toProp;
            type = DiscreteStyleSubject;
            units = 0;   // hack - how to get an animator option down to here
        } else {
            if (window.ANIMATOR_DEBUG) {
                alert("Unrecognised format for value of "
                    + prop + ": '" + fromStyle[prop] + "'");
            }
            continue;
        }
        this.subjects[this.subjects.length] = new type(els, prop, from, to, units);
    }
}

CSSStyleSubject.prototype = {
    // parses "width: 400px; color: #FFBB2E" to {width: "400px", color: "#FFBB2E"}
    parseStyle: function(style, el) {
        var rtn = {};
        // if style is a rule set
        if (style.indexOf(":") != -1) {
            var styles = style.split(";");
            for (var i=0; i<styles.length; i++) {
                var parts = CSSStyleSubject.ruleRe.exec(styles[i]);
                if (parts) {
                    rtn[parts[1]] = parts[2];
                }
            }
        }
        // else assume style is a class name
        else {
            var prop, value, oldClass;
            oldClass = el.className;
            el.className = style;
            for (var i=0; i<CSSStyleSubject.cssProperties.length; i++) {
                prop = CSSStyleSubject.cssProperties[i];
                value = CSSStyleSubject.getStyle(el, prop);
                if (value != null) {
                    rtn[prop] = value;
                }
            }
            el.className = oldClass;
        }
        return rtn;

    },
    setState: function(state) {
        for (var i=0; i<this.subjects.length; i++) {
            this.subjects[i].setState(state);
        }
    },
    inspect: function() {
        var str = "";
        for (var i=0; i<this.subjects.length; i++) {
            str += this.subjects[i].inspect();
        }
        return str;
    }
}
// get the current value of a css property,
CSSStyleSubject.getStyle = function(el, property){
    var style;
    if(document.defaultView && document.defaultView.getComputedStyle){
        style = document.defaultView.getComputedStyle(el, "").getPropertyValue(property);
        if (style) {
            return style;
        }
    }
    property = Animator.camelize(property);
    if(el.currentStyle){
        style = el.currentStyle[property];
    }
    return style || el.style[property]
}


CSSStyleSubject.ruleRe = /^\s*([a-zA-Z\-]+)\s*:\s*(\S(.+\S)?)\s*$/;
CSSStyleSubject.numericalRe = /^-?\d+(?:\.\d+)?(%|[a-zA-Z]{2})?$/;
CSSStyleSubject.discreteRe = /^\w+$/;

// required because the style object of elements isn't enumerable in Safari
/*
 CSSStyleSubject.cssProperties = ['background-color','border','border-color','border-spacing',
 'border-style','border-top','border-right','border-bottom','border-left','border-top-color',
 'border-right-color','border-bottom-color','border-left-color','border-top-width','border-right-width',
 'border-bottom-width','border-left-width','border-width','bottom','color','font-size','font-size-adjust',
 'font-stretch','font-style','height','left','letter-spacing','line-height','margin','margin-top',
 'margin-right','margin-bottom','margin-left','marker-offset','max-height','max-width','min-height',
 'min-width','orphans','outline','outline-color','outline-style','outline-width','overflow','padding',
 'padding-top','padding-right','padding-bottom','padding-left','quotes','right','size','text-indent',
 'top','width','word-spacing','z-index','opacity','outline-offset'];*/


CSSStyleSubject.cssProperties = ['azimuth','background','background-attachment','background-color','background-image','background-position','background-repeat','border-collapse','border-color','border-spacing','border-style','border-top','border-top-color','border-right-color','border-bottom-color','border-left-color','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-width','border-right-width','border-bottom-width','border-left-width','border-width','bottom','clear','clip','color','content','cursor','direction','display','elevation','empty-cells','css-float','font','font-family','font-size','font-size-adjust','font-stretch','font-style','font-variant','font-weight','height','left','letter-spacing','line-height','list-style','list-style-image','list-style-position','list-style-type','margin','margin-top','margin-right','margin-bottom','margin-left','max-height','max-width','min-height','min-width','orphans','outline','outline-color','outline-style','outline-width','overflow','padding','padding-top','padding-right','padding-bottom','padding-left','pause','position','right','size','table-layout','text-align','text-decoration','text-indent','text-shadow','text-transform','top','vertical-align','visibility','white-space','width','word-spacing','z-index','opacity','outline-offset','overflow-x','overflow-y'];


// chains several Animator objects together
function AnimatorChain(animators, options) {
    this.animators = animators;
    this.setOptions(options);
    for (var i=0; i<this.animators.length; i++) {
        this.listenTo(this.animators[i]);
    }
    this.forwards = false;
    this.current = 0;
}

AnimatorChain.prototype = {
    // apply defaults
    setOptions: function(options) {
        this.options = Animator.applyDefaults({
            // by default, each call to AnimatorChain.play() calls jumpTo(0) of each animator
            // before playing, which can cause flickering if you have multiple animators all
            // targeting the same element. Set this to false to avoid this.
            resetOnPlay: true
        }, options);
    },
    // play each animator in turn
    play: function() {
        this.forwards = true;
        this.current = -1;
        if (this.options.resetOnPlay) {
            for (var i=0; i<this.animators.length; i++) {
                this.animators[i].jumpTo(0);
            }
        }
        this.advance();
    },
    // play all animators backwards
    reverse: function() {
        this.forwards = false;
        this.current = this.animators.length;
        if (this.options.resetOnPlay) {
            for (var i=0; i<this.animators.length; i++) {
                this.animators[i].jumpTo(1);
            }
        }
        this.advance();
    },
    // if we have just play()'d, then call reverse(), and vice versa
    toggle: function() {
        if (this.forwards) {
            this.seekTo(0);
        } else {
            this.seekTo(1);
        }
    },
    // internal: install an event listener on an animator's onComplete option
    // to trigger the next animator
    listenTo: function(animator) {
        var oldOnComplete = animator.options.onComplete;
        var _this = this;
        animator.options.onComplete = function() {
            if (oldOnComplete) oldOnComplete.call(animator);
            _this.advance();
        }
    },
    // play the next animator
    advance: function() {
        if (this.forwards) {
            if (this.animators[this.current + 1] == null) return;
            this.current++;
            this.animators[this.current].play();
        } else {
            if (this.animators[this.current - 1] == null) return;
            this.current--;
            this.animators[this.current].reverse();
        }
    },
    // this function is provided for drop-in compatibility with Animator objects,
    // but only accepts 0 and 1 as target values
    seekTo: function(target) {
        if (target <= 0) {
            this.forwards = false;
            this.animators[this.current].seekTo(0);
        } else {
            this.forwards = true;
            this.animators[this.current].seekTo(1);
        }
    }
};

/*
 Javascript AudioFX Library - https://github.com/jakesgordon/javascript-audio-fx
 Copyright (c) 2011, 2012, 2013, 2014, 2015, 2016 Jake Gordon and contributors
 Released under the MIT license - https://github.com/jakesgordon/javascript-audio-fx/blob/master/LICENSE
 */

AudioFX = function() {

    //---------------------------------------------------------------------------

    var hasAudio = false, audio = document.createElement('audio'), audioSupported = function(type) { var s = audio.canPlayType(type); return (s === 'probably') || (s === 'maybe'); };
    if (audio && audio.canPlayType) {
        hasAudio = {
            ogg: audioSupported('audio/ogg; codecs="vorbis"'),
            mp3: audioSupported('audio/mpeg;'),
            wav: audioSupported('audio/wav; codecs="1"'),
            loop: (typeof audio.loop === 'boolean') // some browsers (FF) dont support loop yet
        }
    }

    var isplaying = function(audio) { return !audio.paused && !audio.ended; }

    //---------------------------------------------------------------------------

    var create = function(src, options, onload) {

        var audio = document.createElement('audio');

        if (onload) {
            var ready = function() {
                audio.removeEventListener('canplay', ready, false);
                onload();
            }
            audio.addEventListener('canplay', ready, false);
        }

        if (options.loop && !hasAudio.loop)
            audio.addEventListener('ended', function() { audio.currentTime = 0; audio.play(); }, false);

        audio.volume = options.volume || 0.2;
        audio.loop   = options.loop;
        audio.src    = src;

        return audio;
    }

    //---------------------------------------------------------------------------

    var wrapper = function(src, options, onload) {

        var pool = [];
        if (hasAudio) {
            for(var n = 0 ; n < (options.pool || 1) ; n++)
                pool.push(create(src, options, n == 0 ? onload : null));
        }
        else {
            onload();
        }

        var find = function() {
            var n, audio;
            for(n = 0 ; n < pool.length ; n++) {
                audio = pool[n];
                if (audio.paused || audio.ended)
                    return audio;
            }
        };

        return {

            audio: (pool.length == 1 ? pool[0] : pool),

            play: function() {
                var audio = find();
                if (audio && !AudioFX.mute)
                    audio.play();
                return audio;
            },

            stop: function() {
                var n, audio;
                for(n = 0 ; n < pool.length ; n++) {
                    audio = pool[n];
                    if (isplaying(audio)) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                }
            },

            fade: function(over) {
                var audio = this.audio,
                    max   = audio.volume,
                    dt    = 100,
                    step  = function() {
                        audio.volume = Math.max(0, audio.volume - (max/((over||1000)/dt)));
                        if (audio.volume === 0) {
                            audio.pause();
                            audio.currentTime = 0;
                            audio.volume = max;
                            return;
                        }
                        setTimeout(step, dt);
                    };
                step();
            }

        };

    };

    //---------------------------------------------------------------------------

    var factory = function(name, options, onload) {
        options = options || {};

        var src = name, formats = options.formats;
        if (formats) {
            for(var n = 0 ; n < formats.length ; n++) {
                if (hasAudio && hasAudio[formats[n]]) {
                    src = src + '.' + formats[n];
                    break;
                }
            }
        }

        return wrapper(src, options, onload);
    };

    //---------------------------------------------------------------------------

    factory.enabled = hasAudio; // expose feature detection as AudioFX.enabled
    factory.mute    = false;    // expose global mute ability as AudioFX.mute

    return factory; // caller should "var sound = AudioFX(name, options, onload)"

    //---------------------------------------------------------------------------

}();

/*
 Javascript State Machine Library - https://github.com/jakesgordon/javascript-state-machine
 Copyright (c) 2012, 2013 Jake Gordon and contributors
 Released under the MIT license - https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE
 */

(function (window) {

    var StateMachine = {

        //---------------------------------------------------------------------------

        VERSION: "2.2.0",

        //---------------------------------------------------------------------------

        Result: {
            SUCCEEDED:    1, // the event transitioned successfully from one state to another
            NOTRANSITION: 2, // the event was successfull but no state transition was necessary
            CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback
            PENDING:      4  // the event is asynchronous and the caller is in control of when the transition occurs
        },

        Error: {
            INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state
            PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending
            INVALID_CALLBACK:   300 // caller provided callback function threw an exception
        },

        WILDCARD: '*',
        ASYNC: 'async',

        //---------------------------------------------------------------------------

        create: function(cfg, target) {

            var initial   = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
            var terminal  = cfg.terminal || cfg['final'];
            var fsm       = target || cfg.target  || {};
            var events    = cfg.events || [];
            var callbacks = cfg.callbacks || {};
            var map       = {};

            var add = function(e) {
                var from = (e.from instanceof Array) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
                map[e.name] = map[e.name] || {};
                for (var n = 0 ; n < from.length ; n++)
                    map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified
            };

            if (initial) {
                initial.event = initial.event || 'startup';
                add({ name: initial.event, from: 'none', to: initial.state });
            }

            for(var n = 0 ; n < events.length ; n++)
                add(events[n]);

            for(var name in map) {
                if (map.hasOwnProperty(name))
                    fsm[name] = StateMachine.buildEvent(name, map[name]);
            }

            for(var name in callbacks) {
                if (callbacks.hasOwnProperty(name))
                    fsm[name] = callbacks[name]
            }

            fsm.current = 'none';
            fsm.is      = function(state) { return (state instanceof Array) ? (state.indexOf(this.current) >= 0) : (this.current === state); };
            fsm.can     = function(event) { return !this.transition && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); }
            fsm.cannot  = function(event) { return !this.can(event); };
            fsm.error   = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)

            fsm.isFinished = function() { return this.is(terminal); };

            if (initial && !initial.defer)
                fsm[initial.event]();

            return fsm;

        },

        //===========================================================================

        doCallback: function(fsm, func, name, from, to, args) {
            if (func) {
                try {
                    return func.apply(fsm, [name, from, to].concat(args));
                }
                catch(e) {
                    return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
                }
            }
        },

        beforeAnyEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbeforeevent'],                       name, from, to, args); },
        afterAnyEvent:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafterevent'] || fsm['onevent'],      name, from, to, args); },
        leaveAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleavestate'],                        name, from, to, args); },
        enterAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenterstate'] || fsm['onstate'],      name, from, to, args); },
        changeState:     function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onchangestate'],                       name, from, to, args); },

        beforeThisEvent: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbefore' + name],                     name, from, to, args); },
        afterThisEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafter'  + name] || fsm['on' + name], name, from, to, args); },
        leaveThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleave'  + from],                     name, from, to, args); },
        enterThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenter'  + to]   || fsm['on' + to],   name, from, to, args); },

        beforeEvent: function(fsm, name, from, to, args) {
            if ((false === StateMachine.beforeThisEvent(fsm, name, from, to, args)) ||
                (false === StateMachine.beforeAnyEvent( fsm, name, from, to, args)))
                return false;
        },

        afterEvent: function(fsm, name, from, to, args) {
            StateMachine.afterThisEvent(fsm, name, from, to, args);
            StateMachine.afterAnyEvent( fsm, name, from, to, args);
        },

        leaveState: function(fsm, name, from, to, args) {
            var specific = StateMachine.leaveThisState(fsm, name, from, to, args),
                general  = StateMachine.leaveAnyState( fsm, name, from, to, args);
            if ((false === specific) || (false === general))
                return false;
            else if ((StateMachine.ASYNC === specific) || (StateMachine.ASYNC === general))
                return StateMachine.ASYNC;
        },

        enterState: function(fsm, name, from, to, args) {
            StateMachine.enterThisState(fsm, name, from, to, args);
            StateMachine.enterAnyState( fsm, name, from, to, args);
        },

        //===========================================================================

        buildEvent: function(name, map) {
            return function() {

                var from  = this.current;
                var to    = map[from] || map[StateMachine.WILDCARD] || from;
                var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array

                if (this.transition)
                    return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");

                if (this.cannot(name))
                    return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);

                if (false === StateMachine.beforeEvent(this, name, from, to, args))
                    return StateMachine.Result.CANCELLED;

                if (from === to) {
                    StateMachine.afterEvent(this, name, from, to, args);
                    return StateMachine.Result.NOTRANSITION;
                }

                // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
                var fsm = this;
                this.transition = function() {
                    fsm.transition = null; // this method should only ever be called once
                    fsm.current = to;
                    StateMachine.enterState( fsm, name, from, to, args);
                    StateMachine.changeState(fsm, name, from, to, args);
                    StateMachine.afterEvent( fsm, name, from, to, args);
                    return StateMachine.Result.SUCCEEDED;
                };
                this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
                    fsm.transition = null;
                    StateMachine.afterEvent(fsm, name, from, to, args);
                }

                var leave = StateMachine.leaveState(this, name, from, to, args);
                if (false === leave) {
                    this.transition = null;
                    return StateMachine.Result.CANCELLED;
                }
                else if (StateMachine.ASYNC === leave) {
                    return StateMachine.Result.PENDING;
                }
                else {
                    if (this.transition) // need to check in case user manually called transition() but forgot to return StateMachine.ASYNC
                        return this.transition();
                }

            };
        }

    }; // StateMachine

    //===========================================================================

    if ("function" === typeof define) {
        define(function(require) { return StateMachine; });
    }
    else {
        window.StateMachine = StateMachine;
    }

}(this));


