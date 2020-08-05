
var innerWidth = window.innerWidth * window.devicePixelRatio;
var innerHeight = window.innerHeight * window.devicePixelRatio;
// var portrait = (innerHeight > innerWidth ? true : false);

var assetWidth = 90;
var assetHeight = 160;

var windowHeight = innerHeight;
var assetRatio = innerHeight / assetHeight;
var windowWidth = windowWidth = assetWidth * assetRatio;

var config = {
    width: windowWidth,
    height: windowHeight,
    mode: Phaser.Scale.RESIZE,
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
    	init: init,
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

function init ()
{
    //  Inject our CSS
    var element = document.createElement('style');
    document.head.appendChild(element);
    var sheet = element.sheet;
    var styles = '@font-face { font-family: "Minecraftia"; src: url("assets/Minecraftia-Regular.ttf") format("truetype"); }\n';
    sheet.insertRule(styles, 0);
}

function preload ()
{
	this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');	
    this.load.atlas('foreground', './assets/foreground.png', './assets/foreground.json');
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
			foreground.anims.play('Push-Up Full', false);
			// foreground.anims.chain('Push-Up');
	 		foreground.anims.setRepeat(0);
		}
		else
		{
	 		foreground.anims.play('Push-Up', false);
	 		foreground.anims.setRepeat(0);
		}
		++state;
	}
}

function create ()
{
	scene = this;
	graphics = this.add.graphics({ lineStyle: { width: 4, color: 0x5555ff, depth:5.0} });

	foreground = spriteFromAsepriteAtlas(this.textures.get('foreground'));
	foreground.anims.play('Push-Up Start', true);
	foreground.anims.stopOnFrame(0);
	foreground.anims.setRepeat(0);
	foreground.setPosition(windowWidth/2,windowHeight/2);
	foreground.setScale(assetRatio);

	this.cameras.main.setBackgroundColor(0x5fcde4);

	// var add = this.add;
	// WebFont.load({
 //        custom: {
 //            families: ['Minecraftia']
 //        },
 //        active: function ()
 //        {
 //   //          background_text = add.text(32, 32, 'Push', { fontFamily: 'Minecraftia', fontSize: 16, color: '#ff0000' }).setShadow(2, 2, "#333333", 2, false, true);
	// 		// background_text.setFontSize(8);
 //        }
 //    });

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
	graphics.clear();
}