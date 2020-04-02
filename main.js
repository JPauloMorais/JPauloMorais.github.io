
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
    // zoom: 5,
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
var cameraBounds;
var cameraZoomValues;
var cameraPositionsPath;
var cameraPositionsPathT;
var currentPointT;
var nextPointT;
var lastPointT;
var cameraPositionPointsCount;
var cameraPositionLines;
var cameraPosition;
var cameraZoom;

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

	let germParticles = this.add.particles('germ');
	germParticles.setDepth(1.5);
	germs = [];

	cameraBounds = [];
	for(objectLayerIndex in map.objects)
	{
		for(objectIndex in map.objects[objectLayerIndex].objects)
		{
			object = map.objects[objectLayerIndex].objects[objectIndex];
			if(object.name == 'player_spawn')
			{
				player.setPosition(mapX+object.x, mapY+object.y);
			}
			else if (object.name == 'germ_spawn')
			{
				// var path = new Phaser.Curves.Path(object.x, object.y).lineTo(player.x, player.y).closePath();
				// germs = germParticles.createEmitter({
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
				let germ = germParticles.createEmitter({
											        frame: { frames: [ 'germ 0.aseprite' ], cycle: false },
											        scale: 1,
											        alpha: 1,
											        // blendMode: 'ADD',
											        // follow: player,
													speed: { min: -5, max: +5 },
								        			maxParticles: 1000,
								        			lifespan: 2000,
								        			bounds: {x:0,y:0, width:map.widthInPixels,height:map.heightInPixels},
											        // emitZone: { type: 'edge', source: path, quantity: 1000, yoyo: false }
											    	});
				let germPosition = {x:object.x, y:object.y};
				germs.push({germ:germ, position:germPosition});
				// germParticles.setInteractive(player);
				// germSpline = new Phaser.Curves.Spline([object.x,object.y,player.x,player.y]);
				// germSplineT = 0;
			}
			else if(object.name == 'camBounds')
			{
				let index = 0;
				for(property of object.properties)
				{
					if(property.name=='index')
					{
						index = property.value;
						break;
					}
				}
				cameraBounds.push({x:object.x, y:object.y, width:object.width, height:object.height, index:index,
								   center:{x:object.x+(object.width/2), y:object.y+(object.height/2)}});
				// this.cameras.main.pan(object.x+(object.width/2), object.y+(object.height/2), 1000, 'Sine.easeInOut');
				// this.cameras.main.zoomTo(windowHeight/object.height, 1000);
			}
		}
	}

    this.cameras.main.setBounds(0, 0, windowWidth, windowHeight);
	if(cameraBounds.length > 0)
	{
		cameraBounds.sort(function(a, b){return a.index - b.index});
		cameraZoomValues = [];
		cameraZoomValues.push(windowHeight/cameraBounds[0].height);
		cameraPositionLines = [];
		var lastPoint = {x:cameraBounds[0].center.x, y:cameraBounds[0].center.y};
		var pp = new Phaser.Math.Vector2(player.x,player.y);
		var p = new Phaser.Math.Vector2(lastPoint.x,lastPoint.y);
		var smallestDistance = p.subtract(pp).length();
		cameraPositionLineIndex = 0;
		cameraPosition = new Phaser.Math.Vector2(p.x,p.y);
		cameraZoom = cameraZoomValues[0];
		for(var i = 1; i < cameraBounds.length; i++)
		{
			let bounds = cameraBounds[i];
			cameraZoomValues.push(windowHeight/bounds.height);
			var curPoint = {x:bounds.center.x, y:bounds.center.y};
			cameraPositionLines.push(new Phaser.Geom.Line(lastPoint.x,lastPoint.y, curPoint.x,curPoint.y));
			p.set(curPoint.x,curPoint.y);
			let d = p.subtract(pp).length();
			if(d < smallestDistance)
			{
				smallestDistance = d;
				cameraPositionLineIndex = cameraPositionLines.length-1;
				cameraPosition.set(curPoint.x,curPoint.y);
				cameraZoom = cameraZoomValues[cameraZoomValues.length-1];
			}
			lastPoint = curPoint;
		}
		
		// crando path entre centros dos cameraBounds
		// let points = [];
		// cameraZoomValues = [];
		// cameraPositionsPath = new Phaser.Curves.Path(cameraBounds[0].x+(cameraBounds[0].width/2), cameraBounds[0].y+(cameraBounds[0].height/2));
		// for(var i = 1; i < cameraBounds.length; i++)
		// {
		// 	let bounds = cameraBounds[i];
		// 	cameraPositionsPath.lineTo(bounds.x+(bounds.width/2), bounds.y+(bounds.height/2));
		// 	cameraZoomValues.push(windowHeight/bounds.height);
		// }
		// cameraPositionPointsCount = cameraBounds.length;
		// // escolhendo cameraBounds inicial
		// let playerRect = new Phaser.Geom.Rectangle(player.x-1,player.y-1,2,2);
		// for(boundsIndex in cameraBounds)
		// {
		// 	let bounds = cameraBounds[boundsIndex];
		// 	let boundsRect = new Phaser.Geom.Rectangle(bounds.x,bounds.y,bounds.width,bounds.height);
		// 	let playerBoundsIntersection = Phaser.Geom.Rectangle.Intersection(boundsRect, playerRect);
		// 	if(playerBoundsIntersection.width != 0 || playerBoundsIntersection.height != 0)
		// 	{
		// 		cameraPositionsPathT = boundsIndex * (1.0/(cameraPositionPointsCount-1));
		// 	}
		// }
		// currentPointT = Math.floor(cameraPositionsPathT * cameraPositionPointsCount) * (1.0/cameraPositionPointsCount);
		// nextPointT = currentPointT+(1.0/cameraPositionPointsCount);
		// lastPointT = currentPointT-(1.0/cameraPositionPointsCount);
	}
	else
	{
		cameraPosition = new Phaser.Math.Vector2(p.x,p.y);
		cameraZoom = 1.0;
	}
	

	// this.cameras.main.startFollow(player, false, 0.5, 0.5);
	// this.cameras.main.zoomTo(5, 100);

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
        font: 'bold 16px Arial',
        fill: '#ffffff'
    });
	fpsText.setDepth(3);

	// germSpline.draw(this.add.graphics);
}

function update (time, delta)
{
	// scene.add.graphics().fillStyle('0xaaaaaa',1.0);
	// scene.add.graphics().fillRect(0, 0, windowWidth, windowHeight);

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
	for(germ of germs)
	{
		let germDirection = new Phaser.Math.Vector2(player.x,player.y)
		germDirection.subtract(new Phaser.Math.Vector2(germ.position.x,germ.position.y));
		germDirection.normalize();
		speed = 0.3;
		germ.position.x += germDirection.x * speed;
		germ.position.y += germDirection.y * speed;
		germ.germ.setPosition(germ.position.x,germ.position.y);
	}
	// if(germDirection.x >= germDirection.y)
	// {
	// 	germDirection.y = 0.0;
	// }
	// else
	// {
	// 	germDirection.x = 0.0;
	// }

	// let camT = 0;
	// let fromPlayer = new Phaser.Math.Vector2(player.x,player.y);
	// let firstCamBounds = new Phaser.Geom.Rectangle(cameraBounds[0].x,cameraBounds[0].y,cameraBounds[0].width,cameraBounds[0].height);
	// let playerBounds = new Phaser.Geom.Rectangle(player.x-1,player.y-1,2,2);
	// let intersectionWithCamBounds = Phaser.Geom.Rectangle.Intersection(firstCamBounds, playerBounds);
	// if(intersectionWithCamBounds.width == 0 && intersectionWithCamBounds.height == 0)
	// {
	// 	camT = cameraPositionsSpline.getTFromDistance(fromPlayer.distance(cameraPositionsSpline.getStartPoint()));
	// }
	// else
	// 	camT = cameraPositionsSpline.getTFromDistance(Math.sqrt(fromPlayer.distance(cameraPositionsSpline.getStartPoint())));

	// camT = 0;	
	// let camP = cameraPositionsSpline.getPoint(camT);
	// this.cameras.main.pan(camP.x, camP.y, 100, 'Sine.easeInOut');
	// let camZ = Phaser.Math.Interpolation.Linear(cameraZoomValues, camT);
	// this.cameras.main.zoomTo(camZ, 100);
	// this.cameras.main.zoomTo(5, 100);

	// scene.add.graphics().lineStyle(4, 0xffffff);
	// cameraPositionsPath.draw(scene.add.graphics());

	// algoritmo
	// ponto = primeiro ponto
	// obtem t da distancia do player p/ ponto
	// calcula vetor de dir* do ponto atual pro proximo(a), ponto atual pro anterior(b)(se t >= 1/qtdDePontos), ponto atual pro player(c)
	// mede angulo entre (c)e(a) e (c)e(b), o que for menor é a direcao para onde o player tende
	// divide distancia do player p/ ponto atual pela distancia do ponto p/ ponto ao qual tende, obtem (+ ou -)tDelta
	// t += tDelta
	// cameraPositionsPathT = 0.5;
	// let playerP = new Phaser.Math.Vector2(player.x,player.y);
	// let currentPoint = cameraPositionsPath.getPoint(currentPointT);
	// let currentToPlayer = currentPoint.subtract(playerP);
	// let currentToPlayerDistance = currentToPlayer.length();
	// currentToPlayer.normalize();
	// let nextPoint = null;
	// let currentToNext = null;
	// let currentToNextDistance = Infinity;
	// let angleToNext = Infinity;
	// if(nextPointT <= 1.0)
	// {
	// 	nextPoint = cameraPositionsPath.getPoint(nextPointT);
	// 	currentToNext = nextPoint.subtract(currentPoint);
	// 	currentToNextDistance = currentToNext.length();
	// 	currentToNext.normalize();
	// 	angleToNext = Math.acos(currentToPlayer.dot(currentToNext));
	// }
	// let lastPoint = null;
	// let currentToLast = null;
	// let currentToLastDistance = Infinity;
	// let angleToLast = Infinity;
	// if(lastPointT >= 0.0)
	// {
	// 	lastPoint = cameraPositionsPath.getPoint(lastPointT);
	// 	currentToLast = lastPoint.subtract(currentPoint);
	// 	currentToLastDistance = currentToLast.length();
	// 	currentToLast.normalize();
	// 	angleToLast = Math.acos(currentToPlayer.dot(currentToLast));
	// }

	if(cameraBounds.length > 1)
	{
		let playerP = new Phaser.Math.Vector2(player.x,player.y);
		let line = cameraPositionLines[cameraPositionLineIndex];
		let a = line.getPointA();
		let b = line.getPointB();
		let nearestPoint = Phaser.Geom.Line.GetNearestPoint(line, {x:player.x, y:player.y});
		let t = (new Phaser.Math.Vector2(nearestPoint.x,nearestPoint.y).subtract(a).length()) / b.subtract(a).length();
		t = Phaser.Math.Clamp(t, 0.0, 1.0);

		// scene.add.graphics().fillStyle('0xff0000',1.0);
		// scene.add.graphics().fillPoint(nearestPoint.x, nearestPoint.y, 20);
		// scene.add.graphics().strokeLineShape(line);
		let zoomA = cameraZoomValues[cameraPositionLineIndex];
		let zoomB = cameraZoomValues[cameraPositionLineIndex+1];

		let aBounds = cameraBounds[cameraPositionLineIndex];
		let aBoundsRect = new Phaser.Geom.Rectangle(aBounds.x,aBounds.y,aBounds.width,aBounds.height);
		let bBounds = cameraBounds[cameraPositionLineIndex+1];
		let bBoundsRect = new Phaser.Geom.Rectangle(bBounds.x,bBounds.y,bBounds.width,bBounds.height);
		let playerRect = new Phaser.Geom.Rectangle(player.x-1,player.y-1,2,2);
		let playerABoundsIntersection = Phaser.Geom.Rectangle.Intersection(aBoundsRect, playerRect);
		let playerBBoundsIntersection = Phaser.Geom.Rectangle.Intersection(bBoundsRect, playerRect);
		if(playerABoundsIntersection.width != 0 || playerABoundsIntersection.height != 0)
		{ // dentro do bounds no inicio da transicao
			// if(t <= 0.5) // idk about this
			// { 
			let aCenter = new Phaser.Math.Vector2(aBounds.center.x, aBounds.center.y);
			let bCenter = new Phaser.Math.Vector2(bBounds.center.x, bBounds.center.y);
			
			let aToPlayer = playerP.subtract(aCenter);
			let aToPlayerDist = aToPlayer.length();
			aToPlayer.normalize();

			let aToB = bCenter.subtract(aCenter);
			let aToBDistance = aToB.length();
			aToB.normalize();
			let angleToB = Math.acos(aToPlayer.dot(aToB));
			
			if(cameraPositionLineIndex > 0)
			{ // pode estar tendendo ao anterior
				let cBounds = cameraBounds[cameraPositionLineIndex-1];
				let cCenter = new Phaser.Math.Vector2(cBounds.center.x, cBounds.center.y);

				let aToC = cCenter.subtract(aCenter);
				let aToCDistance = aToC.length();
				aToC.normalize();
				let angleToC = Math.acos(aToPlayer.dot(aToC));

				if(angleToC < angleToB)
				{
					--cameraPositionLineIndex;
				}
			}
			else if(angleToB > (Math.PI/4))
			{ // evitar wrapping
				t = 0.0;
			}
			// }
		}
		else if(playerBBoundsIntersection.width != 0 || playerBBoundsIntersection.height != 0)
		{ // dentro do bounds do fim da transicao
			// if(t > 0.5)  // idk about this
			// { // pode estar tendendo ao posterior
			let aCenter = new Phaser.Math.Vector2(aBounds.center.x, aBounds.center.y);
			let bCenter = new Phaser.Math.Vector2(bBounds.center.x, bBounds.center.y);
			
			let bToPlayer = playerP.subtract(bCenter);
			let bToPlayerDist = bToPlayer.length();
			bToPlayer.normalize();

			let bToA = aCenter.subtract(bCenter);
			let bToADistance = bToA.length();
			bToA.normalize();
			let angleToA = Math.acos(bToPlayer.dot(bToA));

			if(cameraPositionLineIndex < (cameraPositionLines.length-1))
			{
				let cBounds = cameraBounds[cameraPositionLineIndex+2];
				let cCenter = new Phaser.Math.Vector2(cBounds.center.x, cBounds.center.y);

				let bToC = cCenter.subtract(bCenter);
				let bToCDistance = bToC.length();
				bToC.normalize();
				let angleToC = Math.acos(bToPlayer.dot(bToC));

				if(angleToC < angleToA)
				{
					++cameraPositionLineIndex;
				}
			}
			else if(angleToA > (Math.PI/4))
			{ // evitar wrapping ?
				t = 1.0;
			}
			// }
		}

		nearestPoint = Phaser.Geom.Line.GetPoint(line, t);
		cameraPosition.set(nearestPoint.x,nearestPoint.y);
		cameraZoom = zoomA + ((zoomB - zoomA) * t);
	}
	this.cameras.main.pan(cameraPosition.x, cameraPosition.y, delta, 'Linear');
	this.cameras.main.zoomTo(cameraZoom, delta);

	// let tDelta = 0;
	// if((angleToNext < angleToLast) && (angleToNext > Math.PI/4))
	// {
	// 	tDelta = (currentToPlayerDistance/currentToNextDistance) * (1/cameraPositionPointsCount);
	// 	// cameraPositionsPathT = nextPoint + tDelta;
	// }
	// else if((angleToLast < angleToNext) && (angleToLast > Math.PI/4))
	// {
	// 	tDelta = -(1.0/(currentToPlayerDistance/currentToLastDistance)) * (1/cameraPositionPointsCount);
	// 	// cameraPositionsPathT = lastPointT + tDelta;
	// }
	// cameraPositionsPathT = currentPointT + tDelta;
	// Phaser.Math.Clamp(cameraPositionsPathT, 0.0, 1.0);
	// // Phaser.Math.Clamp(cameraPositionsPathT, lastPointT, nextPointT);

	// // let bounds = cameraBounds[parseInt(Math.floor(cameraPositionsPathT*(cameraPositionPointsCount-1)))];
	// // let boundsRect = new Phaser.Geom.Rectangle(bounds.x,bounds.y,bounds.width,bounds.height);
	// // let playerRect = new Phaser.Geom.Rectangle(player.x-1,player.y-1,2,2);
	// // let playerBoundsIntersection = Phaser.Geom.Rectangle.Intersection(boundsRect, playerRect);
	// // if(playerBoundsIntersection.width == 0 && playerBoundsIntersection.height == 0)
	// // {
	// 	let camP = cameraPositionsPath.getPoint(cameraPositionsPathT);
	// 	// this.cameras.main.pan(camP.x, camP.y, delta, 'Sine.easeInOut');
	// 	let camZ = Phaser.Math.Interpolation.Linear(cameraZoomValues, cameraPositionsPathT);
	// 	// this.cameras.main.zoomTo(camZ, delta);
	// // // }

	// let currentToPlayerTDistance = Math.abs(currentPointT - cameraPositionsPathT);
	// let nextToPlayerTDistance = Math.abs(nextPointT - cameraPositionsPathT);
	// let lastToPlayerTDistance = Math.abs(lastPointT - cameraPositionsPathT);
	// let smallerTDistance = Math.min(currentToPlayerTDistance, nextToPlayerTDistance, lastToPlayerTDistance);
	// if(smallerTDistance == nextToPlayerTDistance)
	// {
	// 	lastPointT = currentPointT;
	// 	currentPointT = nextPointT;
	// 	nextPointT = currentPointT+(1.0/cameraPositionPointsCount);
	// }
	// else if(smallerTDistance == lastToPlayerTDistance)
	// {
	// 	nextPointT = currentPointT;
	// 	currentPointT = lastPointT;
	// 	lastPointT = currentPointT-(1.0/cameraPositionPointsCount);
	// }
	// currentPointT = Math.floor(cameraPositionsPathT * (cameraPositionPointsCount)) * (1.0/cameraPositionPointsCount);
	// nextPointT = currentPointT+(1.0/cameraPositionPointsCount);
	// lastPointT = currentPointT-(1.0/cameraPositionPointsCount);
	

	// cameraPositionsPathT = Math.floor(cameraPositionsPathT * cameraPositionPointsCount) * (1.0/cameraPositionPointsCount);

	fpsText.setText('FPS: ' + (1000/delta).toFixed(3));
	// fpsText.setPosition(camP.x - 26, camP.y - 19);
	// scene.add.graphics().lineStyle(5, 0xFF0000, 1.0);
// 	scene.add.graphics().beginPath();
// 	scene.add.graphics().moveTo(player.x, player.y);
// 	scene.add.graphics().lineTo(pointToPlayer.x, pointToPlayer.y);
// 	scene.add.graphics().strokePath();
}