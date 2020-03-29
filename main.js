
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

var config = {
    type: Phaser.WEBGL,
    width: 1155,
    height: 650,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    physics: {
        default: 'matter',
        matter: {
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

var player;
var keys;
var last_direction;

function preload ()
{
    this.load.atlas('male', './assets/male.png', './assets/male.json');
    // this.load.image('male', './assets/male.png');
    // this.load.json('male', './assets/male.json');
}

function spriteFromAsepriteAtlas(atlasTexture, objectFactory, animationManager)
{
	var sprite = objectFactory.sprite(0,0,atlasTexture.key);

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
		animationManager.create(config);

		sprite.anims.load(tag.name);
	}

	return sprite;
}

function create ()
{
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
	player = spriteFromAsepriteAtlas(this.textures.get('male'), this.matter.add, this.anims);
	player.anims.play('idle_d', true);
	player.setPosition(400,300);
	player.setFixedRotation();
    player.setAngle(0);
    player.setFrictionAir(0.05);
    player.setMass(10);
    last_direction = new Phaser.Math.Vector2(0,0); 
	// player.setCollideWorldBounds(true);
	// sprite.anims.play('walk_u');

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
	   direction.equals(new Phaser.Math.Vector2(-1,-1).normalize()) ||
	   direction.equals(new Phaser.Math.Vector2(+1,-1).normalize()))
	{
		if(keys.run.isDown)
			player.anims.play('run_u', true);
		else if(keys.crouch.isDown)
			player.anims.play('crawl_u', true);
		else
			player.anims.play('walk_u', true);
		player.setFlipX(false);
	}
	else if(direction.equals(new Phaser.Math.Vector2( 0,+1)) ||
			direction.equals(new Phaser.Math.Vector2(-1,+1).normalize()) ||
	   		direction.equals(new Phaser.Math.Vector2(+1,+1).normalize()))
	{
		if(keys.run.isDown)
			player.anims.play('run_d', true);
		else if(keys.crouch.isDown)
			player.anims.play('crawl_d', true);
		else
			player.anims.play('walk_d', true);
		player.setFlipX(false);
	}
	else if(direction.equals(new Phaser.Math.Vector2(-1,0)))
	{
		if(keys.run.isDown)
			player.anims.play('run_s', true);
		else if(keys.crouch.isDown)
			player.anims.play('crawl_s', true);
		else
			player.anims.play('walk_s', true);
		player.setFlipX(false);
	}
	else if(direction.equals(new Phaser.Math.Vector2(+1,0)))
	{
		if(keys.run.isDown)
			player.anims.play('run_s', true);
		else if(keys.crouch.isDown)
			player.anims.play('crawl_s', true);
		else
			player.anims.play('walk_s', true);
		player.setFlipX(true);
	}
	else
	{
		if(last_direction.equals(new Phaser.Math.Vector2( 0,-1)) ||
		   last_direction.equals(new Phaser.Math.Vector2(-1,-1).normalize()) ||
		   last_direction.equals(new Phaser.Math.Vector2(+1,-1).normalize()))
		{
			player.anims.play('idle_u', true);
			player.setFlipX(false);
		}
		else if(last_direction.equals(new Phaser.Math.Vector2( 0,+1)) ||
				last_direction.equals(new Phaser.Math.Vector2(-1,+1).normalize()) ||
		   		last_direction.equals(new Phaser.Math.Vector2(+1,+1).normalize()))
		{
			player.anims.play('idle_d', true);
			player.setFlipX(false);
		}
		else if(last_direction.equals(new Phaser.Math.Vector2(-1,0)))
		{
			player.anims.play('idle_s', true);
			player.setFlipX(false);
		}
		else if(last_direction.equals(new Phaser.Math.Vector2(+1,0)))
		{
			player.anims.play('idle_s', true);
			player.setFlipX(true);
		}
	}

	player.setVelocityX(direction.x * speed);
	player.setVelocityY(direction.y * speed);

	last_direction = direction;
}