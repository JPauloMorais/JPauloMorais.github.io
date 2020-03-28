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

function getAnimationsFromAtlas(atlas_key)
{
	
}

function create ()
{
	var atlasTexture = this.textures.get('male');
	var frames = atlasTexture.getFrameNames();
	this.anims.create({ key: 'walk_d', frames: [0,1,2], frameRate: 6, yoyo: true, repeat: -1});
	var sprite = this.add.sprite(400, 300, 'male');
	sprite.anims.load('walk_d');
	sprite.anims.play('walk_d');

	// var config = {
 //        key: 'walk_d',
 //        frames: this.anims.generateFrameNumbers('male'),
 //        frameRate: 6,
 //        yoyo: true,
 //        repeat: -1
 //    };
 //    anim = this.anims.create(config);
 //    console.log(anim);
 //    sprite = this.add.sprite(400, 300, 'male').setScale(4);
 //    sprite.anims.play('walk_d');


	// var img = this.add.image(48,48, 'male', frames[1]);
}

function update ()
{
	// frameView.clear();
    // frameView.fillRect(sprite.frame.cutX, 0, 37, 45);
}