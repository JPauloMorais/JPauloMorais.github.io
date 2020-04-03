
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
var lastDirection;
var map;
var fpsText;
var cameraBounds;
var cameraZoomValues;
var cameraPositionLines;
var cameraPosition;
var cameraZoom;

function preload ()
{
    this.load.atlas('prepper', './assets/prepper.png', './assets/prepper.json');
    this.load.image('tileset', 'assets/tileset_inside.png');
    this.load.tilemapTiledJSON('map', './assets/tilemap_inside.json');
    this.load.atlas('germ', 'assets/germ.png', 'assets/germ.json');
}

function spriteFromAsepriteAtlas(atlasTexture)
{
	var sprite = scene.matter.add.sprite(0,0,atlasTexture.key);

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

    layer.forEachTile(function (tile) 
    {
        var tileWorldPos = layer.tileToWorldXY(tile.x, tile.y);
        var collisionGroup = tileset.getTileCollisionGroup(tile.index);

        if (!collisionGroup || collisionGroup.objects.length === 0) { return; }

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
                let center = scene.matter.vertices.centre(originalPoints);
                scene.matter.add.fromVertices(objectX+center.x, objectY+center.y, originalPoints, {isStatic:true});
            }
        }
    });
}

function create ()
{
	scene = this;

	this.matter.set60Hz();

	// criando mapa
	map = this.make.tilemap({ key: 'map' });
    var tileset = map.addTilesetImage('tileset_inside', 'tileset');
    let mapX = 0;//(windowWidth/2) - (map.widthInPixels/2);
    let mapY = 0;//(windowHeight/2) - (map.heightInPixels/2);
    let ground = map.createDynamicLayer('ground', tileset, mapX, mapY).setDepth(0).setVisible(true);
    let walls = map.createDynamicLayer('walls', tileset, mapX, mapY).setDepth(2).setVisible(true);
    this.matter.world.setBounds(map.widthInPixels, map.heightInPixels);
	setupLayerColliders(tileset, map, ground);
	setupLayerColliders(tileset, map, walls);
    
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
    lastDirection = new Phaser.Math.Vector2(0,0); 

	let germParticles = this.add.particles('germ');
	germParticles.setDepth(1.5);
	germs = [];

	cameraBounds = [];
	// obtendo objetos nas camadas de objetos
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
				let germ = germParticles.createEmitter({
											        frame: { frames: ['germ 0.aseprite','germ 1.aseprite','germ 2.aseprite'], cycle: false },
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
			}
		}
	}

	// criando caminhos entre regioes (bounds)
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
	}
	else
	{
		cameraPosition = new Phaser.Math.Vector2(0,0);
		cameraZoom = 1.0;
	}

    keys = 
    {
    	up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    	left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
    	down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
    	right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    	run: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    	crouch: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL),
    	attack: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z)
    };

    fpsText = this.add.text(10, 10, 'FPS: --', {
        font: 'bold 16px Arial',
        fill: '#ffffff'
    });
	fpsText.setDepth(3);
}

function update (time, delta)
{
	
	///////////////////////////////////////
	// direcionando e movimentando o player
	// 
	
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
		player.anims.play('walk', true);
		player.setFlipX(false);
	}
	else if(direction.equals(new Phaser.Math.Vector2( 0,+1)) ||
			direction.equals(new Phaser.Math.Vector2(+1, 0)) ||
	   		direction.equals(new Phaser.Math.Vector2(+1,+1).normalize()) ||
	   		direction.equals(new Phaser.Math.Vector2(+1,-1).normalize()))
	{
		player.anims.play('walk', true);
		player.setFlipX(true);
	}
	else
	{
		if(lastDirection.equals(new Phaser.Math.Vector2( 0,-1)) ||
		   lastDirection.equals(new Phaser.Math.Vector2(-1,-1).normalize()) ||
		   lastDirection.equals(new Phaser.Math.Vector2(+1,-1).normalize()))
		{
			player.anims.play('idle', true);
			player.setFlipX(false);
		}
		else if(lastDirection.equals(new Phaser.Math.Vector2( 0,+1)) ||
				lastDirection.equals(new Phaser.Math.Vector2(-1,+1).normalize()) ||
		   		lastDirection.equals(new Phaser.Math.Vector2(+1,+1).normalize()))
		{
			player.anims.play('idle', true);
			player.setFlipX(false);
		}
		else if(lastDirection.equals(new Phaser.Math.Vector2(-1,0)))
		{
			player.anims.play('idle', true);
			player.setFlipX(false);
		}
		else if(lastDirection.equals(new Phaser.Math.Vector2(+1,0)))
		{
			player.anims.play('idle', true);
			player.setFlipX(true);
		}
	}
	// TODO: fix p/ staircase effect ao mover em diagonais
	player.setVelocity(direction.x * speed, direction.y * speed);
	// let player_z = (player.y + (player.height * player.originY))/windowHeight;
	// let clone_z = clone.y + (clone.height * clone.originY);
	// player.setZ(player_z);
	// player.setDepth(player_z);
	lastDirection = direction;

	//////////////////////////
	// movimentando os germes
	// 
	
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

	/////////////////////////
	// movimentando a camera
	// 
	
	if(cameraBounds.length > 1)
	{
		let playerP = new Phaser.Math.Vector2(player.x,player.y);
		let line = cameraPositionLines[cameraPositionLineIndex];
		let a = line.getPointA();
		let b = line.getPointB();
		let nearestPoint = Phaser.Geom.Line.GetNearestPoint(line, {x:player.x, y:player.y});
		let t = (new Phaser.Math.Vector2(nearestPoint.x,nearestPoint.y).subtract(a).length()) / b.subtract(a).length();
		t = Phaser.Math.Clamp(t, 0.0, 1.0);

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
			else if(angleToB >= (Math.PI/4))
			{ // evitar wrapping
				t = 0.0;
			}

			t *= 0.95;
		}
		else if(playerBBoundsIntersection.width != 0 || playerBBoundsIntersection.height != 0)
		{ // dentro do bounds do fim da transicao
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
			{ // pode estar tendendo ao posterior
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
			else if(angleToA >= (Math.PI/4))
			{ // evitar wrapping ?
				t = 1.0;
			}

			t *= 0.95;
		}

		nearestPoint = Phaser.Geom.Line.GetPoint(line, t);
		cameraPosition.set(nearestPoint.x,nearestPoint.y);
		cameraZoom = zoomA + ((zoomB - zoomA) * t);
	}
	this.cameras.main.centerOn(cameraPosition.x, cameraPosition.y);
	this.cameras.main.setZoom(cameraZoom);
	// this.cameras.main.pan(cameraPosition.x, cameraPosition.y, delta, 'Linear');
	// this.cameras.main.zoomTo(cameraZoom, delta);

	
	fpsText.setText('FPS: ' + (1000/delta).toFixed(3));
	// fpsText.setPosition(cameraPosition.x - 26, cameraPosition.y - 19);
}