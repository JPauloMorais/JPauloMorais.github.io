
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
var germPosition;
var germPathTiles;
var keys;
var lastDirection;
var map;
var layerGroupBodyObjects;
var layerGroupBodies;
var layerGroups;
var currentLayerGroupName;
var toLayerGroupRects;
var fpsText;
var cameraBounds;
var cameraZoomValues;
var cameraPositionLines;
var cameraBoundsGroupSection;
var cameraPosition;
var cameraZoom;
var cameraLineTransition = 
{
	active: false,
	positionA: 0.0,
	zoomA: 0.0,
	positionB: 0.0,
	zoomB: 0.0,
	totalTime: 0.0,
	deltaTime: 0.0
};
var graphics;

var groundDepth = 0;
var debugDepth = -0.5;
var playerDepth = 1;
var wallsDepth = 2;

function preload ()
{
    this.load.atlas('prepper', './assets/prepper.png', './assets/prepper.json');
    this.load.image('tileset_inside', 'assets/tileset_inside.png');
    this.load.image('tileset_outside', 'assets/tileset_outside.png');
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

// function setupLayerColliders(tileset, map, layer)
// {
//     map.setCollisionByExclusion([-1,0],true,true,layer);

//     layer.forEachTile(function (tile) 
//     {
//         var tileWorldPos = layer.tileToWorldXY(tile.x, tile.y);
//         var collisionGroup = tileset.getTileCollisionGroup(tile.index);

//         if (!collisionGroup || collisionGroup.objects.length == 0) { return; }

// 		var objects = collisionGroup.objects;

//         for (var i = 0; i < objects.length; i++)
//         {
//             var object = objects[i];
//             var objectX = tileWorldPos.x + object.x;
//             var objectY = tileWorldPos.y + object.y;

//             // When objects are parsed by Phaser, they will be guaranteed to have one of the
//             // following properties if they are a rectangle/ellipse/polygon/polyline.
//             if (object.rectangle)
//             {
//                 scene.matter.add.rectangle(objectX, objectY, object.width, object.height, {isStatic:true});
//             }
//             else if (object.ellipse)
//             {
//                 // Ellipses in Tiled have a top-left origin, while ellipses in Phaser have a center
//                 // origin
//                 // graphics.strokeEllipse(
//                 //     objectX + object.width / 2, objectY + object.height / 2,
//                 //     object.width, object.height
//                 // );
//             }
//             else if (object.polygon || object.polyline)
//             {
//                 var originalPoints = object.polygon ? object.polygon : object.polyline;
//                 let center = scene.matter.vertices.centre(originalPoints);
//                 scene.matter.add.fromVertices(objectX+center.x, objectY+center.y, originalPoints, {isStatic:true});
//             }
//         }
//     });
// }

function addLayerCollisionParts (map, tilesets, layer, layerGroupCollisionParts)
{
	map.setCollisionByExclusion([-1,0],true,true,layer);

    layer.forEachTile(function (tile) 
    {
		let tileWorldPos = layer.tileToWorldXY(tile.x, tile.y);
		var collisionGroup = null;
		for(tileset of tilesets)
		{
			if(tileset.containsTileIndex(tile.index))
			{
				collisionGroup = tileset.getTileCollisionGroup(tile.index);
				break;
			}
		}
		if (!collisionGroup || collisionGroup.objects.length == 0) { return; }

		var objects = collisionGroup.objects;
		var bodies = Phaser.Physics.Matter.Matter.Bodies;

        for (var i = 0; i < objects.length; i++)
        {
            var object = objects[i];
            var objectX = tileWorldPos.x + object.x;
            var objectY = tileWorldPos.y + object.y;

            // When objects are parsed by Phaser, they will be guaranteed to have one of the
            // following properties if they are a rectangle/ellipse/polygon/polyline.
            if (object.rectangle)
            {
                layerGroupCollisionParts.push(bodies.rectangle(objectX, objectY, object.width, object.height, {isStatic:true}));
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
                layerGroupCollisionParts.push(bodies.fromVertices(objectX+center.x, objectY+center.y, originalPoints, {isStatic:true}));
            }
        }
    });
}

function setupLayerGroup(map, tilesets, groupName)
{
	var layerGroup = {ground:null,walls:null};
    var layerGroupCollisionParts = [];
    let layerName = groupName+'/ground';
    let layer = map.createDynamicLayer(layerName, tilesets, 0,0);
    if(layer)
    {
    	layer.setVisible(false);
    	layer.setDepth(groundDepth);
    	addLayerCollisionParts(map, tilesets, layer, layerGroupCollisionParts);
    	layerGroup.ground = layer;
    }
    layerName = groupName+'/walls';
    layer = map.createDynamicLayer(layerName, tilesets, 0,0);
    if(layer)
    {
    	layer.setVisible(false);
    	layer.setDepth(wallsDepth);
    	addLayerCollisionParts(map, tilesets, layer, layerGroupCollisionParts);
    	layerGroup.walls = layer;
    }
    var groupBodyObject = new Phaser.GameObjects.GameObject(scene, 'groupBodyObject');
    layerGroupBodyObjects.set(groupName, scene.matter.add.gameObject(groupBodyObject));
    var groupBody = Phaser.Physics.Matter.Matter.Body.create({parts:layerGroupCollisionParts});
    layerGroupBodies.set(groupName, groupBody);
    layerGroups.set(groupName, layerGroup);
    toLayerGroupRects.set(groupName, new Array());
    cameraBoundsGroupSection.set(groupName, {from:Infinity, to:-Infinity});
}

function switchLayerGroup(map, currentName, targetName)
{
	let group = layerGroups.get(currentName);
	if(group)
	{
		if(group.ground)
		{
			group.ground.setVisible(false);
		}
		if(group.walls)
		{
			group.walls.setVisible(false);
		}

		let groupBodyObject = layerGroupBodyObjects.get(currentName);
		let groupBody = layerGroupBodies.get('empty');
    	groupBodyObject.setExistingBody(groupBody);
		
    	// scene.matter.composite.remove(layerGroupBodies.get(currentName));
	}

	group = layerGroups.get(targetName);
	if(group)
	{
		if(group.ground)
		{
			group.ground.setVisible(true);
		}
		if(group.walls)
		{
			group.walls.setVisible(true);
		}

		let groupBodyObject = layerGroupBodyObjects.get(targetName);
		let groupBody = layerGroupBodies.get(targetName);
		groupBodyObject.setExistingBody(groupBody);
		// scene.matter.composite.add(layerGroupBodies.get(targetName));
		currentLayerGroupName = targetName;
	}
}

function create ()
{
	scene = this;
	graphics = this.add.graphics({ lineStyle: { width: 4, color: 0x5555ff, depth:5.0} });

	this.matter.set60Hz();

	// sceneGroup = this.make.group({});

	cameraBoundsGroupSection = new Map();

	// criando mapa
	map = this.make.tilemap({ key: 'map' });
 //    let tilesetInside = map.addTilesetImage('tileset_inside', 'tileset_inside');
 //    let tilesetOutside = map.addTilesetImage('tileset_outside', 'tileset_outside');
 //    let mapX = 0;//(windowWidth/2) - (map.widthInPixels/2);
 //    let mapY = 0;//(windowHeight/2) - (map.heightInPixels/2);
 //    let ground = map.createDynamicLayer('inside/ground', tilesetInside, mapX, mapY).setDepth(groundDepth).setVisible(true);
 //    let walls = map.createDynamicLayer('inside/walls', tilesetInside, mapX, mapY).setDepth(wallsDepth).setVisible(true);
 //    this.matter.world.setBounds(map.widthInPixels, map.heightInPixels);
	// setupLayerColliders(tilesetInside, map, ground);
	// setupLayerColliders(tilesetInside, map, walls);
    
    let tilesetNames = ['tileset_inside','tileset_outside'];
    let tilesets = [];
    for(tilesetName of tilesetNames)
    	tilesets.push(map.addTilesetImage(tilesetName, tilesetName));

	toLayerGroupRects = new Map();
	layerGroups = new Map();
	layerGroupBodyObjects = new Map();
	layerGroupBodies = new Map();
	layerGroupBodies.set('empty', Phaser.Physics.Matter.Matter.Body.create({parts:[Phaser.Physics.Matter.Matter.Bodies.rectangle(0,0,map.widthInPixels,map.heightInPixels)]}));
	setupLayerGroup(map, tilesets, 'inside');
	setupLayerGroup(map, tilesets, 'outside');

	switchLayerGroup(map, null, 'inside');

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
    player.setDepth(playerDepth);
    lastDirection = new Phaser.Math.Vector2(0,0); 

	// let playerTile = map.getTileAtWorldXY(player.x, player.y-32, false, this.cameras.main, 'ground');

	let germParticles = this.add.particles('germ');
	germParticles.setDepth(1.5);
	germs = [];
	// germPathTiles = [];
	// let potentialTiles = map.getTilesWithinWorldXY(mapX, mapY, map.widthInPixels, map.heightInPixels, {isNotEmpty:true}, this.cameras.main, 'ground');
	// for(tile of potentialTiles)
	// {
	// 	for(propertyIndex in tile.properties)
	// 	{
	// 		if(tile.properties.germPath==true)
	// 		{
	// 			germPathTiles.push(tile);
	// 		}
	// 	}
	// }

	let mapX = 0.0;
	let mapY = 0.0;
	// obtendo objetos nas camadas de objetos
	cameraBounds = [];
	for(objectLayerIndex in map.objects)
	{
		let layerGroupName = map.objects[objectLayerIndex].name.split('/')[0];
		
		for(objectIndex in map.objects[objectLayerIndex].objects)
		{
			object = map.objects[objectLayerIndex].objects[objectIndex];
			if(object.name == 'playerSpawn')
			{
				player.setPosition(mapX+object.x, mapY+object.y);
			}
			else if (object.name == 'germSpawn')
			{
				let rect = new Phaser.Geom.Rectangle(object.x, object.y, 16, 16);
				let germ = germParticles.createEmitter({
												        frame: { frames: ['germ 0.aseprite','germ 1.aseprite','germ 2.aseprite'], cycle: false },
												        scale: 1,
												        alpha: 1,
												        // blendMode: 'ADD',
												        // follow: player,
														speedX: { min: -1.5, max: +1.5 },
														speedY: { min: -0.5, max: +2.5 },
									        			maxParticles: 10000,
									        			// frequency: 0.1,
									        			lifespan: 2000,
									        			bounds: {x:0,y:0, width:map.widthInPixels,height:map.heightInPixels},
												        // emitZone: { type: 'edge', source: rect, quantity: 1000, yoyo: false }
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
				let bounds = {x:object.x, y:object.y, width:object.width, height:object.height, index:index,
								   center:{x:object.x+(object.width/2), y:object.y+(object.height/2)}};
				cameraBounds.push(bounds);
				if(cameraBoundsGroupSection.get(layerGroupName).from > parseInt(index))
					cameraBoundsGroupSection.get(layerGroupName).from = parseInt(index)
				if(cameraBoundsGroupSection.get(layerGroupName).to < parseInt(index))
					cameraBoundsGroupSection.get(layerGroupName).to = parseInt(index)
			}
			else if(object.name == 'toLayerGroup')
			{
				let toLayerGroupRect = {toLayer:null, toX:0, toY:0, toCamBounds:0, rect:new Phaser.Geom.Rectangle(object.x,object.y,object.width,object.height)};
				for(property of object.properties)
				{
					if(property.name=='layer') toLayerGroupRect.toLayer = property.value;
					else if(property.name=='pX') toLayerGroupRect.toX = property.value;
					else if(property.name=='pY') toLayerGroupRect.toY = property.value;
					else if(property.name=='toCamBounds') toLayerGroupRect.toCamBounds = property.value;
				}
				toLayerGroupRects.get(layerGroupName).push(toLayerGroupRect);
			}
		}
	}
		// cameraBoundsGroupSection.get(layerGroupName).from = cameraBounds.length;
		// cameraBoundsGroupSection.get(layerGroupName).to = cameraBounds.length-1;
		// 
	// criando caminhos entre regioes (bounds)
    this.cameras.main.setBounds(0, 0, windowWidth, windowHeight);
	if(cameraBounds.length > 0)
	{
		cameraBounds.sort(function(a, b){return a.index - b.index});
	
		cameraZoomValues = [];
		cameraZoomValues.push(windowHeight/cameraBounds[0].height);
		cameraPositionLines = [];
		let from = cameraBoundsGroupSection.get(currentLayerGroupName).from;
		let to = cameraBoundsGroupSection.get(currentLayerGroupName).to;
		var lastPoint = {x:cameraBounds[0].center.x, y:cameraBounds[0].center.y};
		var pp = new Phaser.Math.Vector2(player.x,player.y);
		var p = new Phaser.Math.Vector2(cameraBounds[from].center.x,cameraBounds[from].center.y);
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
			if(i>=from && i<=to)
			{
				p.set(curPoint.x,curPoint.y);
				let d = p.subtract(pp).length();
				if(d < smallestDistance)
				{
					smallestDistance = d;
					cameraPositionLineIndex = cameraPositionLines.length-1;
					cameraPosition.set(curPoint.x,curPoint.y);
					cameraZoom = cameraZoomValues[cameraZoomValues.length-1];
				}
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
	graphics.clear();

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
	let playerZ = groundDepth + ((player.y + (player.height * player.originY))/windowHeight)*(wallsDepth-groundDepth);
	player.setDepth(playerZ);
	// let clone_z = clone.y + (clone.height * clone.originY);
	// player.setZ(player_z);
	lastDirection = direction;

	//////////////////////////
	// movimentando os germes
	// 
	
	for(germ of germs)
	{
		let germDirection = new Phaser.Math.Vector2(player.x,player.y);
		germDirection.subtract(new Phaser.Math.Vector2(germ.position.x,germ.position.y));
		germDirection.normalize();
		speed = 0.3;
		germ.position.x += germDirection.x * speed;
		germ.position.y += germDirection.y * speed;
		germ.germ.setPosition(germ.position.x,germ.position.y);
		// germ.germ.setDepth(groundDepth + ((germ.position.y/windowHeight)*(wallsDepth-groundDepth)));
	}

	/////////////////////////
	// movimentando a camera
	// 
	let playerRect = new Phaser.Geom.Rectangle(player.x-1,player.y-1,2,2);
	for(toLayerGroupRect of toLayerGroupRects.get(currentLayerGroupName))
	{
		let playerRectIntersection = Phaser.Geom.Rectangle.Intersection(toLayerGroupRect.rect, playerRect);
		if(playerRectIntersection.width != 0 || playerRectIntersection.height != 0)
		{
			switchLayerGroup(map, currentLayerGroupName, toLayerGroupRect.toLayer);
			player.setPosition(toLayerGroupRect.toX,toLayerGroupRect.toY);
			cameraPositionLineIndex = Math.max(cameraBoundsGroupSection.get(currentLayerGroupName).from+toLayerGroupRect.toCamBounds-1, 0);
		}
	}
	
	if(cameraBounds.length > 1)
	{
		var line = cameraPositionLines[cameraPositionLineIndex];
		
		if(!cameraLineTransition.active)
		{
			let playerP = new Phaser.Math.Vector2(player.x,player.y);
			var a = line.getPointA();
			var b = line.getPointB();
			let nearestPoint = Phaser.Geom.Line.GetNearestPoint(line, {x:player.x, y:player.y});
			var t = (new Phaser.Math.Vector2(nearestPoint.x,nearestPoint.y).subtract(a).length()) / b.subtract(a).length();
			t = Phaser.Math.Clamp(t, 0.0, 1.0);

			var zoomA = cameraZoomValues[cameraPositionLineIndex];
			var zoomB = cameraZoomValues[cameraPositionLineIndex+1];

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
				
				if(cameraPositionLineIndex > Math.max(cameraBoundsGroupSection.get(currentLayerGroupName).from-1,0))
				{ // pode estar tendendo ao anterior
					let cBounds = cameraBounds[cameraPositionLineIndex-1];
					let cCenter = new Phaser.Math.Vector2(cBounds.center.x, cBounds.center.y);

					let aToC = cCenter.subtract(aCenter);
					let aToCDistance = aToC.length();
					aToC.normalize();
					let angleToC = Math.acos(aToPlayer.dot(aToC));

					if(angleToC < angleToB)
					{ // transicao pro anterior
						--cameraPositionLineIndex;

						cameraLineTransition.active = true;
						
						cameraLineTransition.positionA = nearestPoint;
						// cameraLineTransition.positionA.x = Phaser.Math.Clamp(cameraLineTransition.positionA.x, a.x, b.x);
						// cameraLineTransition.positionA.y = Phaser.Math.Clamp(cameraLineTransition.positionA.y, a.y, b.y);
						cameraLineTransition.zoomA = zoomA + ((zoomB - zoomA) * t);
						
						let nextLine = cameraPositionLines[cameraPositionLineIndex];
						a = nextLine.getPointA();
						b = nextLine.getPointB();
						let nextPoint = Phaser.Geom.Line.GetNearestPoint(nextLine, {x:player.x, y:player.y});
						let nextT = (new Phaser.Math.Vector2(nextPoint.x,nextPoint.y).subtract(a).length()) / b.subtract(a).length();
						cameraLineTransition.positionB = nextPoint;
						// cameraLineTransition.positionB.x = Phaser.Math.Clamp(cameraLineTransition.positionB.x, a.x, b.x);
						// cameraLineTransition.positionB.y = Phaser.Math.Clamp(cameraLineTransition.positionB.y, a.y, b.y);

						let nextZoomA = cameraZoomValues[cameraPositionLineIndex];
						let nextZoomB = cameraZoomValues[cameraPositionLineIndex+1];
						cameraLineTransition.zoomB = nextZoomA + ((nextZoomB - nextZoomA) * nextT);
						cameraLineTransition.totalTime = Phaser.Math.Distance.BetweenPoints(cameraLineTransition.positionA, cameraLineTransition.positionB)/speed;
						cameraLineTransition.deltaTime = 0;

						this.cameras.main.pan(cameraLineTransition.positionB.x, cameraLineTransition.positionB.y, cameraLineTransition.totalTime, 'Linear');
						this.cameras.main.zoomTo(cameraLineTransition.zoomB, cameraLineTransition.totalTime);

						line = nextLine;
						t = nextT;
						zoomA = nextZoomA;
						zoomB = nextZoomB;
					}
					else if(angleToB>=(Math.PI/2))
					{ // evitar wrapping
						t = 0.0;
					}
				}
				else if(angleToB>=(Math.PI/2))
				{ // evitar wrapping
					t = 0.0;
				}
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

				if(cameraPositionLineIndex < Math.max(cameraBoundsGroupSection.get(currentLayerGroupName).to-1,0))
				{ // pode estar tendendo ao posterior
					let cBounds = cameraBounds[cameraPositionLineIndex+2];
					let cCenter = new Phaser.Math.Vector2(cBounds.center.x, cBounds.center.y);

					let bToC = cCenter.subtract(bCenter);
					let bToCDistance = bToC.length();
					bToC.normalize();
					let angleToC = Math.acos(bToPlayer.dot(bToC));

					if(angleToC < angleToA)
					{// transicao pro posterior
						++cameraPositionLineIndex;

						cameraLineTransition.active = true;

						cameraLineTransition.positionA = nearestPoint;
						// cameraLineTransition.positionA.x = Phaser.Math.Clamp(cameraLineTransition.positionA.x, a.x, b.x);
						// cameraLineTransition.positionA.y = Phaser.Math.Clamp(cameraLineTransition.positionA.y, a.y, b.y);
						cameraLineTransition.zoomA = zoomA + ((zoomB - zoomA) * t);
						
						let nextLine = cameraPositionLines[cameraPositionLineIndex];
						a = nextLine.getPointA();
						b = nextLine.getPointB();
						let nextPoint = Phaser.Geom.Line.GetNearestPoint(nextLine, {x:player.x, y:player.y});
						let nextT = (new Phaser.Math.Vector2(nextPoint.x,nextPoint.y).subtract(a).length()) / b.subtract(a).length();
						cameraLineTransition.positionB = nextPoint;
						// cameraLineTransition.positionB.x = Phaser.Math.Clamp(cameraLineTransition.positionB.x, a.x, b.x);
						// cameraLineTransition.positionB.y = Phaser.Math.Clamp(cameraLineTransition.positionB.y, a.y, b.y);

						let nextZoomA = cameraZoomValues[cameraPositionLineIndex];
						let nextZoomB = cameraZoomValues[cameraPositionLineIndex+1];
						cameraLineTransition.zoomB = nextZoomA + ((nextZoomB - nextZoomA) * nextT);
						cameraLineTransition.totalTime = Phaser.Math.Distance.BetweenPoints(cameraLineTransition.positionA, cameraLineTransition.positionB)/speed;
						cameraLineTransition.deltaTime = 0;

						this.cameras.main.pan(cameraLineTransition.positionB.x, cameraLineTransition.positionB.y, cameraLineTransition.totalTime, 'Linear');
						this.cameras.main.zoomTo(cameraLineTransition.zoomB, cameraLineTransition.totalTime);

						line = nextLine;
						t = nextT;
						zoomA = nextZoomA;
						zoomB = nextZoomB;
					}
					else if(angleToA>=(Math.PI/2))
					{ // evitar wrapping ?
						t = 1.0;
					}
				}
				else if(angleToA>=(Math.PI/2))
				{ // evitar wrapping ?
					t = 1.0;
				}
			}

			nearestPoint = Phaser.Geom.Line.GetPoint(line, t);
			cameraPosition.set(nearestPoint.x,nearestPoint.y);
			cameraZoom = zoomA + ((zoomB - zoomA) * t);
		}
		else
		{
			cameraLineTransition.deltaTime += delta;
			if(cameraLineTransition.deltaTime >= cameraLineTransition.totalTime)
			{
				cameraLineTransition.active = false;
			}			
		}
		
		// let depth = graphics.depth;
		graphics.setDepth(debugDepth);
		graphics.lineStyle(2, 0x5555FF, 1.0);
	    graphics.strokeLineShape(line);
		graphics.fillStyle(0xFF5555, 1.0);
		graphics.fillPointShape({x:cameraPosition.x,y:cameraPosition.y}, 2);
		// graphics.setDepth(depth);
	}

	if(!cameraLineTransition.active)
	{
		this.cameras.main.centerOn(cameraPosition.x, cameraPosition.y);
		this.cameras.main.setZoom(cameraZoom);
	}
	else
	{
		graphics.setDepth(debugDepth);
		graphics.lineStyle(2, 0xFF5555, 1.0);
	    graphics.lineBetween(cameraLineTransition.positionA.x, cameraLineTransition.positionA.y,
	    					 cameraLineTransition.positionB.x, cameraLineTransition.positionB.y);
		// graphics.fillPointShape({x:cameraPosition.x,y:cameraPosition.y}, 2);
	}
	
	fpsText.setText('FPS: ' + (1000/delta).toFixed(3));
	// fpsText.setPosition(cameraPosition.x - 26, cameraPosition.y - 19);
	// 
	scene.children.depthSort();
}