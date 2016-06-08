LastDrop = function() {

    'use strict';

    //===========================================================================
    // CONSTANTS
    //===========================================================================

    var FPS = 60,
        TILE = { W: 90, H: 160 },
        ALLY = {
            MELEE:    { sx: 0, sy: 0, frames: 4, tpf: FPS/15, health: 500, speed: 200/FPS, damage: 50/FPS, armor: 3, weapon: { speed: 600/FPS, reload: 0.40*FPS, damgage: 4, active: false }, sex: "female", name: "melee"    },
            RANGED:   { sx: 0, sy: 0, frames: 4, tpf: FPS/15, health: 500, speed: 220/FPS, damage: 40/FPS, armor: 2, weapon: { speed: 620/FPS, reload: 0.35*FPS, damgage: 4, active: false }, sex: "female", name: "ranged"   },
            GATHERER: { sx: 0, sy: 0, frames: 4, tpf: FPS/15, health: 0,   speed: 260/FPS, damage: 0,      armor: 0, weapon: { speed: 660/FPS, reload: 0.25*FPS, damgage: 4, active: false }, sex: "female", name: "gatherer" }
        },
        ENEMY = {
            MELEE:  { sx: 0, sy: 0, frames: 4, tpf: FPS/15, health: 500, speed: 200/FPS, damage: 50/FPS, armor: 3, weapon: { speed: 600/FPS, reload: 0.40*FPS, damgage: 4, active: false }, sex: "female", name: "melee"  },
            RANGED: { sx: 0, sy: 0, frames: 4, tpf: FPS/15, health: 500, speed: 220/FPS, damage: 40/FPS, armor: 2, weapon: { speed: 620/FPS, reload: 0.35*FPS, damgage: 4, active: false }, sex: "female", name: "ranged" }
        },
        FX = {
            ATTACK: { sx: 0, sy: 0, frames: 5, tpf: FPS/15}
        },
        ALLIES  = [ ALLY.MELEE, ALLY.RANGED, ALLY.GATHERER ],
        ENEMIES = [ ENEMY.MELEE, ENEMY.RANGED ],
        CBOX = {
            ALLY:   { x: 0, y: 0, w: TILE.W/2, h: TILE.H - TILE.H/4 },
            ENEMY:  { x: 0, y: 0, w: TILE.W/2, h: TILE.H - TILE.H/4 },
            WEAPON: { x: 0, y: 0, w: TILE.W,   h: TILE.H            }
        },
        EVENT = {
            START_LEVEL:        0,
            ALLY_DEATH:         1,
            ALLY_FIRE:          2,
            ALLY_HURT:          3,
            ENEMY_DEATH:        4,
            ENEMY_FIRE:         5,
            GENERATOR_DEATH:    6,
            ALLY_COLLIDE:       7,
            ENEMY_COLLIDE:      8,
            WEAPON_COLLIDE:     9,
            FX_FINISHED:        10
        };

    //===========================================================================
    // CONFIGURATION
    //===========================================================================
    var cfg = {

        runner: {
            fps: FPS,
            stats: true
        },

        state: {
            initial: 'booting',
            events: [
                {name: 'ready', from: 'booting', to: 'menu'}, // initial page loads images and sounds then transitions to 'menu'
                {name: 'start', from: 'menu', to: 'starting'}, // start a new game from the menu
                {name: 'load', from: ['starting', 'playing'], to: 'loading'}, // start loading a new level (either to start a new game, or next level while playing)
                {name: 'play', from: 'loading', to: 'playing'}, // play the level after loading it
                {name: 'help', from: ['loading', 'playing'], to: 'help'}, // pause the game to show a help topic
                {name: 'resume', from: 'help', to: 'playing'}, // resume playing after showing a help topic
                {name: 'lose', from: 'playing', to: 'lost'}, // player died
                {name: 'quit', from: 'playing', to: 'lost'}, // player quit
                {name: 'win', from: 'playing', to: 'won'}, // player won
                {name: 'finish', from: ['won', 'lost'], to: 'menu'}  // back to menu
            ]
        },

        pubsub: [
            {
                event: EVENT.ENEMY_DEATH, action: function (monster, by, nuke) {
                this.onMonsterDeath(monster, by, nuke);
            }
            },
            {
                event: EVENT.GENERATOR_DEATH, action: function (generator, by) {
                this.onGeneratorDeath(generator, by);
            }
            },
            {
                event: EVENT.WEAPON_COLLIDE, action: function (weapon, entity) {
                this.onWeaponCollide(weapon, entity);
            }
            },
            {
                event: EVENT.ALLY_COLLIDE, action: function (player, entity) {
                this.onPlayerCollide(player, entity);
            }
            },
            {
                event: EVENT.ENEMY_COLLIDE, action: function (monster, entity) {
                this.onMonsterCollide(monster, entity);
            }
            },
            {
                event: EVENT.ALLY_FIRE, action: function (player) {
                this.onPlayerFire(player);
            }
            },
            {
                event: EVENT.ENEMY_FIRE, action: function (monster) {
                this.onMonsterFire(monster);
            }
            },
            {
                event: EVENT.FX_FINISHED, action: function (fx) {
                this.onFxFinished(fx);
            }
            },
            {
                event: EVENT.ALLY_DEATH, action: function (player) {
                this.onPlayerDeath(player);
            }
            }
        ],

        images: [
            {id: 'backgrounds', url: "images/backgrounds.png"},
            {id: 'entities', url: "images/entities.png"}
        ],

        sounds: [
            {id: 'someID', name: 'music/sound', loop: true}

        ],

        waves: [
            {name: 'Wave One', url: "wave/wave1.png", music: 'music/someSong.mp3'}

        ]
    };

    //===========================================================================
    // UTILITY METHODS
    //===========================================================================
    function publish()   { game.publish.apply(game, arguments);   }
    function subscribe() { game.subscribe.apply(game, arguments); }

    function countdown(n, dn)  { return n ? Math.max(0, n - (dn || 1)) : 0; }

    function Sprite(opt) {

        var self = {},
            index = 0,
            tickCount = 0,
            ticksPerFrame = opt.ticksPerFrame || 0,
            numFrames = opt.numFrames || 1;

        self.context = opt.context;
        self.width = opt.width;
        self.height = opt.height;
        self.image = opt.image;

        self.update = function() {

            tickCount += 1;

            if (tickCount > ticksPerFrame) {

                tickCount = 0;

                // If the current frame index is in range
                if (index < numFrames - 1) {
                    // Go to the next frame
                    index += 1;
                } else { //reset
                    index = 0;
                }
            }
        };

        self.draw = function() {

            // Draw it
            self.context.drawImage(
                self.image,
                index * self.width / numFrames,
                0,
                self.width / numFrames,
                self.height,
                self.image.X,
                self.image.Y,
                self.image.width,
                self.image.height);
        };
        return self;
    }

    function overlapEntity(x, y, w, h, entity) {
        return Game.Math.overlap(x, y, w, h, entity.x + entity.cbox.x,
            entity.y + entity.cbox.y,
            entity.cbox.w,
            entity.cbox.h);
    }

    //===========================================================================
    // THE GAME ENGINE
    //===========================================================================

    var game = {

        cfg: cfg,

        run: function (runner) {

            StateMachine.create(cfg.state, this);
            Game.PubSub.enable(cfg.pubsub, this);
            Game.Key.map(cfg.keys, this);

            Game.loadResources(cfg.images, cfg.sounds, function (resources) {
                this.runner = runner;
                this.images = resources.images;
                this.player = new Player();
                this.render = new Render(resources.images);
                this.sounds = new Sounds(resources.sounds);
                this.ready();
            }.bind(this));

        },

        //---------------------------
        // STATE MACHINE TRANSITIONS
        //---------------------------


        //-----------------------
        // UPDATE/DRAW GAME LOOP
        //-----------------------


        //------------------------
        // PUB/SUB EVENT HANDLING
        //------------------------


        //------
        // MISC
        //------

    };
    //===========================================================================
    // ENEMIES
    //===========================================================================



    //===========================================================================
    // GENERATORS
    //===========================================================================



    //===========================================================================
    // WEAPONS
    //===========================================================================



    //===========================================================================
    // EXIT
    //===========================================================================



    //===========================================================================
    // FX
    //===========================================================================



    //===========================================================================
    // THE ALLY
    //===========================================================================



    //===========================================================================
    // RENDERING CODE
    //===========================================================================



    //===========================================================================
    // SOUND FX and MUSIC
    //===========================================================================



    //===========================================================================
    // return game to Game.Runner
    //===========================================================================

    return game;

    //===========================================================================

}