
// var isCtrlHold = false;
// var isShiftHold = false;

// $(document).keyup(function (e) {
//     if (e.which == 17) //17 is the code of Ctrl button
//         isCtrlHold = false;
//     if (e.which == 16) //16 is the code of Shift button
//         isShiftHold = false;
// });
// $(document).keydown(function (e) {
//     if (e.which == 17)
//         isCtrlHold = true;
//     if (e.which == 16)
//         isShiftHold = true;
    
//     ShortcutManager(e);
// });

// function ShortcutManager(e)
// {   
//     if (isCtrlHold || isShiftHold) 
//     {
//         e.preventDefault(); //prevent browser from the default behavior
//     }
// }

var windowWidth = 1155;
var windowHeight = 650;
var config = {
    width: windowWidth,
    height: windowHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // antialiasGL: false,
    renderer: {type: Phaser.WEBGL, mipmapFilter: 'NEAREST' },
    pixelArt: true,
    clearBeforeRender: true,
    zoom: 5,
    physics: {
        default: 'matter',
        matter: {
        	// debug: true,
        	gravity: {
                x: 0,
                y: 0
            }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var scene;
var player;
var germs;
var germSpline;
var germSplineT;
var germPosition;
var keys;
var last_direction;
var map;
var fpsText;

function preload ()
{
    this.load.atlas('prepper', './assets/prepper.png', './assets/prepper.json');
    // this.load.atlas('male', './assets/male.png', './assets/male.json');
    // this.load.image('male', './assets/male.png');
    // this.load.json('male', './assets/male.json');
    this.load.image('tileset', 'assets/tileset_inside.png');
    this.load.tilemapTiledJSON('map', './assets/tilemap_inside.json');

    this.load.atlas('germ', 'assets/germ.png', 'assets/germ.json');
}

function spriteFromAsepriteAtlas(atlasTexture)
{
	// var body_config = 
	// {
	// 	label: atlasTexture.key+'_body',
	// 	vertices: [{x:-13,y:(45)},{x:+13,y:(45)},{x:+13,y:(50)},{x:-13,y:(50)}]
	// 	// position: {x:0,y:42}
	// };
	var sprite = scene.matter.add.sprite(0,0,atlasTexture.key);//, null, body_config);

	let frameTags = atlasTexture.customData.meta.frameTags;
	for(tagIndex in frameTags)
	{
		let tag = frameTags[tagIndex];
		console.log('tag: ' + tag.name);

		var frames = [];
		for(var frameIndex = tag.from; frameIndex <= tag.to; frameIndex++)
		{
			let frame = Object.values(atlasTexture.frames)[frameIndex+1];
			frames.push({
							key:atlasTexture.key, 
							frame: frame.name, 
							duration:frame.customData.duration
						});
		}

		let config = 
		{
			key: tag.name,
			frames: frames,
			yoyo: ((tag.direction=='pingpong') ? true : false),
			repeat: -1
		};
		scene.anims.create(config);

		sprite.anims.load(tag.name);
	}

	return sprite;
}

function setupLayerColliders(tileset, map, layer)
{
    map.setCollisionByExclusion([-1,0],true,true,layer);
    var graphics = scene.add.graphics();
    layer.forEachTile(function (tile) 
    {
        var tileWorldPos = layer.tileToWorldXY(tile.x, tile.y);
        var collisionGroup = tileset.getTileCollisionGroup(tile.index);

        if (!collisionGroup || collisionGroup.objects.length === 0) { return; }

		graphics.lineStyle(1, 0xff5555, 1);

		var objects = collisionGroup.objects;

        for (var i = 0; i < objects.length; i++)
        {
            var object = objects[i];
            var objectX = tileWorldPos.x + object.x;
            var objectY = tileWorldPos.y + object.y;

            // When objects are parsed by Phaser, they will be guaranteed to have one of the
            // following properties if they are a rectangle/ellipse/polygon/polyline.
            if (object.rectangle)
            {
                // graphics.strokeRect(objectX, objectY, object.width, object.height);
                scene.matter.add.rectangle(objectX, objectY, object.width, object.height, {isStatic:true});
            }
            else if (object.ellipse)
            {
                // Ellipses in Tiled have a top-left origin, while ellipses in Phaser have a center
                // origin
                // graphics.strokeEllipse(
                //     objectX + object.width / 2, objectY + object.height / 2,
                //     object.width, object.height
                // );
            }
            else if (object.polygon || object.polyline)
            {
                var originalPoints = object.polygon ? object.polygon : object.polyline;
                // let vertices = scene.matter.vertices.create(originalPoints);
                let center = scene.matter.vertices.centre(originalPoints);
                // var points = [];
                // for (var j = 0; j < originalPoints.length; j++)
                // {
                //     var point = originalPoints[j];
                //     points.push({
                //         x: objectX + point.x,
                //         y: objectY + point.y
                //     });
                // }
                // graphics.strokePoints(points);
                scene.matter.add.fromVertices(objectX+center.x, objectY+center.y, originalPoints, {isStatic:true});
            }
        }
    });
}

function create ()
{
	scene = this;
	// this.matter.world.setBounds(0, 0, 800, 600);
	// var anim_config = 
	// {
	// 	key: 'walk_d', 
	// 	frames: [{key:'male',frame:'male 0.aseprite'},{key:'male',frame:'male 1.aseprite'},{key:'male',frame:'male 2.aseprite'}], 
	// 	frameRate: 6, 
	// 	yoyo: true, 
	// 	repeat: -1
	// };
	// var anim = this.anims.create(anim_config);
	// console.log(anim);
	// var sprite = this.add.sprite(400, 300, 'male');
	// sprite.anims.load('walk_d');
	// sprite.anims.play('walk_d');

	// renderTexture = this.add.renderTexture(0, 0, windowWidth, windowHeight);
	
	this.matter.set60Hz();

	map = this.make.tilemap({ key: 'map' });
    var tileset = map.addTilesetImage('tileset_inside', 'tileset');
    let mapX = 0;//(windowWidth/2) - (map.widthInPixels/2);
    let mapY = 0;//(windowHeight/2) - (map.heightInPixels/2);
    let ground = map.createDynamicLayer('ground', tileset, mapX, mapY).setDepth(0).setVisible(true);
    let walls = map.createDynamicLayer('walls', tileset, mapX, mapY).setDepth(2).setVisible(true);
    // map.setCollisionByExclusion([-1,0],true,true,ground);
    // this.matter.world.convertTilemapLayer(ground);
    // map.setCollisionByExclusion([-1,0],true,true,walls);
    // this.matter.world.convertTilemapLayer(walls);
    this.matter.world.setBounds(map.widthInPixels, map.heightInPixels);

	setupLayerColliders(tileset, map, ground);
	setupLayerColliders(tileset, map, walls);

    let bodyCount = this.matter.world.getAllBodies().length;

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    
	player = spriteFromAsepriteAtlas(this.textures.get('prepper'));
	player.anims.play('idle', true);
	player.setPosition(windowWidth/2,windowHeight/2);
    player.setRectangle(5,2);
	player.setOrigin(0.5,0.9);
	// player.setScale(4);
	player.setFixedRotation();
    player.setAngle(0);
    player.setFrictionAir(0.05);
    player.setMass(10);
    player.setDepth(1);
    last_direction = new Phaser.Math.Vector2(0,0); 
	// player.setCollideWorldBounds(true);
	// sprite.anims.play('walk_u');

	for(objectLayerIndex in map.objects)
	{
		for(objectIndex in map.objects[objectLayerIndex].objects)
		{
			object = map.objects[objectLayerIndex].objects[objectIndex];
			if(object.name == 'player_spawn')
			{
				player.setPosition(mapX+object.x, mapY+object.y);
			}
			else if (object.name = 'germ_spawn')
			{
				let germ_particles = this.add.particles('germ');
				germ_particles.setDepth(1.5);
				// var path = new Phaser.Curves.Path(object.x, object.y).lineTo(player.x, player.y).closePath();
				// germs = germ_particles.createEmitter({
				// 				        frame: [ 'germ 0.aseprite' ],
				// 				        x: object.x,
				// 				        y: object.y,
				// 				        lifespan: 1000,
				// 				        speed: { min: 0.1, max: 10 },
				// 				        // scale: { start: 0.7, end: 0 },
				// 				        alpha: 1.0,
				// 				        maxParticles: 10000,
				// 				        quantity: 2,
				// 				        emitZone: { type: 'edge', source: path, quantity: 48, yoyo: false},
				// 				        blendMode: 'ADD'
				// 					});
				germs = germ_particles.createEmitter({
											        frame: { frames: [ 'germ 0.aseprite' ], cycle: false },
											        scale: 1,
											        alpha: 1,
											        // blendMode: 'ADD',
											        // follow: player,
													speedY: { min: 1, max: 10 },
													speedX: { min: 1, max: 10 },
								        			maxParticles: 10000,
											        // emitZone: { type: 'edge', source: path, quantity: 1000, yoyo: false }
											    	});
				germPosition = {x:object.x, y:object.y};
				// germSpline = new Phaser.Curves.Spline([object.x,object.y,player.x,player.y]);
				// germSplineT = 0;
			}
		}	
	}

	// clone = spriteFromAsepriteAtlas(this.textures.get('prepper'));
	// // clone.anims.play('idle', true);
	// clone.setPosition(400,400);
	// clone.setActive(true);
	// 
	
	    // Loop over the active colliding pairs and count the surfaces the player is touching.
    this.matter.world.on('collisionstart', function (event) 
    {
        for (var i = 0; i < event.pairs.length; i++)
        {
            var bodyA = event.pairs[i].bodyA;
            var bodyB = event.pairs[i].bodyB;

            // if ((bodyA === playerBody && bodyB.label === 'disappearingPlatform') ||
            //     (bodyB === playerBody && bodyA.label === 'disappearingPlatform'))
            // {
                
            // }
        }
    }, this);

    this.matter.world.on('beforeupdate', function (event) 
    {
    });

    this.matter.world.on('collisionactive', function (event)
    {
        // var playerBody = playerController.body;
        for (var i = 0; i < event.pairs.length; i++)
        {
            var bodyA = event.pairs[i].bodyA;
            var bodyB = event.pairs[i].bodyB;
        }
    });

    // Update over, so now we can determine if any direction is blocked
    this.matter.world.on('afterupdate', function (event) 
    {
    });

    // cursors = this.input.keyboard.createCursorKeys();
    keys = 
    {
    	up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    	left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
    	down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
    	right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    	run: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    	crouch: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL)
    };

    fpsText = this.add.text(10, 10, 'FPS: --', {
        font: 'bold 26px Arial',
        fill: '#ffffff'
    });

	// germSpline.draw(this.add.graphics);
}

function update (time, delta)
{
	fpsText.setText('FPS: ' + (1000/delta).toFixed(3));

	let speed = 0;
	if(keys.run.isDown)
	{
		speed = 1;
	}
	else if(keys.crouch.isDown)
	{
		speed = 0.3;
	}
	else if(keys.up.isDown||keys.down.isDown||keys.left.isDown||keys.right.isDown)
	{
		speed = 0.5;
	}
	
	let direction = new Phaser.Math.Vector2(0,0);
	if(keys.up.isDown)
		direction.add(new Phaser.Math.Vector2(0,-1));
	if(keys.down.isDown)
		direction.add(new Phaser.Math.Vector2(0,+1));
	if(keys.left.isDown)
		direction.add(new Phaser.Math.Vector2(-1,0));
	if(keys.right.isDown)
		direction.add(new Phaser.Math.Vector2(+1,0));
	direction.normalize();

	if(direction.equals(new Phaser.Math.Vector2( 0,-1)) ||
	   direction.equals(new Phaser.Math.Vector2(-1, 0)) ||
	   direction.equals(new Phaser.Math.Vector2(-1,-1).normalize()) ||
	   direction.equals(new Phaser.Math.Vector2(-1,+1).normalize()))
	{
		// if(keys.run.isDown)
		// 	player.anims.play('run_u', true);
		// else if(keys.crouch.isDown)
		// 	player.anims.play('crawl_u', true);
		// else
		// 	player.anims.play('walk_u', true);
		player.anims.play('walk', true);
		player.setFlipX(false);
	}
	else if(direction.equals(new Phaser.Math.Vector2( 0,+1)) ||
			direction.equals(new Phaser.Math.Vector2(+1, 0)) ||
	   		direction.equals(new Phaser.Math.Vector2(+1,+1).normalize()) ||
	   		direction.equals(new Phaser.Math.Vector2(+1,-1).normalize()))
	{
		// if(keys.run.isDown)
		// 	player.anims.play('run_d', true);
		// else if(keys.crouch.isDown)
		// 	player.anims.play('crawl_d', true);
		// else
		// 	player.anims.play('walk_d', true);
		player.anims.play('walk', true);
		player.setFlipX(true);
	}
	else
	{
		if(last_direction.equals(new Phaser.Math.Vector2( 0,-1)) ||
		   last_direction.equals(new Phaser.Math.Vector2(-1,-1).normalize()) ||
		   last_direction.equals(new Phaser.Math.Vector2(+1,-1).normalize()))
		{
			player.anims.play('idle', true);
			player.setFlipX(false);
		}
		else if(last_direction.equals(new Phaser.Math.Vector2( 0,+1)) ||
				last_direction.equals(new Phaser.Math.Vector2(-1,+1).normalize()) ||
		   		last_direction.equals(new Phaser.Math.Vector2(+1,+1).normalize()))
		{
			player.anims.play('idle', true);
			player.setFlipX(false);
		}
		else if(last_direction.equals(new Phaser.Math.Vector2(-1,0)))
		{
			player.anims.play('idle', true);
			player.setFlipX(false);
		}
		else if(last_direction.equals(new Phaser.Math.Vector2(+1,0)))
		{
			player.anims.play('idle', true);
			player.setFlipX(true);
		}
	}

	// TODO: fix p/ staircase effect ao mover em diagonais
	player.setVelocity(direction.x * speed, direction.y * speed);
	// let px = 0, py = 0;
	// let velocity = {x:(direction.x * speed), y:(direction.y * speed)}
	// if(direction.x != 0 && direction.y != 0)
	// {
	// 	if (Math.abs(velocity.x) >= Math.abs(velocity.y) ) 
	// 	{
	// 	    px = Math.round(player.x);
	// 	    py = Math.round(player.y + (px - player.x) * velocity.y / velocity.x);
	// 	} 
	// 	else 
	// 	{
	// 	    py = Math.round(player.y);
	// 	    px = Math.round(player.x + (py - player.y) * velocity.x / velocity.y);
	// 	}
	// }
	// else
	// {
	// 	px = player.x + velocity.x;
	// 	py = player.y + velocity.y;
	// }
	// player.setPosition(px,py);

	let player_z = (player.y + (player.height * player.originY))/windowHeight;
	// let clone_z = clone.y + (clone.height * clone.originY);
	// player.setZ(player_z);
	player.setDepth(player_z);
	// clone.setZ(player_z);
	// clone.setDepth(player_z);

	// this.cameras.main.centerOn(player.x, player.y);

	last_direction = direction;

	// var path = new Phaser.Curves.Path(0,0).lineTo(player.x, player.y).closePath();
	// germs.setEmitZone({ type: 'edge', source: path, quantity: 0, quantity: 1000, yoyo: false });
	// germs.data.get('vector').set(dragX, dragY);
	// germs.emitZone.updateSource();
	// germSpline.addPoint(player.x,player.y);
	// germSpline.points[1].x = player.x;
	// germSpline.points[1].y = player.y;
	// germSpline.updateArcLengths();
	// let gp = germSpline.getPointAt(germSplineT);
	// germSplineT += (delta/1000)*(1.0/5);
	// if(germSplineT >= 1.0) germSplineT = 0.0;
	let germDirection = new Phaser.Math.Vector2(player.x,player.y)
	germDirection.subtract(new Phaser.Math.Vector2(germPosition.x,germPosition.y));
	germDirection.normalize();
	germPosition.x += germDirection.x * speed;
	germPosition.y += germDirection.y * speed;
	germs.setPosition(germPosition.x,germPosition.y);
}