// HOBA
// jari kleimola 2015-16

HOBA = window.HOBA || {};
HOBA.WAVH = function ()
{
	var bytelength;
	var self = this;
	this.format = {};
	this.hrirs = [];
	var dv = null;
	this.hrirLength = 0;		// in samples (per channel, max)
	
	this.load = function (url)
	{
		return new Promise(function (resolve,reject)
		{
			var xhr = new XMLHttpRequest();
			xhr.responseType = "arraybuffer";
			xhr.onload = function (e)
			{
				self.hrirLength = 0;
				var dv = new DataView(xhr.response);
				if (parse(dv)) resolve(self);
				else reject();
			}
			xhr.open("get", url, true);
			xhr.send(null);
		});
	}
	
	var parse = function (dataview)
	{
		dv = dataview;
		if (!parseHeader()) return false;
		var isWAVH = false;
		var hasFMT = false;
		var n = 12;
		while (n < bytelength)
		{
			var chunk = parseChunk(n);
			n += 8;
			if (chunk.id == "fmt ")			hasFMT = parseFormat(n);
			else if (chunk.id == "LIST")	isWAVH = parseLIST(n, chunk.length);
			n += chunk.length;
		}
		return (hasFMT && isWAVH);
	}

	var parseHeader = function ()
	{
		if (readString(0,4) != "RIFF") return false;
		if (readString(8,4) != "WAVE") return false;
		bytelength = dv.getUint32(4, true) + 8;
		return true;
	}
	
	var parseChunk = function (n)
	{
		var id = readString(n,4);
		var length = dv.getUint32(n+4, true);
		return { id:id, length:length };
	}
	
	var parseFormat = function (n)
	{
		var format = {};
		format.sampleFormat = dv.getUint16(n, true);
		format.numChannels = dv.getUint16(n+2, true);
		format.sampleRate = dv.getUint32(n+4, true);
		format.byteRate = dv.getUint32(n+8, true);
		format.blockAlign = dv.getUint16(n+12, true);
		format.bitsPerSample = dv.getUint16(n+14, true);
		self.format = format;
		return true;
	}
	
	// todo: possible to get sample-rate conversion ?
	var parseLIST = function (n, length)
	{
		var chunk = parseChunk(n);
		if (chunk.id == "HRIR")
		{
			n += 4;
			self.minElevation = 1000;
			self.maxElevation = -1000;
			while (n < length)
			{
				chunk = parseChunk(n);
				if (chunk.id == "info")
				{
					n += 8;
					var L = {};
					var R = {};
					var azim	= dv.getFloat32(n, true);
					var elev	= dv.getFloat32(n+4, true);
					var dist	= dv.getFloat32(n+8, true);
					L.delay	= dv.getFloat32(n+12, true);
					R.delay	= dv.getFloat32(n+16, true);
					if (elev > self.maxElevation) self.maxElevation = elev;
					if (elev < self.minElevation) self.minElevation = elev;
					
					n += 20;
					chunk = parseChunk(n);
					if (chunk.id == "data")
					{
						n += 8;
						if (length - (n+chunk.length) >= 0)
						{
							if (self.format.bitsPerSample == 16)	// todo: other formats
							{
								var arr = new Int16Array(dv.buffer, n, chunk.length/2);
								var hrir = HOBA.WAVH.toFloat(2, arr, 0.00003051757813);
								L.ir = hrir[0];
								R.ir = hrir[1];
								if (L.ir.length > self.hrirLength) self.hrirLength = L.ir.length;
								if (R.ir.length > self.hrirLength) self.hrirLength = R.ir.length;
							}
							else if (self.format.bitsPerSample == 32)
							{
								if (self.format.sampleFormat == 3)
								{
									var arr = new Float32Array(dv.buffer, n, chunk.length/4);
									L.ir = arr.subarray(0, arr.length/2);
									R.ir = arr.subarray(arr.length/2);
									if (L.ir.length > self.hrirLength) self.hrirLength = L.ir.length;
									if (R.ir.length > self.hrirLength) self.hrirLength = R.ir.length;
								}
							}
							self.hrirs.push({ left:L, right:R, azimuth:azim, elevation:elev, distance:dist });
						}
					}
				}
				n += chunk.length;
			}
			return true;
		}
		return false;
	}
	
	var readString = function (n, length)
	{
		var s = "";
		for (var i = 0; i < length; i++)
			s += String.fromCharCode(dv.getUint8(n + i));
		return s;
	}
	
	this.getMeasurementGrid2D = function ()
	{
		var points = [];
		var TWOPI = 2 * Math.PI;
		for (var i=0; i<this.hrirs.length; i++)
		{
			var hrir = this.hrirs[i];
			var e = hrir.elevation;
			var a = hrir.azimuth;
			if (a < 0) a += 360;
			points.push([e,a]);
		}
		return points;
	}
	
	this.getMeasurementGrid3D = function ()
	{
		var points = [];
		var TWOPI = 2 * Math.PI;
		for (var i=0; i<this.hrirs.length; i++)
		{
			var hrir = this.hrirs[i];
			var r = 1;
			var e = hrir.elevation/360 * TWOPI;
			var a = hrir.azimuth/360 * TWOPI;
			/* var x = r * Math.cos(e) * Math.cos(a);
			var y = r * Math.cos(e) * Math.sin(a);
			var z = r * Math.sin(e); */
			var z = - r * Math.cos(e) * Math.cos(a);
			var x = r * Math.cos(e) * Math.sin(a);
			var y = r * Math.sin(e);
			points.push([x,y,z]);
		}
		return points;
	}
};	

HOBA.WAVH.toFloat = function (nchannels, data, scale)
{
	console.assert(nchannels == 2);
	var L = data.length;
	if (scale == undefined) scale = 1;
	var channel1 = new Float32Array(L/2);
	var channel2 = new Float32Array(L/2);

	var j = 0;
	var N = L/2;
	for (var i=0; i<N; i++)
	{
		channel1[j] = data[i]   * scale;
		channel2[j] = data[i+N] * scale;
		j++;
	}
	
	/* deinterleave implementation
	var j=0;
	for (var i=0; i < L; i+=2)
	{
		channel1[j] = data[i] * scale;
		channel2[j++] = data[i+1] * scale;
	} */
	
	return [channel1, channel2];
}
