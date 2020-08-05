
var innerWidth = window.innerWidth * window.devicePixelRatio;
var innerHeight = window.innerHeight * window.devicePixelRatio;
// var portrait = (innerHeight > innerWidth ? true : false);

var assetWidth = 90 * 2;
var assetHeight = 160 * 2;

// var windowHeight = innerHeight;
var assetRatio = 2.0;
// var windowWidth = windowWidth = assetWidth * assetRatio;
var windowWidth = assetWidth;
var windowHeight = assetHeight;

var config = {
    width: windowWidth,
    height: windowHeight,
    mode: Phaser.Scale.FIT,
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
var graphics;
var animation;
var background_text;
var state = 0;
var song;

var currentStatement;
var statements = ['aperta?\ntoca?\nidk...', 'mais\num\nano', 'nao\ndos\nmelhores', 'mas\nainda\ncontinua',
				  'empurrando,\npuxando,\ntentando...', 'orgulhoso\ndo\nprogresso', 'parabens\npelos seus\n23'];

function preload ()
{
    this.load.atlas('foreground', './assets/foreground.png', './assets/foreground.json');
    this.load.audio('happybday', ['./assets/Chiptune Happy Birthday.mp3']);
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

function advance()
{
// scene.add.text(n++, 32, 'Push', { fontFamily: 'Comic Sans MS', fontSize: 16, color: '#ff0000' });
	if(foreground.anims.isPlaying == false)
	{
		if(state == 0)
		{
			song.play();	
		}

		++state;
 		foreground.anims.play('Push-Up', false);
 		foreground.anims.setRepeat(0);
		
		if(state < statements.length)
		{
			currentStatement.setText(statements[state]);
		}
		else
		{
			currentStatement.setText('que\nvenha\n' + (23+(state - statements.length + 1)));
		}

	}
}

function create ()
{
	scene = this;
	graphics = this.add.graphics({ lineStyle: { width: 4, color: 0x5555ff, depth:5.0} });

	foreground = spriteFromAsepriteAtlas(this.textures.get('foreground'));
	foreground.anims.play('Push-Up', true);
	foreground.anims.stopOnFrame(0);
	foreground.anims.setRepeat(0);
	foreground.setPosition(windowWidth/2,windowHeight/2);
	foreground.setScale(assetRatio);

	currentStatement = scene.add.text(16, 16, statements[0], { font: 16*assetRatio +'px Comic Sans MS', fill: '#ffffff' }).setScrollFactor(0);

	this.cameras.main.setBackgroundColor(0x5fcde4);

	song = this.sound.add('happybday');

 	scene.input.keyboard.on('keyup', function(event) 
 	{
 		advance();
 	});
 	scene.input.on('pointerup', function(pointer)
 	{
 		advance();
	});
}

function update (time, delta)
{
	// graphics.clear();
	currentStatement.setAlpha(foreground.anims.getProgress());
	if(state >= statements.length)
	{
		advance();
	}
}