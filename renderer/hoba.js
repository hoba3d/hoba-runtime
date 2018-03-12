// HOBA
// jari kleimola 2015-16

HOBA = windows.HOBA || {};
HOBA.init = function (hrtfurl, actx)
{
	AudioContext = window.AudioContext || window.webkitAudioContext;
	HOBA.audioContext = actx || new AudioContext();
	HOBA._panner = HOBA.createSpatialPanner(); // dummy node for HRTF sharing between panners
	return HOBA.loadHRTF(hrtfurl);
}

HOBA.createSpatialPanner = function ()
{
	var panner = new HOBA.SpatialPanner();
	if (HOBA._hrtfURL) panner.setSPosition(0,0,1);
	return panner;
}

HOBA.loadHRTF = function (url)
{
	return new Promise( function (resolve,reject)
	{
		HOBA._panner.loadHRTF(url).then(
			function (geo)
			{
				HOBA._hrtfURL = url;
				// HOBA.listener = new HOBA.AudioListener();
				var keys = Object.keys(HOBA.sources);
				keys.forEach( function (key) { HOBA.sources[key].updateHRTF(); } );
				resolve(geo);
			},
			function () { reject(); });
	});
}
HOBA.getElevationRange = function () { return HOBA._panner.elevationRange; }	


// ------------------------------------------------------------------
// OSC
//
HOBA.startOSC = function (url, callback)
{
	HOBA._oscClient = new HOBA.OSCClient(url, callback);
	HOBA._oscClient.start();
}
HOBA.stopOSC = function () { HOBA._oscClient.stop(); }

// ------------------------------------------------------------------
// audio sources
//
HOBA.sources = {};
HOBA.addSource = function (src)
{
	HOBA.sources[src.id] = src;
	src.updateHRTF();
	src.connect(HOBA.audioContext.destination);
}
HOBA.removeSource = function (id)
{
	if (id in HOBA.sources)
	{
		var src = HOBA.sources[id];
		src.stop();
		delete HOBA.sources[id];
	}
}
HOBA.getSource = function (uri_or_id)
{
	var src = undefined;
	if (isNaN(uri_or_id))
	{
		var tokens = uri_or_id.split('/');
		if (tokens[1] == "source") src = HOBA.sources[tokens[2]];
	}
	else return HOBA.sources[uri_or_id];
	return src;
}
HOBA._updateSources = function ()
{
	var keys = Object.keys(HOBA.sources);
	keys.forEach( function (key) { HOBA.sources[key].panner._update("position"); } );
}

// ------------------------------------------------------------------
// soundpool
//
HOBA.soundpool = {};
HOBA.addSound = function (id, url, gain)
{
	return new Promise( function (resolve,reject)
	{
		var xhr = new XMLHttpRequest();
		xhr.responseType = "arraybuffer";
		xhr.onload = function (e)
		{
			if (xhr.status == 200)
			{
				HOBA.audioContext.decodeAudioData(xhr.response).then(
					function (abuf)
					{
						gain = gain || 1;
						var sound = { id:id, url:url, gain:gain };
						sound.buffer = abuf;
						HOBA.soundpool[id] = sound;
						resolve();
					},
					function () { reject(); });
			}
			else reject();
		}
		xhr.open("get", url, true);
		xhr.send(null);		
	});
}
HOBA.removeSound = function (id) { delete HOBA.soundpool[id]; }
HOBA.getSoundpoolID = function (soundname)
{
	var foundID = undefined;
	Object.keys(HOBA.soundpool).some( function (id)
	{
		var sound = HOBA.soundpool[id];
		if (sound.url.indexOf(soundname) >= 0) { foundID = id; return true; }
	});
	return foundID;
}
