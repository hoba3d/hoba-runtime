// HOBA
// jari kleimola 2015-16

HOBA = window.HOBA || {};
HOBA.SpatialSource = function (id, options)
{
	this.id = id;
	var src,panner,gain;
	var self = this;
	
	function init()
	{
		var actx = HOBA.audioContext;
		gain = actx.createGain();
		panner = self.panner = HOBA.createSpatialPanner();
		panner.connect(gain);

		if (options.element)
		{
			var elem = document.getElementById(options.element);
			src = actx.createMediaElementSource(elem);
		}
		else
		{
			src = actx.createBufferSource();
			if (options.sound && options.sound in HOBA.soundpool)
				self.sound = options.sound;
		}

		var a = options.pos ? options.pos.a : 0;
		var e = options.pos ? options.pos.e : 0;
		var r = options.pos ? options.pos.r : 1;
		self.setSPosition(a,e,r);
		src.connect(panner.input);
	}
	
	this.connect = function (dst) { gain.connect(dst); }
	this.disconnect = function () { gain.disconnect(); }
	this.start = function () { src.start(); }
	this.stop = function ()  { src.stop(); }
	
	this.setSPosition = function (azim,elev,r)
	{
		return panner.setSPosition(azim,elev,r, true);
	}
	this.setCPosition = function (x,y,z)
	{
		panner.setCPosition(x,y,z);
		var s = HOBA.listener.cartesian2spherical(x,y,z);
		s.index = panner.setSPosition(s.a, s.e, s.r);
		return s;
	}
	
	this.updateHRTF = function () { panner.updateHRTF(); }

	Object.defineProperty(this, "gain", {
		get: function() { return gain.gain.value; },
		set: function (g) { gain.gain.value = g; }
	});
	Object.defineProperty(this, "sound", {
		get: function() { return src; },
		set: function (id)
		{
			if (src.buffer)
			{
				src.stop();
				src.disconnect();
				src = HOBA.audioContext.createBufferSource();
				src.connect(panner.input);
			}
			panner._srcgain = HOBA.soundpool[id].gain;
			src.buffer = HOBA.soundpool[id].buffer;
			src.loop = true;
			src.start();
		}
	});
	
	options = options || {};
	init();
}
