
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
    zoom: 4,
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
var clone;
var keys;
var last_direction;
var map;

function preload ()
{
    this.load.atlas('prepper', './assets/prepper.png', './assets/prepper.json');
    // this.load.atlas('male', './assets/male.png', './assets/male.json');
    // this.load.image('male', './assets/male.png');
    // this.load.json('male', './assets/male.json');
    this.load.image('tileset', 'assets/tileset_inside.png');
    this.load.tilemapTiledJSON('map', './assets/tilemap_inside.json');
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
	
	map = this.make.tilemap({ key: 'map' });
    var tileset = map.addTilesetImage('tileset_inside', 'tileset');
    let mapX = 0;//(windowWidth/2) - (map.widthInPixels/2);
    let mapY = 0;//(windowHeight/2) - (map.heightInPixels/2);
    map.createDynamicLayer('ground', tileset, mapX, mapY).setVisible(true);
    map.createDynamicLayer('walls', tileset, mapX, mapY).setVisible(true);
    
	player = spriteFromAsepriteAtlas(this.textures.get('prepper'));
	player.anims.play('idle', true);
	player.setPosition(400,300);
	for(objectLayerIndex in map.objects)
	{
		for(objectIndex in map.objects[objectLayerIndex].objects)
		{
			object = map.objects[objectLayerIndex].objects[objectIndex];
			if(object.name == 'player_spawn')
			{
				player.setPosition(mapX+object.x, mapY+object.y);
			}
		}	
	}
	// player.setScale(4);
	player.setOrigin(0.5,0.9);
	player.setFixedRotation();
    player.setAngle(0);
    player.setFrictionAir(0.05);
    player.setMass(10);
    player.setActive(true);
    last_direction = new Phaser.Math.Vector2(0,0); 
	// player.setCollideWorldBounds(true);
	// sprite.anims.play('walk_u');

	// clone = spriteFromAsepriteAtlas(this.textures.get('prepper'));
	// // clone.anims.play('idle', true);
	// clone.setPosition(400,400);
	// clone.setActive(true);

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
}

function update ()
{
	let speed = 0;
	if(keys.run.isDown)
	{
		speed = 7;
	}
	else if(keys.crouch.isDown)
	{
		speed = 2;
	}
	else
	{
		speed = 4;
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

	player.setVelocity(direction.x * speed, direction.y * speed);

	let player_z = player.y + (player.height * player.originY);
	// let clone_z = clone.y + (clone.height * clone.originY);
	player.setZ(player_z);
	player.setDepth(player_z);
	// clone.setZ(player_z);
	// clone.setDepth(player_z);

	this.cameras.main.centerOn(player.x, player.y);

	last_direction = direction;
}