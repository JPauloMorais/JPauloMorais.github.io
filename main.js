var config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    physics: {
        default: 'matter'
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var anim;
var sprite;
var progress;
var frameView;

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
	var sprite = spriteFromAsepriteAtlas(this.textures.get('male'), this.add, this.anims);
	sprite.setPosition(400,300);
	// sprite.anims.play('walk_u');
	this.input.keyboard.on('keydown_RIGHT', function (event) 
	{
        sprite.anims.play('walk_s', true);
        sprite.setFlipX(true);
    });
    this.input.keyboard.on('keydown_LEFT', function (event) 
	{
        sprite.anims.play('walk_s', true);
        sprite.setFlipX(false);
    });   
    this.input.keyboard.on('keydown_UP', function (event) 
	{
        sprite.anims.play('walk_u', true);
        sprite.setFlipX(false);
    });
    this.input.keyboard.on('keydown_DOWN', function (event) 
	{
        sprite.anims.play('walk_d', true);
        sprite.setFlipX(false);
    });
}

function update ()
{
}