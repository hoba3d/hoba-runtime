// HOBA
// jari kleimola 2015-16
//
// Extended Web Audio API SpatialPanner node
// - supports custom HRTF loading
// - supports spherical coordinates
// - thanks to https://github.com/tmwoz/hrtf-panner-js
// - thanks to https://github.com/ironwallaby/delaunay

HOBA = window.HOBA || {};
HOBA.SpatialPanner = function (actx)
{
	var convolverA,convolverB;
	var gainA,gainB;
	var self = this;
	this._spos = { a:0, e:0, r:0 };
	this._srcgain = 1;			// SpatialSource API soundpool gain scaler
	this._index = 0;				// last interpolation index
	this._crossfaded = true;
	this._pending = null;
	this.xfadeduration = 0.05;	// interpolation crossfade time (in secs)
	
	HOBA.PannerBase.call(this);
	function init()
	{
		if (!actx) actx = HOBA.audioContext;
		self.actx = actx;
		self.input = actx.createGain();
		self.output = actx.createGain();
		
		// -- two convolver+gain pairs for coordinate interpolation
		convolverA = actx.createConvolver();
		convolverB = actx.createConvolver();
		convolverA.normalize = false;
		convolverB.normalize = false;
		gainA = actx.createGain();
		gainB = actx.createGain();

		// -- input -> convolverAB -> gainAB -> output
		self.input.connect(convolverA);
		self.input.connect(convolverB);
		convolverA.connect(gainA);
		convolverB.connect(gainB);
		gainA.connect(self.output);
		gainB.connect(self.output);
		
		self._convolver1 = convolverA;
		self._convolver2 = convolverB;
		self._gain1 = gainA;
		self._gain2 = gainB;
		self._gain2.gain.value = 0;
	}
	init();
	
	// -- invoked when new HRTF has been loaded
	this.updateHRTF = function ()
	{
		if (!this._wavh) return;
		this._hrirL = new Float32Array(this._wavh.hrirLength);
		this._hrirR = new Float32Array(this._wavh.hrirLength);
		this._update("hrtf");
	}
}
HOBA.SpatialPanner.prototype = Object.create(HOBA.PannerBase.prototype);

// -- spherical coordinate support
// -- cartesian coordinate support is in HOBA.PannerBase
Object.defineProperties( HOBA.SpatialPanner.prototype, {
	positionA: {
		get: function()	{ return this._spos.a; },
		set: function (v) { this._setPosS("a", v); }},
	positionE: {
		get: function()	{ return this._spos.e; },
		set: function (v) { this._setPosS("e", v); }},
	positionR: {
		get: function()	{ return this._spos.r; },
		set: function (v) { this._setPosS("r", v); }},
	elevationRange: {
		get: function()	{ return { min:this._wavh.minElevation, max:this._wavh.maxElevation }; }}
});
HOBA.SpatialPanner.prototype._setPosS = function (key, value)
{
	this._spos[key] = parseFloat(value);
	this.setSPosition(this._spos.a, this._spos.e, this._spos.r, true);
}

HOBA.SpatialPanner.prototype._wavh = null;
HOBA.SpatialPanner.prototype._geo = null;

HOBA.SpatialPanner.prototype.loadHRTF = function (url)
{
	var self = this;
	var proto = HOBA.SpatialPanner.prototype;
	return new Promise( function (resolve,reject)
	{
		proto._wavh = new HOBA.WAVH();
		proto._wavh.load(url).then(
			function ()
			{
				proto._geo = {};
				proto._geo.points2D  = proto._wavh.getMeasurementGrid2D();			 // [elev,azim]
				proto._geo.points3D  = proto._wavh.getMeasurementGrid3D();			 // [x,y,z]
				proto._geo.triangles = Delaunay.triangulate(proto._geo.points2D); // [indices]
				self.updateHRTF();
				resolve(proto._geo);
			},
			function () { reject(); });
	});
}

// -- set position in spherical coordinates
HOBA.SpatialPanner.prototype.setSPosition = function (azim,elev,r, updateC)
{
	r = r || 1;
	this._spos = { a:azim, e:elev, r:r };
	if (updateC)
		this.posc = HOBA.listener.spherical2cartesian(azim, elev, r);
	
	if (azim < 0) azim += 360;
	// azim = (360 - azim) % 360;		// cipic sofa is counter-clockwise ?

	var index = this._interpolate(azim,elev);
	if (index >= 0) this._index = index;
	else index = this._index;
	if (index >= 0 && this._crossfaded)
	{
		this._crossfaded = false;
		var actx = this.actx;
		var audiobuf = actx.createBuffer(2, this._wavh.hrirLength, actx.sampleRate);
		if (audiobuf.copyToChannel)
		{
			audiobuf.copyToChannel(this._hrirL, 0);
			audiobuf.copyToChannel(this._hrirR, 1);
		}
		else for (var ch=0; ch<=1; ch++)
		{
			var src = (ch == 0) ? this._hrirL : this._hrirR;
			var dst = audiobuf.getChannelData(ch);
			for (var n=0; n<src.length; n++)
				dst[n] = src[n];
		}
		this._convolver2.buffer = audiobuf;

		// -- crossfade
		var gdist = this._distance.gain(r);
		var gcone = this._cone.gain(this.posc, this.orientc);
		var g = gdist * gcone * this._srcgain;
		this._gain2.gain.setValueAtTime(0, actx.currentTime);
		this._gain2.gain.linearRampToValueAtTime(g, actx.currentTime + this.xfadeduration);
		this._gain1.gain.setValueAtTime(g, actx.currentTime);
		this._gain1.gain.linearRampToValueAtTime(0, actx.currentTime + this.xfadeduration);

		// -- avoid crackles
		var self = this;
		setTimeout( function ()
		{
			self._crossfaded = true;
			if (self._pending)
			{
				var a = self._pending.a, e = self._pending.e, r = self._pending.r;
				self._pending = null;
				self.setSPosition(a,e,r);
			}
		}, this.xfadeduration*1000 );

		// -- swap
		var c = this._convolver1;
		this._convolver1 = this._convolver2;
		this._convolver2 = c;
		var g = this._gain1;
		this._gain1 = this._gain2;
		this._gain2 = g;
	}
	else if (!this._crossfaded)
		this._pending = { a:this._spos.a, e:elev, r:r };

	return index;
}

HOBA.SpatialPanner.prototype._update = function (type)
{
	if (type == "position")
	{
		var x = this.posc.x, y = this.posc.y, z = this.posc.z;
		var s = HOBA.listener.cartesian2spherical(x,y,z);
		return this.setSPosition(s.a, s.e, s.r);
	}
	else // re-render for hrtf, orientation, distance, cone, listener
	{
		this.setSPosition(this._spos.a, this._spos.e, this._spos.r);
	}
}

//
// three-point interpolation based on triangulated measurement mesh
// see e.g. Gamper's thesis for more info
// this is slightly modified version of https://github.com/tmwoz/hrtf-panner-js
//
HOBA.SpatialPanner.prototype._interpolate = function (azim,elev)
{
	var triangles = this._geo.triangles;
	var points = this._geo.points2D;
	var i = 0;
	var A, B, C, X, T, invT, det, j, g1, g2, g3;

	while (true)
	{
		A = points[triangles[i]]; i++;
		B = points[triangles[i]]; i++;
		C = points[triangles[i]]; i++;

		T = [A[0] - C[0], A[1] - C[1],
			  B[0] - C[0], B[1] - C[1]];
		invT = [T[3], -T[1], -T[2], T[0]];
		det  = 1 / (T[0] * T[3] - T[1] * T[2]);
		for (j = 0; j < invT.length; ++j)
			invT[j] *= det;
		X = [elev - C[0], azim - C[1]];
		g1 = invT[0] * X[0] + invT[2] * X[1];
		g2 = invT[1] * X[0] + invT[3] * X[1];
		g3 = 1 - g1 - g2;
		if (g1 >= 0 && g2 >= 0 && g3 >= 0)
		{
			var index = i-3;
			var hrir1 = this._wavh.hrirs[triangles[index]];
			var hrir2 = this._wavh.hrirs[triangles[index+1]];
			var hrir3 = this._wavh.hrirs[triangles[index+2]];
			var hrirL = new Float32Array(this._wavh.hrirLength);
			var hrirR = new Float32Array(this._wavh.hrirLength);
			for (var n=0; n<hrirL.length; n++)
			{
				hrirL[n] =
					g1 * hrir1.left.ir[n] +
					g2 * hrir2.left.ir[n] +
					g3 * hrir3.left.ir[n];
				hrirR[n] =
					g1 * hrir1.right.ir[n] +
					g2 * hrir2.right.ir[n] +
					g3 * hrir3.right.ir[n];
			}
			this._hrirL = hrirL;
			this._hrirR = hrirR;
			return index;
		}
		else if (i >= triangles.length) break;
	}
	// console.log("not found", azim,elev);
	return -1;
}
